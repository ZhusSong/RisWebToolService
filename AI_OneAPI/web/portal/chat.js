"use strict";
const $ = id => document.getElementById(id);
const base = "/history-api/conversations";
let current = null, items = [], owner = null, controller = null, locked = false, unsaved = false;
function status(message) { $("status").textContent = message; }
function lock(value) {
  locked = value;
  for (const id of ["send","clear","model","prompt","rename","delete-chat","reload-history","retry-save"]) $(id).disabled = value;
  window.tokenPicker.setBusy(value);
  window.fileTools?.busy(value);
  $("stop").disabled = !controller;
  $("export-chat").disabled = value || !current?.id;
  $("export-format").disabled = value;
}
async function api(path = "", method = "GET", data) {
  const response = await fetch(base + path, {method,credentials:"same-origin",cache:"no-store",redirect:"error",headers:{"Content-Type":"application/json",...(owner === null ? {} : {"X-History-User":String(owner)})},body:data ? JSON.stringify(data) : undefined,signal:AbortSignal.timeout(20000)});
  const body = await response.json();
  if (!response.ok) {
    if (response.status === 401) {owner = null; current = null; items = []; window.tokenPicker.clear(); window.fileTools?.clear(); render();}
    throw new Error(body.error || `记录服务错误 (${response.status})`);
  }
  if (owner !== null && owner !== body.user_id) {
    owner = null; current = null; items = []; window.tokenPicker.clear(); window.fileTools?.clear(); render();
    throw new Error("登录账号已改变，请刷新页面。");
  }
  owner = body.user_id;
  return body;
}
function renderList() {
  $("sessions").replaceChildren();
  const query = $("search").value.trim().toLowerCase();
  for (const item of items.filter(item=>item.title.toLowerCase().includes(query))) {
    const button = document.createElement("button");
    button.className = "session" + (item.id === current?.id ? " active" : "");
    button.textContent = item.title; button.title = item.title;
    button.setAttribute("aria-current", item.id === current?.id ? "true" : "false");
    button.addEventListener("click",()=>run(async()=>{ if (!canLeave()) return; current = await api("/" + item.id); window.fileTools?.clear(); unsaved = false; $("model").value = current.model; const last=current.messages.at(-1); $("prompt").value = last?.role === "user" ? last.content : ""; render();status(last?.role === "user" ? "上次请求未保存回答，可能已扣费；重新发送会再次请求模型，附件须重新上传。" : ""); }));
    $("sessions").append(button);
  }
}
function render() {
  $("export-chat").disabled = locked || !current?.id;
  $("retry-save").hidden = !unsaved;
  renderList(); $("conversation").replaceChildren();
  const messages = current?.messages || [];
  $("welcome").hidden = messages.length > 0;
  for (const message of messages) {
    const article = document.createElement("article"), label = document.createElement("strong"), body = document.createElement("div");
    article.className = "message " + message.role;
    label.textContent = message.role === "user" ? "你" : `RISTOOL AI · ${message.model || current.model}`;
    body.className = "message-content";
    // Only fenced code is formatted. All model output stays text, never HTML.
    message.content.split(/(```[\s\S]*?```)/g).forEach(part=>{
      const node = document.createElement(part.startsWith("```") ? "pre" : "span");
      node.textContent = part.startsWith("```") ? part.slice(3,-3).replace(/^[^\n]*\n/, "") : part;
      body.append(node);
    });
    article.append(label,body); $("conversation").append(article);
  }
}
function canLeave() { return !unsaved || window.confirm("有尚未保存的回答，离开将丢失这些改动。确定继续？"); }
async function refresh() {
  const data = await api(); items = data.items; renderList();
  $("history-status").textContent = items.length ? `${items.length} 个会话 · 已保存至账号` : "还没有记录，开始你的第一段对话。";
}
async function save() {
  const result = await api(current.id ? "/" + current.id : "", current.id ? "PUT" : "POST", current);
  current.id = result.id; current.revision = result.revision; unsaved = false;
  $("retry-save").hidden = true;
  await refresh();
}
async function run(action) {
  if (locked) return;
  lock(true);
  try { await action(); } catch(error) {status(error.message);} finally {$("retry-save").hidden=!unsaved;lock(false);}
}
$("retry-save").addEventListener("click",()=>run(async()=>{if(current){await save();status("已保存至账号。");}}));
$("export-chat").addEventListener("click",()=>run(async()=>{
  if (!current?.id) throw new Error("请先选择一段已保存的对话。");
  if (unsaved) throw new Error("当前有尚未保存的改动，请先点击“重试保存”再导出。");
  const format = $("export-format").value;
  // Re-fetch through the authenticated API: export the saved version, not a stale page copy.
  const saved = await api("/" + current.id);
  const filename = window.chatExport.download(saved, format);
  status(`已发起下载：${filename}。包含该会话的完整已保存问答。`);
}));
$("clear").addEventListener("click",()=>run(async()=>{if(!canLeave())return;window.fileTools?.clear();current = null; unsaved = false;$("prompt").value="";$("usage").textContent="";status("");render();}));
$("reload-history").addEventListener("click",()=>run(refresh));
$("search").addEventListener("input",renderList);
$("rename").addEventListener("click",()=>run(async()=>{
  if(!current) return;
  const title = window.prompt("对话名称（最多 100 字）",current.title)?.trim();
  if(!title)return;if(title.length>100)throw new Error("标题最多 100 字。");
  current.title=title;unsaved=true;await save();render();
}));
$("delete-chat").addEventListener("click",()=>run(async()=>{
  if(!current?.id || !window.confirm("删除这段对话及全部消息？此操作无法撤销。"))return;
  await api("/"+current.id,"DELETE",{revision:current.revision}); current=null;unsaved=false;await refresh();render();status("对话已删除。");
}));
$("toggle-sidebar").addEventListener("click",()=>{
  const hidden=document.body.classList.toggle("sidebar-hidden");$("toggle-sidebar").setAttribute("aria-expanded",String(!hidden));
});
if(window.matchMedia("(max-width:760px)").matches){document.body.classList.add("sidebar-hidden");$("toggle-sidebar").setAttribute("aria-expanded","false");}
document.querySelectorAll("[data-prompt]").forEach(button=>button.addEventListener("click",()=>{$("prompt").value=button.dataset.prompt;$("prompt").focus();}));
$("prompt").addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.isComposing){event.preventDefault();$("composer").requestSubmit();}});
$("stop").addEventListener("click",()=>controller?.abort());
window.addEventListener("beforeunload",event=>{if(unsaved){event.preventDefault();event.returnValue="";}});
window.addEventListener("pagehide",()=>{controller?.abort();window.tokenPicker.clear();current=null;items=[];owner=null;});
$("composer").addEventListener("submit",event=>{
  event.preventDefault();run(async()=>{
    const content=$("prompt").value.trim(),tokenId=$("token").value,model=$("model").value;
    if(!content||!tokenId)throw new Error("请在聊天设置中选择令牌，并填写消息。");
    await refresh();
    window.fileTools?.clearResult();
    const stored=current?.messages || [];
    const before=stored.at(-1)?.role === "user" ? stored.slice(0,-1) : stored;
    const messages=[...before.map(({role,content})=>({role,content})),{role:"user",content}];
    const payload=JSON.stringify({model,messages,max_completion_tokens:1024,stream:false});
    if(messages.length>81 || new TextEncoder().encode(payload).length>120000)throw new Error("本次上下文过长，请新建对话；已有记录仍会保留。");
    current ||= {title:content.slice(0,40),model,messages:[]};
    current.model=model;
    current.messages=messages;
    unsaved=true;
    // Persist the question before the paid request, allowing recovery after interruption.
    await save();
    render();
    controller=new AbortController();const timer=setTimeout(()=>controller.abort(),180000);$("stop").disabled=false;
    status("正在生成回答…");
    try {
      if (window.fileTools?.active()) {
        clearTimeout(timer);
        const fileTimer = setTimeout(()=>controller.abort(),240000);
        try {
          status("正在处理附件 / 生成文件…请保持页面打开。");
          const result = await window.fileTools.process({owner,tokenId,prompt:content,messages:before.map(({role,content})=>({role,content})),model,signal:controller.signal});
          // Persist only visible text. Never save uploads, extracted source text or output bytes.
          current.messages.push({role:"assistant",content:result.text,model});unsaved=true;
          $("prompt").value="";render();
          window.fileTools.show(result.artifact);
          try {await save();status(result.warning || "文字记录已保存。文件请及时点击下载，刷新后不保留。");}
          catch(error){status(`结果已生成但文字保存失败：${error.message} 请重试保存，并及时下载文件。`);}
        } finally {clearTimeout(fileTimer);}
        return;
      }
      const token=await window.tokenPicker.resolve(tokenId,controller.signal);
      const response=await fetch("/v1/chat/completions",{method:"POST",credentials:"omit",cache:"no-store",redirect:"error",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:payload,signal:controller.signal});
      if(!response.ok)throw new Error(`请求失败 (${response.status})，请检查令牌额度、模型权限或稍后重试。`);
      const result=await response.json(),choice=result.choices?.[0];
      if(typeof choice?.message?.content!=="string"||!choice.message.content.trim())throw new Error("模型未返回有效文本。");
      current.messages.push({role:"assistant",content:choice.message.content,model:result.model||model});unsaved=true;
      $("prompt").value="";render();$("scroll-area").scrollTop=$("scroll-area").scrollHeight;
      $("usage").textContent=result.usage ? `本次用量：${result.usage.total_tokens ?? "—"} tokens` : "";
      try {await save();status(choice.finish_reason==="length"?"回答达到输出上限，记录已保存。":"已保存至账号。");}
      catch(error){status(`回答已生成但保存失败：${error.message} 请勿关闭页面，点击“重试保存”。`);}
    } catch(error){status(error.name==="AbortError"?"已停止等待。上游可能继续处理并扣费；草稿可重试。":error.message);}
    finally{clearTimeout(timer);controller=null;$("stop").disabled=true;}
  });
});
try {
  const fragment=window.location.hash;
  if(fragment){window.history.replaceState(null,"",window.location.pathname);const raw=new URLSearchParams(fragment.replace(/^#\/?\??/,"")).get("settings");if(raw){const settings=JSON.parse(raw);if(settings.url&&new URL(settings.url).origin!==window.location.origin)throw new Error();if(!/^sk-[A-Za-z0-9_-]{10,256}$/.test(settings.key))throw new Error();window.tokenPicker.preselect(settings.key);}}
}catch{status("无法导入令牌，请从聊天设置中选择。");}
window.tokenPicker.load(true);render();run(refresh);
