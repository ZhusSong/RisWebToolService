import { LoadingManager, Group } from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { TGALoader } from "three/addons/loaders/TGALoader.js";
import { createModelAsset, disposeRoots, normalizePath } from "./model-asset";

export async function importFbx(main: File, files: File[], paths = new Map<File, string>()) {
    const data = await main.arrayBuffer();
    const byPath = new Map<string, File>();
    for (const file of files) {
        const path = normalizePath(paths.get(file) || file.webkitRelativePath || file.name);
        if (byPath.has(path)) throw new Error("duplicate");
        byPath.set(path, file);
    }
    const mainPath = normalizePath(paths.get(main) || main.webkitRelativePath || main.name);
    const base = mainPath.slice(0, mainPath.lastIndexOf("/") + 1);
    const urls = new Set<string>();
    const manager = new LoadingManager();
    let failure: Error | undefined;
    let root: Group | undefined;
    let finish!: () => void;
    const ready = new Promise<void>(resolve => { finish = resolve; });
    manager.onLoad = finish;
    manager.onError = () => { failure ??= new Error("resource"); };
    manager.addHandler(/\.tga$/i, new TGALoader(manager));
    manager.setURLModifier(uri => {
        if (/^data:/i.test(uri)) return uri;
        // FBXLoader creates these for embedded binary images.
        if (uri.startsWith("blob:")) { urls.add(uri); return uri; }
        const clean = uri.replace(/\\/g, "/");
        if (/^(?:https?:|\/\/)/i.test(clean)) throw new Error("external");
        let file = byPath.get(normalizePath(base + clean));
        if (!file) {
            // Exporters often record an absolute Windows path. Only use selected files.
            const name = normalizePath(clean).split("/").pop();
            const matches = files.filter(candidate => candidate.name === name);
            if (matches.length === 1) file = matches[0];
        }
        if (!file) throw new Error("missing:" + uri);
        const url = URL.createObjectURL(file); urls.add(url); return url;
    });
    // A sentinel keeps onLoad from completing before parse has scheduled all textures.
    manager.itemStart("fbx-parse");
    try {
        const loader = new FBXLoader(manager);
        loader.trimAnimationClips = true;
        root = loader.parse(data, "");
    } catch (error) { failure = error instanceof Error ? error : new Error("invalid"); }
    finally { manager.itemEnd("fbx-parse"); }
    try {
        await ready;
        if (failure) throw failure;
        if (!root) throw new Error("invalid");
        return createModelAsset(root, root.animations);
    } catch (error) {
        if (root) disposeRoots([root]);
        throw error;
    } finally { urls.forEach(url => URL.revokeObjectURL(url)); }
}
