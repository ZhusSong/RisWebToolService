import { Box3, BufferGeometry, InstancedMesh, Material, Mesh, Object3D, SkinnedMesh, Texture, Vector3, LoadingManager } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { ObjSummary } from "./obj-parser";
import type { AnimationClip } from "three";

export type GltfAsset = {
    root: Object3D;
    summary: ObjSummary;
    bones: number;
    animations: number;
    clips: AnimationClip[];
    dispose: () => void;
};

// Paths are virtual, relative to the user-selected files, never server paths.
export function normalizePath(value: string): string {
    const segments: string[] = [];
    for (const part of decodeURIComponent(value).replace(/\\/g, "/").split("/")) {
        if (!part || part === ".") continue;
        if (part === "..") segments.pop();
        else segments.push(part);
    }
    return segments.join("/");
}

export function disposeRoots(roots: Object3D[]) {
    const geometries = new Set<BufferGeometry>(), materials = new Set<Material>(), textures = new Set<Texture>();
    const skeletons = new Set<SkinnedMesh["skeleton"]>();
    roots.forEach(root => root.traverse(node => {
        const mesh = node as Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => {
            materials.add(material);
            Object.values(material).forEach(value => { if (value instanceof Texture) textures.add(value); });
        });
        if ((node as SkinnedMesh).isSkinnedMesh) skeletons.add((node as SkinnedMesh).skeleton);
    }));
    geometries.forEach(value => value.dispose());
    materials.forEach(value => value.dispose());
    textures.forEach(value => {
        const image = value.source?.data;
        if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) image.close();
        value.dispose();
    });
    skeletons.forEach(value => value.dispose());
}

export async function importGltf(main: File, files: File[], paths = new Map<File, string>()): Promise<GltfAsset> {
    const data = await main.arrayBuffer();
    let document;
    if (/\.glb$/i.test(main.name)) {
        if (data.byteLength < 20) throw new Error("invalid");
        const header = new DataView(data);
        if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== data.byteLength || header.getUint32(16, true) !== 0x4e4f534a) throw new Error("invalid");
        const length = header.getUint32(12, true);
        if (20 + length > data.byteLength) throw new Error("invalid");
        document = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data.slice(20, 20 + length)));
    } else document = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data));
    if (document.asset?.version !== "2.0") throw new Error("version");
    const compressed = ["KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_texture_basisu"];
    if ((document.extensionsUsed ?? []).some((name: string) => compressed.includes(name))) throw new Error("compression");
    const byPath = new Map<string, File>();
    for (const file of files) {
        const path = normalizePath(paths.get(file) || file.webkitRelativePath || file.name);
        if (byPath.has(path)) throw new Error("duplicate");
        byPath.set(path, file);
    }
    const mainPath = normalizePath(paths.get(main) || main.webkitRelativePath || main.name);
    const base = mainPath.includes("/") ? mainPath.slice(0, mainPath.lastIndexOf("/") + 1) : "";
    const urls = new Map<string, string>();
    const resolve = (uri: string) => {
        if (/^data:/i.test(uri)) return uri;
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(uri)) throw new Error("external");
        const path = normalizePath(base + uri);
        let file = byPath.get(path);
        if (!file) {
            const candidates = files.filter(candidate => candidate.name === path.split("/").pop());
            if (candidates.length === 1) file = candidates[0];
        }
        if (!file) throw new Error("missing:" + uri);
        let url = urls.get(uri);
        if (!url) { url = URL.createObjectURL(file); urls.set(uri, url); }
        return url;
    };
    const roots: Object3D[] = [];
    try {
        // Preflight every declared resource so missing images cannot silently become blank materials.
        for (const entry of [...(document.buffers ?? []), ...(document.images ?? [])]) if (entry.uri) resolve(entry.uri);
        const manager = new LoadingManager();
        let resourceError = false;
        manager.onError = () => { resourceError = true; };
        manager.setURLModifier(uri => {
            // Blob URLs here are created by GLTFLoader for embedded images or by this importer.
            if (uri.startsWith("blob:") || uri.startsWith("data:")) return uri;
            return resolve(uri);
        });
        const gltf = await new GLTFLoader(manager).parseAsync(/\.glb$/i.test(main.name) ? data : JSON.stringify(document), "");
        roots.push(...gltf.scenes);
        if (resourceError) throw new Error("resource");
        const root = gltf.scene;
        root.updateMatrixWorld(true);
        const summary: ObjSummary = { vertices: 0, faces: 0, triangles: 0, size: [], objects: [], groups: [], materials: [], libraries: [], ignored: [] };
        const bones = new Set<string>(), materials = new Set<string>();
        root.traverse(node => {
            if (node.name) summary.objects.push(node.name);
            const mesh = node as Mesh;
            if (!mesh.isMesh) return;
            const positions = mesh.geometry.getAttribute("position");
            if (!positions) return;
            const instances = (mesh as InstancedMesh).isInstancedMesh ? (mesh as InstancedMesh).count : 1;
            summary.vertices += positions.count * instances;
            summary.triangles += (mesh.geometry.index?.count ?? positions.count) / 3 * instances;
            (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material.name || material.type));
            if ((mesh as SkinnedMesh).isSkinnedMesh) (mesh as SkinnedMesh).skeleton.bones.forEach(bone => bones.add(bone.uuid));
        });
        summary.objects = [...new Set(summary.objects)];
        summary.materials = [...materials];
        summary.faces = summary.triangles;
        const box = new Box3().setFromObject(root, true);
        if (box.isEmpty()) throw new Error("empty");
        summary.size = box.getSize(new Vector3()).toArray();
        if (summary.size.some(value => !Number.isFinite(value))) throw new Error("invalid");
        let disposed = false;
        return { root, summary, bones: bones.size, animations: gltf.animations.length, clips: gltf.animations, dispose: () => { if (!disposed) { disposed = true; disposeRoots(roots); } } };
    } catch (error) { disposeRoots(roots); throw error; }
    finally { urls.forEach(url => URL.revokeObjectURL(url)); }
}
