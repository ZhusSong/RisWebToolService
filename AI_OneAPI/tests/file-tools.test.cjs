const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../web/portal/file-tools.js'),'utf8');
function setup(fetch){
 const nodes=new Map(),revoked=[];
 const make=()=>({value:'',files:[],style:{},children:[],addEventListener(){},replaceChildren(){this.children=[]},append(...x){this.children.push(...x)}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,make());return nodes.get(id)};
 get('work-mode').value='document';get('output-format').value='text';
 const window={addEventListener(){}};
 vm.runInNewContext(source,{window,document:{getElementById:get,createElement:make},fetch,Uint8Array,Blob,atob,btoa,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:url=>revoked.push(url)}});
 return {get,api:window.fileTools,revoked};
}
test('uploads use cookie auth and token ID without credential storage',async()=>{
 let sent;
 const p=setup(async(url,opts)=>{sent={url,opts};return {ok:true,json:async()=>({user_id:7,text:'完成'})}});
 p.get('uploads').files=[{name:'a.txt',size:2,arrayBuffer:async()=>new Uint8Array([65,66]).buffer}];
 await p.api.process({owner:7,tokenId:'4',prompt:'分析',messages:[],model:'gpt-5.6-sol'});
 assert.equal(sent.opts.credentials,'same-origin');assert.equal(sent.opts.headers.Authorization,undefined);
 assert.equal(JSON.parse(sent.opts.body).files[0].data,'QUI=');
});
test('rejects oversized files before fetch and mismatched owner after fetch',async()=>{
 let calls=0;const p=setup(async()=>{calls++;return {ok:true,json:async()=>({user_id:8,text:'secret'})}});
 p.get('uploads').files=[{size:6*1024*1024}];
 await assert.rejects(p.api.process({owner:7}),/5 MiB/);assert.equal(calls,0);
 p.get('uploads').files=[];
 await assert.rejects(p.api.process({owner:7}),/账号/);
});
test('download is local and clears generated binary references',()=>{
 const p=setup();p.api.show({mime:'image/png',name:'result.png',data:'QUI='});
 assert.equal(p.get('file-result').children.length,2);
 assert.equal(p.get('file-result').children[1].download,'result.png');
 p.api.clear();assert.deepEqual(p.revoked,['blob:test']);assert.equal(p.get('file-result').children.length,0);
});
