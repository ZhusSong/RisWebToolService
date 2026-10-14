/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const output = ts.transpileModule(fs.readFileSync('src/lib/model-viewer/local-files.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const api = {};
new Function('exports', output)(api);
const fileEntry = name => ({ name, isFile: true, file: resolve => resolve(new File(['x'], name)) });
const folder = (name, batches) => ({ name, isDirectory: true, createReader: () => {
    let index = 0; return { readEntries: resolve => resolve(batches[index++] || []) };
} });
const transfer = entries => ({ files: [], items: entries.map(entry => ({ kind: 'file', webkitGetAsEntry: () => entry, getAsFile: () => null })) });
(async () => {
    const textures = folder('textures', [[fileEntry('base.jpeg')], [fileEntry('normal.jpeg')]]);
    let result = await api.collectDroppedFiles(transfer([fileEntry('scene.gltf'), textures]));
    assert.deepEqual([...result.paths.values()], ['scene.gltf', 'textures/base.jpeg', 'textures/normal.jpeg']);
    result = await api.collectDroppedFiles(transfer([folder('wooden_box', [[fileEntry('scene.gltf'), textures]])]));
    assert.deepEqual([...result.paths.values()], ['wooden_box/scene.gltf', 'wooden_box/textures/base.jpeg', 'wooden_box/textures/normal.jpeg']);
    await assert.rejects(api.collectDroppedFiles(transfer([textures]), () => true), /cancelled/);
    await assert.rejects(api.collectDroppedFiles(transfer([{ name: 'bad', isFile: true, file: (_, reject) => reject(new Error('denied')) }])), /denied/);
    const large = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.bin');
    assert.equal(api.exceedsModelLimit([large]), false);
    result = await api.collectDroppedFiles(transfer([{ name: large.name, isFile: true, file: resolve => resolve(large) }]));
    assert.equal(result.files[0], large);
    // Metadata doubles exercise the boundary without allocating half a GiB.
    const boundary = { name: 'boundary.bin', size: api.MAX_MODEL_BYTES };
    const extra = { name: 'extra.bin', size: 1 };
    assert.equal(api.exceedsModelLimit([boundary]), false);
    assert.equal(api.exceedsModelLimit([boundary, extra]), true);
    result = await api.collectDroppedFiles({ items: [], files: [boundary] });
    assert.equal(result.files.length, 1);
    await assert.rejects(api.collectDroppedFiles({ items: [], files: [boundary, extra] }), /size/);
    await assert.rejects(api.collectDroppedFiles(transfer([folder('oversized', [[
        { name: boundary.name, isFile: true, file: resolve => resolve(boundary) },
        { name: extra.name, isFile: true, file: resolve => resolve(extra) }
    ]])])), /size/);
    result = await api.collectDroppedFiles({ items: [], files: [new File(['x'], 'scene.gltf')] });
    assert.equal(result.files.length, 1);
    console.log('PASS: mixed drop, nested folder, multiple reader batches, cancellation, read failure, size limit, fallback.');
})().catch(error => { console.error(error); process.exitCode = 1; });
