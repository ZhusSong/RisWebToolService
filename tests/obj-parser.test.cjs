/* eslint-disable @typescript-eslint/no-require-imports -- Test the standalone TypeScript parser. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/model-viewer/obj-parser.ts'), 'utf8');
const moduleObject = { exports: {} };
vm.runInThisContext('(function(exports){' + ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText + '\n})')(moduleObject.exports);
const { parseObj } = moduleObject.exports;
const vertices = 'v -1 0 0\nv 2 0 0\nv 2 4 0\nv -1 4 0\n';
const result = parseObj('\uFEFF# example\n' + vertices + 'o A\ng wall\nusemtl red\nmtllib model.mtl\nf -4 -3 -2 -1');
assert.equal(result.vertices, 4);
assert.equal(result.faces, 1);
assert.equal(result.triangles, 2);
assert.deepEqual(result.size, [3,4,0]);
assert.deepEqual(result.objects, ['A']);
assert.deepEqual(result.materials, ['red']);
assert.deepEqual(result.libraries, ['model.mtl']);
assert.equal(parseObj(vertices + 'vt 0 0\nvn 0 0 1\nf 1/1/1 2/1/1 3/1/1').triangles, 1);
assert.equal(parseObj(vertices + 'vn 0 0 1\nf 1//1 2//1 3//1').faces, 1);
assert.equal(parseObj(vertices + 'f 1 2 \\\n3 4 # comment').triangles, 2);
assert.equal(parseObj(vertices).triangles, 0);
assert.deepEqual(parseObj(vertices+'l 1 2').ignored, ['l']);
for (const face of ['f 0 2 3','f 1 2 5','f -5 -2 -1','f 1 2','f 1/x 2/1 3/1','f 1//2 2//2 3//2','f 1/ 2/ 3/']) {
    assert.throws(() => parseObj(vertices + face), face);
}
for (const text of ['', '# only comment', 'v NaN 0 0', 'v 0x10 0 0', 'v 1e309 0 0', 'v 1 2', 'v -1e308 0 0\nv 1e308 0 0']) assert.throws(() => parseObj(text));
console.log('PASS: OBJ bounds, polygons, references, negative indices, metadata and malformed input.');
