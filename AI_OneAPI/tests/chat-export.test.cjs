const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const window={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../web/portal/chat-export.js'),'utf8'),{window});
const sample={title:'中文 / 示例',model:'gpt-6-astra',updated:1792600000000,user_id:5,key:'DO_NOT_EXPORT',messages:[{role:'user',content:'你好\n第二行',token:'DO_NOT_EXPORT'},{role:'assistant',content:'```python\nprint("你好")\n```\n完整回答。',model:'gpt-6-astra'}]};
test('JSON preserves complete message content and excludes credential fields',()=>{
 const file=window.chatExport.build(sample,'json');const parsed=JSON.parse(file.text);
 assert.equal(parsed.messages[1].content,sample.messages[1].content);assert.equal(parsed.format_version,1);assert.equal(parsed.messages.length,2);
 assert.ok(!file.text.includes('DO_NOT_EXPORT'));assert.equal(parsed.user_id,undefined);assert.equal(file.text.charCodeAt(0),123);
 assert.ok(!file.filename.includes('/'));assert.ok(file.filename.endsWith('.json'));
});
test('Markdown preserves code fences, Chinese and multiline text',()=>{
 const file=window.chatExport.build(sample,'md');assert.ok(file.text.includes(sample.messages[0].content));assert.ok(file.text.includes(sample.messages[1].content));assert.ok(file.text.includes('## 助手'));assert.ok(file.filename.endsWith('.md'));
});
test('empty answer history and unsupported formats are rejected',()=>{
 assert.throws(()=>window.chatExport.build({...sample,messages:[sample.messages[0]]},'md'),/没有已保存/);
 assert.throws(()=>window.chatExport.build(sample,'html'),/请选择/);
});
test('download creates a local file and releases the temporary URL',()=>{
 const events=[],w={};let timer;
 const link={click(){events.push('click')},remove(){events.push('remove')}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../web/portal/chat-export.js'),'utf8'),{
  window:w,Blob,document:{createElement:()=>link,body:{append(){events.push('append')}}},
  URL:{createObjectURL(blob){assert.equal(blob.type,'application/json;charset=utf-8');return 'blob:test'},revokeObjectURL(url){assert.equal(url,'blob:test');events.push('revoke')}},
  setTimeout(fn){timer=fn}
 });
 const name=w.chatExport.download(sample,'json');
 assert.equal(link.download,name);assert.equal(link.href,'blob:test');timer();
 assert.deepEqual(events,['append','click','remove','revoke']);
});
