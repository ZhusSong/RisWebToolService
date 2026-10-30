const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../web/portal/file-tools.js'),'utf8');
function setup(fetch){
 const nodes=new Map();
 const make=()=>({value:'',files:[],style:{},children:[],classList:{add(){},remove(){}},addEventListener(name,handler){this[name]=handler},setAttribute(){},replaceChildren(){this.children=[]},append(...x){this.children.push(...x)},click(){this.clickHandler?.()}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,make());return nodes.get(id)};
 const window={addEventListener(){}};
 vm.runInNewContext(source,{window,document:{getElementById:get,createElement:make},fetch,Uint8Array,btoa});
 return {get,api:window.fileTools};
}
test('dropped files use cookie auth and token ID without credential storage',async()=>{
 let sent;
 const p=setup(async(url,opts)=>{sent={url,opts};return {ok:true,json:async()=>({user_id:7,text:'完成'})}});
 p.get('composer').drop({preventDefault(){},dataTransfer:{files:[{name:'a.txt',size:2,arrayBuffer:async()=>new Uint8Array([65,66]).buffer}]}});
 await p.api.process({owner:7,tokenId:'4',conversation:'conversation-id',prompt:'分析',messages:[],model:'gpt-5.6-sol'});
 assert.equal(sent.opts.credentials,'same-origin');assert.equal(sent.opts.headers.Authorization,undefined);
 assert.equal(JSON.parse(sent.opts.body).files[0].data,'QUI=');
 assert.equal(JSON.parse(sent.opts.body).conversation,'conversation-id');
});
test('rejects oversized files before fetch and mismatched owner after fetch',async()=>{
 let calls=0;const p=setup(async()=>{calls++;return {ok:true,json:async()=>({user_id:8,text:'secret'})}});
 p.get('composer').drop({preventDefault(){},dataTransfer:{files:[{name:'big.txt',size:6*1024*1024}]}});
 assert.match(p.get('status').textContent,/5 MiB/);assert.equal(calls,0);
 await assert.rejects(p.api.process({owner:7}),/账号/);
});
test('dragging files adds removable attachment chips',()=>{
 const p=setup();
 p.get('composer').drop({preventDefault(){},dataTransfer:{files:[{name:'picture.png',size:10}]}});
 assert.equal(p.api.names()[0].name,'picture.png');
 p.get('attachment-list').children[0].children[0].click();
 assert.equal(p.api.names().length,0);
});
test('explicit text instructions select image or document output',async()=>{
 const requests=[];
 const p=setup(async(url,opts)=>{requests.push(JSON.parse(opts.body));return {ok:true,json:async()=>({user_id:7,text:'完成'})}});
 assert.equal(p.api.active('生成一张图片'),true);
 await p.api.process({owner:7,tokenId:'4',conversation:'c',prompt:'生成一张图片',messages:[],model:'gpt-5.6-sol'});
 assert.equal(requests[0].mode,'image');
 await p.api.process({owner:7,tokenId:'4',conversation:'c',prompt:'生成一份 PDF 文件',messages:[],model:'gpt-5.6-sol'});
 assert.equal(requests[1].format,'pdf');
 assert.equal(p.api.active('分析这份 PDF'),false);
 const detailed='生成一张木质破旧十字架的像素图片，像素大小为128*128像素，命名为Test01';
 assert.equal(p.api.active(detailed),true);
 await p.api.process({owner:7,tokenId:'4',conversation:'c',prompt:detailed,messages:[],model:'gpt-5.6-sol'});
 assert.equal(requests[2].mode,'image');
 assert.equal(p.api.active('继续', 'gpt-image-2.5-flare'),true);
 await p.api.process({owner:7,tokenId:'4',conversation:'c',prompt:'继续',messages:[],model:'gpt-image-2.5-flare'});
 assert.equal(requests[3].mode,'image');
});

test('attached image edit and direct document conversion are inferred from instructions',async()=>{
 const requests=[];
 const p=setup(async(url,opts)=>{requests.push(JSON.parse(opts.body));return {ok:true,json:async()=>({user_id:7,text:'完成'})}});
 const image={name:'Test01.png',size:2,arrayBuffer:async()=>new Uint8Array([1,2]).buffer};
 p.get('composer').drop({preventDefault(){},dataTransfer:{files:[image]}});
 await p.api.process({owner:7,tokenId:'4',conversation:'c',prompt:'将图片背景变为透明',messages:[],model:'gpt-5.6-sol'});
 assert.equal(requests[0].mode,'image');
 const doc={name:'source.docx',size:2,arrayBuffer:async()=>new Uint8Array([1,2]).buffer};
 p.get('composer').drop({preventDefault(){},dataTransfer:{files:[doc]}});
 assert.equal(p.api.direct('直接转换为 PDF 文件'),true);
 await p.api.process({owner:7,tokenId:'',conversation:'c',prompt:'直接转换为 PDF 文件',messages:[],model:'gpt-5.6-sol'});
 assert.equal(requests[1].mode,'convert');assert.equal(requests[1].format,'pdf');
});
