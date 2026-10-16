const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../web/portal/app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../web/index.html'), 'utf8');

function page(fetch) {
  const nodes = new Map();
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {value:'',textContent:'',addEventListener(name, cb){this[name]=cb;}});
    return nodes.get(id);
  }
  const labels = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => ({dataset:{i18n:m[1]}}));
  const document = {documentElement:{},getElementById:node,querySelectorAll:()=>labels};
  const context = vm.createContext({document,localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},fetch,AbortController,setTimeout,clearTimeout});
  vm.runInContext(source, context);
  return {context, node, labels};
}
test('all three languages cover every page label even with storage blocked', async()=>{
  const p = page(async()=>({ok:true,json:async()=>({success:true})}));
  await new Promise(resolve=>setImmediate(resolve));
  for (const language of ['zh-CN','ja','en']) {
    p.node('language').value=language; p.node('language').change();
    for(const label of p.labels) assert.ok(label.textContent, label.dataset.i18n);
  }
  assert.equal(p.node('health').textContent,'Gateway connected');
});
test('gateway failures render unavailable instead of invented service health', async()=>{
  const p=page(async()=>{throw Error('offline');});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.node('health').textContent,'暂时无法连接');
  assert.equal(p.node('retry').disabled,false);
});
