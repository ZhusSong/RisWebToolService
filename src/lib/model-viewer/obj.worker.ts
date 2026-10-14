import { parseObj } from "./obj-parser";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { Mesh } from "three";
import type { ObjGeometry } from "./geometry";

self.onmessage = async (event: MessageEvent<File>) => {
    try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(await event.data.arrayBuffer());
        const result = parseObj(text);
        const object = new OBJLoader().parse(text.replace(/^\uFEFF/, ""));
        const geometry: ObjGeometry = [];
        object.traverse(child => {
            if (!(child instanceof Mesh)) return;
            const positions = new Float32Array(child.geometry.getAttribute("position").array);
            const normal = child.geometry.getAttribute("normal");
            if (positions.some(v => !Number.isFinite(v))) throw new Error("range");
            geometry.push({ positions, normals: normal ? new Float32Array(normal.array) : null });
        });
        self.postMessage({ result, geometry });
    } catch (error) {
        self.postMessage({ error: error instanceof Error ? error.message : "unknown" });
    }
};
