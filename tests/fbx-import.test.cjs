/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
(async () => {
    const three = await import('three');
    const fbx = await import('three/addons/loaders/FBXLoader.js');
    const tga = await import('three/addons/loaders/TGALoader.js');
    const modules = { three, 'three/addons/loaders/FBXLoader.js': fbx, 'three/addons/loaders/TGALoader.js': tga };
    function load(name) {
        const exports = {};
        const source = fs.readFileSync(path.join(__dirname, '../src/lib/model-viewer/', name + '.ts'), 'utf8');
        new Function('require', 'exports', ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
        }).outputText)(key => { assert.ok(modules[key], key); return modules[key]; }, exports);
        return exports;
    }
    modules['./model-asset'] = load('model-asset');
    const { importFbx } = load('fbx-import');
    const file = new File([fs.readFileSync(path.join(__dirname, 'fixtures/model-viewer/triangle.fbx'))], 'triangle.fbx');
    const asset = await importFbx(file, [file]);
    assert.equal(asset.summary.vertices, 3);
    assert.equal(asset.summary.triangles, 1);
    assert.deepEqual(asset.summary.size, [2, 3, 0]);
    assert.equal(asset.animations, 1);
    assert.equal(asset.clips[0].name, 'Move');
    const mixer = new three.AnimationMixer(asset.root);
    mixer.clipAction(asset.clips[0]).play();
    mixer.update(0.5);
    assert.equal(asset.root.getObjectByName('Triangle').position.x, 1);
    mixer.stopAllAction(); mixer.uncacheRoot(asset.root);
    assert.ok(asset.summary.objects.includes('Triangle'));
    asset.dispose(); asset.dispose();
    await assert.rejects(importFbx(new File(['invalid'], 'invalid.fbx'), []));
    await assert.rejects(importFbx(file, [file, file]), /duplicate/);
    const text = await file.text();
    const textured = uri => text.replace('Objects:  {', `Objects:  {
\tVideo: 20, "Video::Image", "Clip" {
\t\tRelativeFilename: "${uri}"
\t}
\tTexture: 21, "Texture::Image", "" {
\t\tFileName: "${uri}"
\t}
`).replace('Connections:  {', 'Connections:  {\n\tC: "OO",20,21');
    await assert.rejects(importFbx(new File([textured('textures/missing.png')], 'missing.fbx'), []), /missing:textures\/missing.png/);
    await assert.rejects(importFbx(new File([textured('https://example.com/image.png')], 'remote.fbx'), []), /external/);
    console.log('PASS: actual FBXLoader ASCII geometry, dimensions, objects, named animation and playback, disposal, invalid input and duplicate paths.');
})().catch(error => { console.error(error); process.exitCode = 1; });
