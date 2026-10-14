/* eslint-disable @typescript-eslint/no-require-imports -- Test the TS importer against real Three.js loaders. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

(async () => {
    global.ProgressEvent ??= class ProgressEvent extends Event { constructor(type, init) { super(type); Object.assign(this, init); } };
    const three = await import('three');
    const loader = await import('three/addons/loaders/GLTFLoader.js');
    const source = fs.readFileSync(path.join(__dirname, '../src/lib/model-viewer/gltf-import.ts'), 'utf8');
    const moduleObject = { exports: {} };
    vm.runInThisContext('(function(require,exports){' + ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText + '\n})')(name => name === 'three' ? three : loader, moduleObject.exports);
    const { importGltf } = moduleObject.exports;
    const buffer = Buffer.from(new Float32Array([-1,0,0, 1,0,0, 0,2,0]).buffer);
    const doc = {
        asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
        nodes: [{ name: 'GreenTriangle', mesh: 0, translation: [4,0,0], scale: [2,1,1] }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
        materials: [{ name: 'Green', doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.1,0.7,0.3,1], metallicFactor: 0, roughnessFactor: 0.8 } }],
        buffers: [{ byteLength: buffer.length, uri: 'data:application/octet-stream;base64,' + buffer.toString('base64') }],
        bufferViews: [{ buffer: 0, byteLength: buffer.length }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-1,0,0], max: [1,2,0] }]
    };
    const file = new File([JSON.stringify(doc)], 'triangle.gltf');
    let asset = await importGltf(file, [file]);
    assert.equal(asset.summary.vertices, 3);
    assert.equal(asset.summary.triangles, 1);
    assert.deepEqual(asset.summary.size, [4,2,0]);
    assert.equal(asset.bones, 0); assert.equal(asset.animations, 0);
    assert.deepEqual(asset.summary.materials, ['Green']);
    asset.dispose(); asset.dispose();
    const animated = structuredClone(doc);
    const animationBuffer = Buffer.concat([buffer, Buffer.from(new Float32Array([0,1, 4,0,0, 4,1,0]).buffer)]);
    animated.buffers[0] = { byteLength: animationBuffer.length, uri: 'data:application/octet-stream;base64,' + animationBuffer.toString('base64') };
    animated.bufferViews.push({buffer:0, byteOffset:36, byteLength:8}, {buffer:0, byteOffset:44, byteLength:24});
    animated.accessors.push({bufferView:1,componentType:5126,count:2,type:'SCALAR',min:[0],max:[1]}, {bufferView:2,componentType:5126,count:2,type:'VEC3'});
    animated.animations = [{samplers:[{input:1,output:2}],channels:[{sampler:0,target:{node:0,path:'translation'}}]}];
    const animatedFile = new File([JSON.stringify(animated)], 'animated.gltf');
    asset = await importGltf(animatedFile, [animatedFile]); assert.equal(asset.animations, 1); asset.dispose();
    asset = await importGltf(animatedFile, [animatedFile]);
    assert.equal(asset.clips.length, 1);
    const mixer = new three.AnimationMixer(asset.root);
    const target = asset.root.getObjectByName('GreenTriangle');
    const action = mixer.clipAction(asset.clips[0]).play();
    mixer.update(0.5); assert.equal(target.position.y, 0.5);
    action.paused = true; mixer.update(0.25); assert.equal(target.position.y, 0.5);
    action.paused = false; mixer.update(0.25); assert.equal(target.position.y, 0.75);
    mixer.update(0.5); assert.equal(target.position.y, 0.25);
    mixer.stopAllAction(); assert.equal(target.position.y, 0);
    mixer.uncacheRoot(asset.root); asset.dispose();
    const external = structuredClone(doc); external.buffers[0].uri = 'assets/triangle.bin';
    const externalFile = new File([JSON.stringify(external)], 'external.gltf');
    await assert.rejects(importGltf(externalFile, [externalFile]), /missing:/);
    asset = await importGltf(externalFile, [externalFile, new File([buffer], 'triangle.bin')]);
    assert.equal(asset.summary.triangles, 1); asset.dispose();
    const nestedBin = new File([buffer], 'triangle.bin');
    const wrongBin = new File(['invalid'], 'triangle.bin');
    asset = await importGltf(externalFile, [externalFile, nestedBin, wrongBin], new Map([
        [externalFile, 'wooden_box/external.gltf'], [nestedBin, 'wooden_box/assets/triangle.bin'], [wrongBin, 'other/triangle.bin']
    ]));
    assert.equal(asset.summary.triangles, 1); asset.dispose();
    external.buffers[0].uri = 'https://example.com/triangle.bin';
    await assert.rejects(importGltf(new File([JSON.stringify(external)], 'remote.gltf'), []), /external/);
    const compressed = { ...doc, extensionsUsed: ['KHR_draco_mesh_compression'] };
    await assert.rejects(importGltf(new File([JSON.stringify(compressed)], 'compressed.gltf'), []), /compression/);
    const glbDoc = structuredClone(doc); delete glbDoc.buffers[0].uri;
    let json = Buffer.from(JSON.stringify(glbDoc));
    json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
    const glb = Buffer.alloc(12 + 8 + json.length + 8 + buffer.length);
    glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
    glb.writeUInt32LE(json.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); json.copy(glb, 20);
    glb.writeUInt32LE(buffer.length, 20 + json.length); glb.writeUInt32LE(0x004e4942, 24 + json.length); buffer.copy(glb, 28 + json.length);
    const glbFile = new File([glb], 'triangle.glb');
    asset = await importGltf(glbFile, [glbFile]); assert.equal(asset.summary.triangles, 1); asset.dispose();
    await assert.rejects(importGltf(new File(['broken'], 'broken.glb'), []));
    const fixture = path.join(__dirname, 'fixtures/model-viewer');
    fs.writeFileSync(path.join(fixture, 'triangle.gltf'), JSON.stringify(doc, null, 2) + '\n', 'utf8');
    fs.writeFileSync(path.join(fixture, 'triangle.glb'), glb);
    console.log('PASS: embedded glTF, external BIN, GLB, transforms, materials, missing/remote/compressed/invalid input, disposal.');
})().catch(error => { console.error(error); process.exitCode = 1; });
