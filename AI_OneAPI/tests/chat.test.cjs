const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../web/portal/chat.js'),'utf8');
function setup(fetch, fragment=''){
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',children:[],addEventListener(n,fn){this[n]=fn},replaceChildren(){this.children=[]},append(...x){this.children.push(...x)},click(){this.clickHandler?.()}});return nodes.get(id)};
 const location={hash:fragment,pathname:'/chat/',origin:'https://ai.ristoolweb.com'};
 const context=vm.createContext({document:{getElementById:node,documentElement:{},querySelectorAll:()=>[],createElement:()=>({append(){}})},window:{location,history:{replaceState(a,b,url){location.hash="";location.cleaned=url}},addEventListener(){}},URL,URLSearchParams,fetch,AbortController,TextEncoder,setTimeout,clearTimeout});
 vm.runInContext(source,context);if(!fragment)node('token').value='test-user-token';node('model').value='gpt-5.6-sol';
 return {node,location,send:async text=>{node('prompt').value=text;await node('composer').submit({preventDefault(){}})}};
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

test('One API chat button imports selected token, clears fragment, sends to local endpoint',async()=>{
 let call;const key='sk-example123456789';
 const fragment='/#/?settings='+JSON.stringify({key,url:'https://ai.ristoolweb.com'});
 const p=setup(async(url,opts)=>{call={url,opts};return {ok:true,json:async()=>({choices:[{message:{content:'ok'}}]})}},fragment.slice(1));
 assert.equal(p.node('token').value,key);assert.equal(p.location.hash,'');assert.equal(p.location.cleaned,'/chat/');
 await p.send('hello');assert.equal(call.url,'/v1/chat/completions');assert.equal(call.opts.headers.Authorization,'Bearer '+key);
});
test('invalid or foreign settings never import a token and are removed from URL',()=>{
 for(const settings of [{key:'bad'}, {key:'sk-example123456789',url:'https://external.example'}]){
 const p=setup(()=>{throw Error('unexpected request')},'#/?settings='+encodeURIComponent(JSON.stringify(settings)));
 assert.equal(p.node('token').value,'');assert.equal(p.location.hash,'');assert.match(p.node('status').textContent,/无法载入/);
 }
 const p=setup(()=>{},'#/?settings=not-json');assert.equal(p.node('token').value,'');assert.equal(p.location.hash,'');
});
