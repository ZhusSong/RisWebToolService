const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../web/portal/chat.js'),'utf8');
function setup(fetch){
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',children:[],addEventListener(n,fn){this[n]=fn},replaceChildren(){this.children=[]},append(...x){this.children.push(...x)},click(){this.clickHandler?.()}});return nodes.get(id)};
 const context=vm.createContext({document:{getElementById:node,documentElement:{},querySelectorAll:()=>[],createElement:()=>({append(){}})},window:{addEventListener(){}},fetch,AbortController,TextEncoder,setTimeout,clearTimeout});
 vm.runInContext(source,context);node('token').value='test-user-token';node('model').value='gpt-5.6-sol';
 return {node,send:async text=>{node('prompt').value=text;await node('composer').submit({preventDefault(){}})}};
}
test('multiturn preserves context and model switching, uses bearer without cookies',async()=>{
 const calls=[];const p=setup(async(url,opts)=>{calls.push({url,opts,payload:JSON.parse(opts.body)});return {ok:true,json:async()=>({choices:[{message:{content:'<script>not executed</script>'},finish_reason:'stop'}],usage:{total_tokens:17}})}});
 await p.send('first');p.node('model').value='gpt-6-astra';await p.send('second');
 assert.equal(calls[1].payload.messages.length,3);assert.equal(calls[1].payload.model,'gpt-6-astra');assert.equal(calls[0].opts.credentials,'omit');assert.equal(calls[0].opts.headers.Authorization,'Bearer test-user-token');assert.equal(calls[0].payload.max_completion_tokens,1024);assert.equal(calls[0].payload.max_tokens,undefined);
});
test('permission failures retain draft without adding failed turns to history',async()=>{
 let fail=true;const calls=[];const p=setup(async(url,opts)=>{calls.push(JSON.parse(opts.body));if(fail)return {ok:false,status:403};return {ok:true,json:async()=>({choices:[{message:{content:'ok'}}]})}});
 await p.send('retry me');assert.match(p.node('status').textContent,/403/);assert.equal(p.node('prompt').value,'retry me');assert.equal(p.node('send').disabled,false);
 fail=false;await p.send('retry me');assert.equal(calls[1].messages.length,1);
});
test('stop aborts pending request and restores controls',async()=>{
 const p=setup((url,opts)=>new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(Object.assign(new Error(),{name:'AbortError'})))));
 const pending=p.send('hello');p.node('stop').click();await pending;assert.match(p.node('status').textContent,/扣费/);assert.equal(p.node('send').disabled,false);
});
