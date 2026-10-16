"use strict";
const translations = {
  "zh-CN": {language:"语言",title:"AI 聊天",intro:"使用你自己的 One API 令牌进行连续对话。",token:"我的令牌",tokens:"管理我的令牌 ↗",model:"模型",clear:"新对话",forget:"取消选择并清空",privacy:"从当前登录账号读取令牌，密钥与对话不保存到浏览器存储。发送时，整段会话会提交本站及上游模型并消耗额度；切换模型会继续使用当前上下文。单次最多输出 1024 tokens，暂不支持文件和图片。",prompt:"消息",send:"发送",stop:"停止等待",user:"你",assistant:"助手",waiting:"正在生成完整回答…",ready:"可以开始对话。",missing:"请选择可用令牌并填写消息。",large:"会话过长，请开始新对话。",failed:"请求失败",auth:"请检查用户令牌是否有效、启用且未过期。",quota:"请检查用户额度、令牌额度和模型权限。",rate:"请求过于频繁，请稍后重试。",stopped:"已停止等待或请求超时。服务器可能继续处理并扣费。",invalid:"未收到有效文本回答，请检查网关响应。",usage:"本次用量",input:"输入",output:"输出",total:"合计",truncated:"回答已达到输出上限，可能不完整。",done:"回答完成。"},

};
const $ = id => document.getElementById(id);
let language = "zh-CN", history = [], controller = null, state = "ready", lastUsage = null;
const t = key => translations[language][key];
// One API v0.6.10 appends /#/?settings={"key":"sk-...","url":"..."}.
// Never use the supplied endpoint; all requests stay on this origin.
function importToken() {
  const fragment = window.location.hash;
  if (!fragment) return;
  try {
    window.history.replaceState(null, "", window.location.pathname);
    const raw = new URLSearchParams(fragment.replace(/^#\/?\??/, "")).get("settings");
    if (!raw) return;
    const settings = JSON.parse(raw);
    if (settings.url && new URL(settings.url).origin !== window.location.origin) throw new Error();
    if (typeof settings.key !== "string" || !/^sk-[A-Za-z0-9_-]{10,256}$/.test(settings.key)) throw new Error();
    window.tokenPicker.preselect(settings.key);
    state = "已自动载入所选令牌，本次聊天将使用该令牌的权限与额度。";
  } catch {
    state = "无法载入聊天令牌，请从本站令牌列表重新点击聊天，或刷新令牌列表。";
  }
}
function render() {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
  $("status").textContent = t(state) || state;
  $("usage").textContent = lastUsage ? `${t("usage")}: ${t("input")} ${lastUsage.prompt_tokens ?? "—"} · ${t("output")} ${lastUsage.completion_tokens ?? "—"} · ${t("total")} ${lastUsage.total_tokens ?? "—"}` : "";
  $("conversation").replaceChildren();
  for (const message of history) {
    const article = document.createElement("article"), label = document.createElement("strong"), body = document.createElement("div");
    article.className = `message ${message.role}`;
    label.textContent = `${t(message.role === "user" ? "user" : "assistant")}${message.model ? ` · ${message.model}` : ""}`;
    body.textContent = message.content; article.append(label, body); $("conversation").append(article);
  }
}
function busy(active) {
  for (const id of ["send","clear","forget","model","token","prompt","refresh-tokens","more-tokens"]) $(id).disabled = active;
  $("stop").disabled = !active;
  window.tokenPicker.setBusy(active);
}

$("clear").addEventListener("click", () => {history = []; lastUsage = null; state = "ready"; $("prompt").value = ""; render();});
$("forget").addEventListener("click", () => {$("token").value = ""; $("clear").click();});
$("stop").addEventListener("click", () => controller?.abort());
window.addEventListener("pagehide", () => {controller?.abort(); window.tokenPicker.clear(); $("token").value = ""; history = []; $("prompt").value = ""; lastUsage = null; state = "ready"; render();});
$("composer").addEventListener("submit", async event => {
  event.preventDefault(); if (controller) return;
  const tokenId = $("token").value, content = $("prompt").value.trim(), model = $("model").value;
  if (!tokenId || !content) {state = "missing"; render(); return;}
  const messages = [...history.map(({role,content}) => ({role,content})), {role:"user",content}];
  const payload = JSON.stringify({model,messages,max_completion_tokens:1024,stream:false});
  if (messages.length > 81 || new TextEncoder().encode(payload).length > 120000) {state = "large"; render(); return;}
  controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 180000);
  busy(true); state = "waiting"; lastUsage = null; render();
  try {
    const token = await window.tokenPicker.resolve(tokenId, controller.signal);
    const response = await fetch("/v1/chat/completions", {method:"POST",credentials:"omit",cache:"no-store",redirect:"error",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:payload,signal:controller.signal});
    if (!response.ok) {
      const hint = response.status === 401 ? "auth" : response.status === 403 ? "quota" : response.status === 429 ? "rate" : "failed";
      throw new Error(`${t("failed")} (HTTP ${response.status}). ${t(hint)}`);
    }
    const result = await response.json(), choice = result.choices?.[0];
    if (typeof choice?.message?.content !== "string" || !choice.message.content.trim()) throw new Error(t("invalid"));
    history.push({role:"user",content}, {role:"assistant",content:choice.message.content,model:result.model || model});
    lastUsage = result.usage; $("prompt").value = ""; state = choice.finish_reason === "length" ? "truncated" : "done";
  } catch (error) {state = error.name === "AbortError" ? "stopped" : `${t("failed")}: ${error.message}`;}
  finally {clearTimeout(timeout); controller = null; busy(false); render();}
});
importToken();
window.tokenPicker.load(true);
render();
