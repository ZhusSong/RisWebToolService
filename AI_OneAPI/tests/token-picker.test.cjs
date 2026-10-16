const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../web/portal/token-picker.js'),'utf8');
function setup(fetch){const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',children:[],addEventListener(n,fn){this[n]=fn},replaceChildren(...x){this.children=x},append(x){this.children.push(x)}});return nodes.get(id)};const window={};vm.runInNewContext(source,{window,document:{getElementById:node,createElement:()=>({})},fetch,AbortController,setTimeout,clearTimeout});return {picker:window.tokenPicker,node};}
const token=(id,extra={})=>({id,name:'token'+id,key:'example123456'+id,status:1,expired_time:-1,remain_quota:10,...extra});
test('paginates own session tokens and preselects imported key without putting keys in options',async()=>{
 const calls=[];const p=setup(async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>({success:true,data:url.endsWith('p=0')?[token(1)]:url.endsWith('p=1')?[token(2)]:[]})}});
 p.picker.preselect('sk-example1234562');await p.picker.load(true);await p.picker.load();assert.equal(p.node('token').value,'2');assert.equal(calls[0].opts.credentials,'same-origin');assert.equal(calls[1].url,'/api/token/?p=1');assert.ok(!JSON.stringify(p.node('token').children).includes('example123456'));await p.picker.load();assert.equal(p.node('more-tokens').disabled,true);
});
test('marks expired, disabled and exhausted tokens unavailable',async()=>{
 const p=setup(async()=>({ok:true,json:async()=>({success:true,data:[token(1,{status:2}),token(2,{expired_time:1}),token(3,{remain_quota:0})]})}));await p.picker.load(true);assert.ok(p.node('token').children.slice(1).every(x=>x.disabled));
});
test('rechecks ownership before send and fails closed when session changes',async()=>{
 let denied=false;const p=setup(async(url)=>({ok:true,json:async()=>url.includes('?')?{success:true,data:[token(1)]}:denied?{success:false}:{success:true,data:token(1)}}));await p.picker.load(true);assert.equal(await p.picker.resolve('1'),'sk-example1234561');denied=true;await assert.rejects(()=>p.picker.resolve('1'));await assert.rejects(()=>p.picker.resolve('99'));
});
test('unauthenticated list clears selection and disables pagination',async()=>{
 const p=setup(async()=>({ok:false,status:401}));await p.picker.load(true);assert.equal(p.node('token').value,'');assert.equal(p.node('more-tokens').disabled,true);assert.match(p.node('token-status').textContent,/登录/);
});
