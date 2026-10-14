import { Box3, BufferGeometry, InstancedMesh, Material, Mesh, Object3D, SkinnedMesh, Texture, Vector3 } from "three";

import type { ObjSummary } from "./obj-parser";
import type { AnimationClip } from "three";

export type ModelAsset = {
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


export function createModelAsset(root: Object3D, clips: AnimationClip[], roots: Object3D[] = [root]): ModelAsset {
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
        return { root, summary, bones: bones.size, animations: clips.length, clips: clips, dispose: () => { if (!disposed) { disposed = true; disposeRoots(roots); } } };
}
