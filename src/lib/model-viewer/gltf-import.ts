import { LoadingManager, Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createModelAsset, disposeRoots, normalizePath } from "./model-asset";
import type { ModelAsset } from "./model-asset";
export type GltfAsset = ModelAsset;
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
        return createModelAsset(root, gltf.animations, roots);
    } catch (error) { disposeRoots(roots); throw error; }
    finally { urls.forEach(url => URL.revokeObjectURL(url)); }
}
