/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const api = {};
new Function('require', 'exports', ts.transpileModule(fs.readFileSync('src/lib/request-guard.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText)(name => name === 'server-only' ? {} : { getVisitorIp: () => null }, api);
const request = body => new Request('http://localhost/', { method: 'POST', body, duplex: 'half' });
(async () => {
    const limit = api.createRequestLimiter();
    for (let i = 0; i < 20; i++) assert.equal(limit('translate', 'client-a', 1000), 0);
    assert.equal(limit('translate', 'client-a', 1001), 60);
    assert.equal(limit('translate', 'client-b', 1001), 0);
    assert.equal(limit('translate', 'client-a', 61000), 0);
    const global = api.createRequestLimiter();
    for (let i=0;i<300;i++) assert.equal(global('analytics', null, 0), 0);
    assert.equal(global('analytics', null, 1), 60);
    assert.equal(global('login', null, 1), 0);
    const login = api.createRequestLimiter();
    for (let i=0;i<5;i++) assert.equal(login('login','a',0),0);
    assert.equal(login('login','a',1),60);
    assert.deepEqual(await api.readLimitedJson(request('{"a":1}'),7),{a:1});
    await assert.rejects(api.readLimitedJson(request('{"a":1}'),6), e=>e.status===413);
    await assert.rejects(api.readLimitedJson(new Request('http://localhost/', {method:'POST',body:'{}',headers:{'content-length':'999'}}),8), e=>e.status===413);
    let cancelled = false;
    const stream = new ReadableStream({start(c){c.enqueue(new Uint8Array(3));c.enqueue(new Uint8Array(8));},cancel(){cancelled=true;}});
    await assert.rejects(api.readLimitedJson(request(stream),10),e=>e.status===413);
    assert.equal(cancelled,true);
    await assert.rejects(api.readLimitedJson(request('{'),100),e=>e.status===400);
    await assert.rejects(api.readLimitedJson(request(new Uint8Array([255])),100),e=>e.status===400);
    await assert.rejects(api.readLimitedJson(request(new ReadableStream({})),100,20),e=>e.status===408);
    console.log('PASS: per-client/global isolation, expiry, login throttle, exact byte boundary, Content-Length, chunked body cancellation, malformed UTF-8/JSON, body timeout.');
})().catch(error=>{console.error(error);process.exitCode=1;});
