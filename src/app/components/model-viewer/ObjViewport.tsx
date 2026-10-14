"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { ObjGeometry } from "../../../lib/model-viewer/geometry";
import { useI18n } from "../LanguageProvider";

const EMPTY_CLIPS: THREE.AnimationClip[] = [];

export default function ObjViewport({ geometry, root, clips = EMPTY_CLIPS }: { geometry?: ObjGeometry; root?: THREE.Object3D; clips?: THREE.AnimationClip[] }) {
    const host = useRef<HTMLDivElement>(null);
    const reset = useRef<() => void>(() => {});
    const playback = useRef<(command: "play" | "pause" | "stop", index: number) => void>(() => {});
    const [selected, setSelected] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [failed, setFailed] = useState(false);
    const { messages } = useI18n();
    const t = messages.modelViewer.inspector;
    useEffect(() => {
        const container = host.current;
        if (!container) return;
        let renderer: THREE.WebGLRenderer | undefined;
        let controls: OrbitControls | undefined;
        let observer: ResizeObserver | undefined;
        let active = true;
        let frame = 0;
        let mixer: THREE.AnimationMixer | undefined;
        let action: THREE.AnimationAction | undefined;
        let actionIndex = -1;
        const meshes: THREE.BufferGeometry[] = [];
        const material = new THREE.MeshStandardMaterial({ color: 0xb5c1cb, roughness: 0.85, side: THREE.DoubleSide });
        const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); setPlaying(false); setFailed(true); };
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.domElement.style.display = "block";
            renderer.domElement.style.touchAction = "none";
            renderer.domElement.addEventListener("webglcontextlost", lost);
            container.appendChild(renderer.domElement);
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xfafbfc);
            const group = new THREE.Group();
            geometry?.forEach(data => {
                const buffer = new THREE.BufferGeometry();
                meshes.push(buffer);
                buffer.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
                if (data.normals) buffer.setAttribute("normal", new THREE.BufferAttribute(data.normals, 3));
                else buffer.computeVertexNormals();
                group.add(new THREE.Mesh(buffer, material));
            });
            if (root) group.add(root);
            const box = new THREE.Box3().setFromObject(group, true);
            const center = box.getCenter(new THREE.Vector3());
            const span = box.getSize(new THREE.Vector3());
            const extent = Math.max(span.x, span.y, span.z);
            const scale = extent > 0 ? 2 / extent : 1;
            group.scale.setScalar(scale);
            group.position.copy(center).multiplyScalar(-scale);
            scene.add(group, new THREE.HemisphereLight(0xffffff, 0x687582, 2));
            const light = new THREE.DirectionalLight(0xffffff, 3);
            light.position.set(3, 5, 4); scene.add(light);
            const camera = new THREE.PerspectiveCamera(45, 1, 0.001, 1000);
            controls = new OrbitControls(camera, renderer.domElement);
            controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
            controls.screenSpacePanning = true;
            controls.minDistance = 0.01; controls.maxDistance = 100;
            const draw = () => renderer?.render(scene, camera);
            if (root && clips.length) {
                mixer = new THREE.AnimationMixer(root);
                let previous = 0;
                const tick = (now: number) => {
                    if (!active) return;
                    // Avoid jumping ahead after the tab was hidden.
                    mixer?.update(Math.min((now - previous) / 1000, 0.1));
                    previous = now; draw();
                    frame = requestAnimationFrame(tick);
                };
                playback.current = (command, index) => {
                    cancelAnimationFrame(frame);
                    if (command === "stop") {
                        mixer?.stopAllAction(); action = undefined; actionIndex = -1; draw();
                    } else if (command === "pause") {
                        if (action) action.paused = true;
                    } else {
                        if (!clips[index]) return;
                        if (!action || actionIndex !== index) {
                            mixer?.stopAllAction();
                            action = mixer!.clipAction(clips[index]);
                            action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
                            actionIndex = index;
                        }
                        action.paused = false;
                        previous = performance.now();
                        frame = requestAnimationFrame(tick);
                    }
                };
            }
            const fit = () => {
                const angle = Math.min(THREE.MathUtils.degToRad(45), 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(22.5)) * camera.aspect));
                const distance = Math.sqrt(3) / Math.sin(angle / 2) * 1.15;
                camera.position.set(1, 0.7, 1).normalize().multiplyScalar(distance);
                controls?.target.set(0, 0, 0); controls?.update(); draw();
            };
            reset.current = fit;
            controls.addEventListener("change", draw);
            let first = true;
            observer = new ResizeObserver(() => {
                const width = container.clientWidth, height = container.clientHeight;
                if (!width || !height) return;
                renderer?.setSize(width, height);
                camera.aspect = width / height; camera.updateProjectionMatrix();
                if (first) { fit(); first = false; } else draw();
            });
            observer.observe(container);
        } catch { queueMicrotask(() => { if (active) setFailed(true); }); }
        return () => {
            active = false;
            cancelAnimationFrame(frame);
            playback.current = () => {};
            mixer?.stopAllAction();
            if (root) mixer?.uncacheRoot(root);
            reset.current = () => {};
            observer?.disconnect(); controls?.dispose();
            root?.removeFromParent();
            meshes.forEach(mesh => mesh.dispose()); material.dispose();
            if (renderer) {
                renderer.domElement.removeEventListener("webglcontextlost", lost);
                renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
            }
        };
    }, [geometry, root, clips]);
    return <div className="w-full">
        <div className="relative">
            <div ref={host} aria-label={t.viewLabel} className="h-[420px] w-full overflow-hidden rounded-lg" />
            {failed && <p role="alert" className="absolute inset-0 flex items-center justify-center bg-[#FAFBFC] p-6 text-red-700">{t.renderError}</p>}
        </div>
        <button type="button" onClick={() => reset.current()} className="mt-3 rounded-lg border px-3 py-2 text-sm">{t.resetView}</button>
        {root && (clips.length ? <fieldset disabled={failed} className="mt-4 space-y-3 rounded-lg border p-3 text-sm">
            <legend className="px-2">{t.animationCategory}</legend>
            <select aria-label={t.animationCategory} value={selected} className="w-full rounded border bg-white p-2" onChange={event => {
                const index = Number(event.target.value); setSelected(index);
                playback.current("play", index); setPlaying(true);
            }}>
                {clips.map((clip, index) => <option key={index} value={index}>{index + 1}. {clip.name.trim() || t.unnamedAnimation} ({clip.duration.toFixed(2)} s)</option>)}
            </select>
            <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className="rounded border px-3 py-2" onClick={() => { playback.current(playing ? "pause" : "play", selected); setPlaying(!playing); }}>{playing ? t.pauseAnimation : t.playAnimation}</button>
                <button type="button" className="rounded border px-3 py-2" onClick={() => { playback.current("stop", selected); setPlaying(false); }}>{t.stopAnimation}</button>
            </div>
            <p>{t.animationHint}</p>
        </fieldset> : <p className="mt-3 text-sm">{t.noAnimations}</p>)}
        <p className="mt-3 text-sm leading-6">{t.controls}</p>
    </div>;
}
