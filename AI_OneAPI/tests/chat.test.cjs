const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../web/portal/chat.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(modelFetch, fileTools){
 const nodes=new Map(),calls=[],saved=new Map();let id=0;
 const make=()=>({value:'',children:[],addEventListener(n,fn){this[n]=fn},setAttribute(){},replaceChildren(...x){this.children=x},append(...x){this.children.push(...x)},focus(){}});
 const node=id=>{if(!nodes.has(id))nodes.set(id,make());return nodes.get(id)};
 const fetch=async(url,opts={})=>{
  calls.push({url,opts});
  if(url==='/v1/chat/completions')return modelFetch(url,opts);
  const method=opts.method||'GET',data=opts.body?JSON.parse(opts.body):null,cid=url.split('/')[3];
  let result;
  if(method==='GET')result=cid?saved.get(cid):{items:[...saved.values()]};
  else if(method==='POST'){const key=String(++id);result={...data,id:key,revision:1};saved.set(key,result);}
  else if(method==='PUT'){result={...data,revision:data.revision+1};saved.set(cid,result);}
  else{saved.delete(cid);result={};}
  return {ok:true,json:async()=>({...result,user_id:1})};
 };
 node('token').value='token-id';node('model').value='gpt-5.6-sol';
 const context=vm.createContext({document:{getElementById:node,querySelectorAll:()=>[],createElement:make,body:{classList:{add(){},toggle(){return false}}}},window:{fileTools,tokenPicker:{preselect(){},load(){},setBusy(){},clear(){},async resolve(){return 'test-key'}},location:{hash:''},matchMedia:()=>({matches:false}),addEventListener(){},confirm:()=>true,prompt:()=>null},fetch,AbortController,AbortSignal,TextEncoder,setTimeout,clearTimeout});
 vm.runInContext(source,context);await tick();
 return {node,calls,saved,send:async text=>{node('prompt').value=text;node('composer').submit({preventDefault(){}});await tick();await tick();}};
}
test('persists full messages and restores prior conversation from sidebar',async()=>{
 const p=await setup(async()=>({ok:true,json:async()=>({choices:[{message:{content:'hello'},finish_reason:'stop'}]})}));
 await p.send('first');assert.equal(p.saved.get('1').messages.length,2);
 p.node('clear').click();await tick();assert.equal(p.node('conversation').children.length,0);
 p.node('sessions').children[0].click();await tick();assert.equal(p.node('conversation').children.length,2);
 p.node('model').value='gpt-6-astra';await p.send('second');
 const request=p.calls.filter(c=>c.url==='/v1/chat/completions').at(-1);
 assert.equal(JSON.parse(request.opts.body).messages.length,3);assert.equal(request.opts.credentials,'omit');assert.equal(p.saved.get('1').messages.length,4);
});
test('failed generation persists question and retry does not duplicate it',async()=>{
 let fail=true;const p=await setup(async()=>fail?{ok:false,status:403}:{ok:true,json:async()=>({choices:[{message:{content:'ok'}}]})});
 await p.send('question');assert.equal(p.saved.get('1').messages.length,1);assert.equal(p.node('prompt').value,'question');
 fail=false;await p.send('question');assert.equal(p.saved.get('1').messages.length,2);
});
test('stop preserves unanswered question and unlocks interface',async()=>{
 const p=await setup((url,opts)=>new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(Object.assign(new Error(),{name:'AbortError'})))));
 await p.send('question');p.node('stop').click();await tick();assert.equal(p.node('send').disabled,false);assert.equal(p.saved.get('1').messages.length,1);assert.match(p.node('status').textContent,/扣费/);
});
test('file processing saves only text and does not issue a duplicate model request',async()=>{
 let shown=false;
 const fileTools={busy(){},clearResult(){},clear(){},active:()=>true,async process(){return {text:'文件总结',artifact:{data:'BINARY_PRIVATE'}}},show(){shown=true}};
 const p=await setup(()=>{throw new Error('duplicate paid request')},fileTools);
 await p.send('分析附件');
 assert.equal(p.saved.get('1').messages[1].content,'文件总结');
 assert.ok(!JSON.stringify([...p.saved.values()]).includes('BINARY_PRIVATE'));
 assert.equal(p.calls.filter(call=>call.url==='/v1/chat/completions').length,0);
 assert.equal(shown,true);
});
test('direct conversion works without a model token',async()=>{
 const fileTools={busy(){},clearResult(){},clear(){},active:()=>true,direct:()=>true,async process(){return {text:'Converted locally'}},show(){}};
 const p=await setup(()=>{throw new Error('unexpected model call')},fileTools);
 p.node('token').value='';
 await p.send('Convert this file');
 assert.equal(p.saved.get('1').messages[1].content,'Converted locally');
 assert.equal(p.calls.filter(call=>call.url==='/v1/chat/completions').length,0);
});
