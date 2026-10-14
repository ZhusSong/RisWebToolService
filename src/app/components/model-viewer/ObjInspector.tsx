"use client";

import dynamic from "next/dynamic";
import { collectDroppedFiles, exceedsModelLimit, MAX_MODEL_MIB } from "../../../lib/model-viewer/local-files";
import type { GltfAsset } from "../../../lib/model-viewer/gltf-import";
import type { ObjGeometry } from "../../../lib/model-viewer/geometry";
import { useEffect, useRef, useState } from "react";
import type { ObjSummary } from "../../../lib/model-viewer/obj-parser";
import { useI18n } from "../LanguageProvider";

const ObjViewport = dynamic(() => import("./ObjViewport"), { ssr: false });

export default function ObjInspector() {
    const { messages, locale } = useI18n();
    const t = messages.modelViewer.inspector;
    const sizeError = t.sizeError.replace("{limit}", String(MAX_MODEL_MIB));
    const hint = t.hint.replace("{limit}", String(MAX_MODEL_MIB));
    const [result, setResult] = useState<ObjSummary | null>(null);
    const [geometry, setGeometry] = useState<ObjGeometry | null>(null);
    const [asset, setAsset] = useState<GltfAsset | null>(null);
    const loaded = useRef<GltfAsset | null>(null);
    const generation = useRef(0);
    const [fileName, setFileName] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [dragging, setDragging] = useState(false);
    const worker = useRef<Worker | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const input = useRef<HTMLInputElement>(null);
    const folderInput = useRef<HTMLInputElement>(null);
    function stop() {
        generation.current++;
        worker.current?.terminate();
        worker.current = null;
        if (timer.current) clearTimeout(timer.current);
    }
    useEffect(() => () => { stop(); loaded.current?.dispose(); }, []);
    function reset() {
        stop(); loaded.current?.dispose(); loaded.current = null; setAsset(null); setBusy(false); setGeometry(null); setResult(null); setFileName(""); setError("");
    }
    async function drop(transfer: DataTransfer) {
        reset(); setBusy(true);
        const current = generation.current;
        try {
            const selection = await collectDroppedFiles(transfer, () => current !== generation.current);
            if (current === generation.current) await load(selection.files, selection.paths);
        } catch (error) {
            if (current !== generation.current) return;
            setBusy(false);
            setError(error instanceof Error && error.message === "size" ? sizeError : t.directoryError);
        }
    }
    async function load(files: FileList | File[], paths = new Map<File, string>()) {
        reset();
        const all = Array.from(files);
        const models = all.filter(file => /\.(obj|glb|gltf|fbx)$/i.test(file.name));
        if (models.length !== 1 || (/\.obj$/i.test(models[0].name) && all.length !== 1)) { setError(t.typeError); return; }
        const file = models[0];
        if (exceedsModelLimit(all)) { setError(sizeError); return; }
        setFileName(all.map(file => paths.get(file) || file.webkitRelativePath || file.name).join(" · ")); setBusy(true);
        if (/\.(glb|gltf|fbx)$/i.test(file.name)) {
            const current = generation.current;
            timer.current = setTimeout(() => { if (current === generation.current) { stop(); setBusy(false); setError(t.timeout); } }, 30000);
            try {
                const importer = /\.fbx$/i.test(file.name) ? (await import("../../../lib/model-viewer/fbx-import")).importFbx : (await import("../../../lib/model-viewer/gltf-import")).importGltf;
                if (current !== generation.current) return;
                const next = await importer(file, all, paths);
                if (current !== generation.current) { next.dispose(); return; }
                if (timer.current) clearTimeout(timer.current);
                loaded.current = next; setAsset(next); setResult(next.summary); setBusy(false);
            } catch (error) {
                if (current !== generation.current) return;
                if (timer.current) clearTimeout(timer.current);
                const detail = error instanceof Error ? error.message : "";
                setError(detail.startsWith("missing:") ? t.missing + detail.slice(8) : detail === "compression" ? t.compression : detail === "external" ? t.external : /\.fbx$/i.test(file.name) ? t.fbxError : t.gltfError);
                setBusy(false);
            }
            return;
        }
        try {
            const task = new Worker(new URL("../../../lib/model-viewer/obj.worker.ts", import.meta.url));
            worker.current = task;
            task.onmessage = (event: MessageEvent<{ result?: ObjSummary; geometry?: ObjGeometry; error?: string }>) => {
                if (worker.current !== task) return;
                stop(); setBusy(false);
                if (event.data.result) { setResult(event.data.result); setGeometry(event.data.geometry ?? null); }
                else setError(t.parseError);
            };
            task.onerror = () => { if (worker.current === task) { stop(); setBusy(false); setError(t.parseError); } };
            timer.current = setTimeout(() => { stop(); setBusy(false); setError(t.timeout); }, 15000);
            task.postMessage(file);
        } catch { stop(); setBusy(false); setError(t.parseError); }
    }
    const format = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(n);
    const rows: [string, string][] = result ? [
        [t.vertices, format(result.vertices)], [t.faces, format(result.faces)], [t.triangles, format(result.triangles)],
        ...result.size.map((v, i): [string, string] => [`${"XYZ"[i]} ${t.size}`, format(v)]),
        [t.bones, asset ? format(asset.bones) : t.unsupported], [t.animations, asset ? format(asset.animations) : t.unsupported],
    ] : [];
    return (
        <section className="overflow-hidden rounded-2xl border border-[#E1E5E8] bg-white text-[#354553]">
            <div className="flex flex-wrap items-center gap-3 border-b border-[#E1E5E8] bg-[#F3F4F5] p-4">
                <button type="button" onClick={() => input.current?.click()} className="rounded-lg bg-[#435D73] px-4 py-2 text-sm text-white">{t.open}</button>
                <button type="button" onClick={() => folderInput.current?.click()} className="rounded-lg border border-[#D5DCE2] px-4 py-2 text-sm">{t.openFolder}</button>
                <input ref={element => { folderInput.current = element; element?.setAttribute("webkitdirectory", ""); }} type="file" multiple aria-label={t.openFolder} className="hidden" onChange={e => { if (e.target.files?.length) load(e.target.files); e.target.value = ""; }} />
                <button type="button" onClick={reset} className="rounded-lg border border-[#D5DCE2] px-4 py-2 text-sm">{t.clear}</button>
                <span className="min-w-0 break-all text-sm">{fileName || "OBJ / GLB / glTF / FBX"}</span>
                <input ref={input} type="file" multiple accept=".obj,.glb,.gltf,.fbx,.bin,.png,.jpg,.jpeg,.webp,.bmp,.tga" aria-label={t.open} className="hidden" onChange={e => { if (e.target.files?.length) load(e.target.files); e.target.value = ""; }} />
            </div>
            <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1.2fr)]">
                <aside className="min-w-0 space-y-6 border-b border-[#E1E5E8] p-5 xl:border-r xl:border-b-0">
                    <h2 className="font-semibold">{t.files}</h2>
                    <p className="break-all text-sm">{fileName || t.none}</p>
                    {result && (asset ? [[t.objects, result.objects], [t.materials, result.materials]] as [string, string[]][] : [ [t.objects, result.objects], [t.groups, result.groups], [t.materials, result.materials], [t.libraries, result.libraries] ] as [string, string[]][]).map(([title, values]) => (
                        <div key={title}><h3 className="mb-2 text-sm font-semibold">{title} ({format(values.length)})</h3>
                            <ul className="max-h-40 overflow-auto text-sm leading-7">{values.length ? values.map(value => <li className="break-all" key={value}>{value}</li>) : <li>{t.none}</li>}</ul>
                        </div>
                    ))}
                </aside>
                <div className={`flex min-h-96 flex-col items-center justify-center border-b p-6 text-center xl:border-r xl:border-b-0 ${dragging ? "bg-blue-50 border-blue-400" : "bg-[#FAFBFC] border-[#E1E5E8]"}`}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => { e.preventDefault(); setDragging(false); void drop(e.dataTransfer); }}>
                    {asset ? <ObjViewport key={asset.root.uuid} root={asset.root} clips={asset.clips} /> : geometry?.length ? <ObjViewport geometry={geometry} /> : <p className="text-xl font-semibold">{result ? t.noFaces : t.drop}</p>}
                    <p className="mt-3 text-sm leading-7">{t.local}</p>
                    <p className="mt-3 text-sm leading-7">{t.folderHint}</p>
                    <p className="mt-4 text-sm leading-7" role="status" aria-live="polite">{busy ? t.loading : result ? t.success : hint}</p>
                    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}

                </div>
                <aside className="min-w-0 p-5">
                    <h2 className="mb-5 font-semibold">{t.details}</h2>
                    {result ? <dl className="space-y-4 text-sm">{rows.map(([label, value]) => <div className="flex flex-wrap justify-between gap-2" key={label}><dt>{label}</dt><dd className="break-all font-medium">{value}</dd></div>)}</dl> : <p className="text-sm">{t.waiting}</p>}
                </aside>
            </div>
            <div className="space-y-2 border-t border-[#E1E5E8] p-5 text-sm leading-6 text-[#526779]">
                {result && <><p>{asset ? t.sceneNote : t.countNote}</p><p>{asset ? t.sceneMaterials : t.materialNote}</p></>}
                {!!result?.ignored.length && <p>{t.ignored}: {result.ignored.join(", ")}</p>}
            </div>
        </section>
    );
}
