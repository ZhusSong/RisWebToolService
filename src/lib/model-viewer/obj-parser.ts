export type ObjSummary = {
    vertices: number;
    faces: number;
    triangles: number;
    size: number[];
    objects: string[];
    groups: string[];
    materials: string[];
    libraries: string[];
    ignored: string[];
};

export function parseObj(source: string): ObjSummary {
    const result: ObjSummary = { vertices: 0, faces: 0, triangles: 0, size: [], objects: [], groups: [], materials: [], libraries: [], ignored: [] };
    const names = { objects: new Set<string>(), groups: new Set<string>(), materials: new Set<string>(), libraries: new Set<string>(), ignored: new Set<string>() };
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const counts = [0, 0, 0]; // positions, texture coordinates, normals
    const largest = [0, 0, 0];
    let lastFaceLine = 0;
    const number = (s: string) => {
        if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) return NaN;
        return Number(s);
    };
    const lines = source.replace(/^\uFEFF/, "").replace(/\\\r?\n/g, " ").split(/\r\n|\n|\r/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].split("#", 1)[0].trim();
        if (!line) continue;
        const [kind, ...values] = line.split(/\s+/);
        const fail = () => { throw new Error(String(i + 1)); };
        if (kind === "v" || kind === "vt" || kind === "vn") {
            const required = kind === "vt" ? 1 : 3;
            if (values.length < required || values.some(v => !Number.isFinite(number(v)))) fail();
            const slot = kind === "v" ? 0 : kind === "vt" ? 1 : 2;
            counts[slot]++;
            if (kind === "v") {
                for (let axis = 0; axis < 3; axis++) {
                    const value = number(values[axis]);
                    min[axis] = Math.min(min[axis], value);
                    max[axis] = Math.max(max[axis], value);
                }
            }
        } else if (kind === "f") {
            if (values.length < 3) fail();
            for (const value of values) {
                if (!/^[+-]?\d+(?:\/[+-]?\d+|\/\/[+-]?\d+|\/[+-]?\d+\/[+-]?\d+)?$/.test(value)) fail();
                value.split("/").forEach((part, slot) => {
                    if (!part) return;
                    const index = Number(part);
                    if (!Number.isSafeInteger(index) || index === 0 || (index < 0 && -index > counts[slot])) fail();
                    if (index > 0) largest[slot] = Math.max(largest[slot], index);
                });
            }
            result.faces++;
            result.triangles += values.length - 2;
            lastFaceLine = i + 1;
        } else if (kind === "o") names.objects.add(values.join(" "));
        else if (kind === "g") values.forEach(v => names.groups.add(v));
        else if (kind === "usemtl") names.materials.add(values.join(" "));
        else if (kind === "mtllib") values.forEach(v => names.libraries.add(v));
        else if (kind !== "s") names.ignored.add(kind);
    }
    if (largest.some((value, slot) => value > counts[slot])) throw new Error(String(lastFaceLine));
    if (!counts[0]) throw new Error("empty");
    result.vertices = counts[0];
    result.size = max.map((value, axis) => value - min[axis]);
    if (result.size.some(value => !Number.isFinite(value))) throw new Error("range");
    for (const key of Object.keys(names) as (keyof typeof names)[]) result[key] = [...names[key]].filter(Boolean);
    return result;
}
