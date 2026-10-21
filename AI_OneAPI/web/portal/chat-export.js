"use strict";
window.chatExport = (() => {
  function build(conversation, format) {
    if (!["md", "json"].includes(format)) throw new Error("请选择 Markdown 或 JSON 格式。");
    if (!Array.isArray(conversation.messages) || !conversation.messages.some(message => message.role === "assistant")) {
      throw new Error("当前会话还没有已保存的回答，暂时无法导出。");
    }
    // Explicit allowlist: never serialize session data, credentials or the entire response.
    const messages = conversation.messages.filter(message => ["user", "assistant"].includes(message.role)).map(message => ({
      role: message.role, content: message.content,
      ...(typeof message.model === "string" ? {model: message.model} : {})
    }));
    const data = {format_version: 1, title: conversation.title, model: conversation.model,
      exported_at: new Date().toISOString(),
      ...(Number.isFinite(conversation.updated) ? {updated_at: new Date(conversation.updated).toISOString()} : {}),
      messages};
    const name = String(conversation.title || "对话").replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, "_").replace(/[. ]+$/g, "").slice(0, 70) || "对话";
    const filename = `RISTOOL-${name}.${format}`;
    if (format === "json") return {filename, type:"application/json;charset=utf-8", text: JSON.stringify(data, null, 2) + "\n"};
    const title = String(data.title).replace(/[\r\n]+/g, " ");
    const blocks = [`# ${title}`, `会话模型：${data.model}`, `导出时间（UTC）：${data.exported_at}`];
    if (data.updated_at) blocks.push(`最后保存时间（UTC）：${data.updated_at}`);
    for (const message of messages) blocks.push(`## ${message.role === "user" ? "用户" : "助手"}${message.model ? ` · ${message.model}` : ""}`, message.content);
    return {filename, type:"text/markdown;charset=utf-8", text:blocks.join("\n\n") + "\n"};
  }
  function download(conversation, format) {
    const file = build(conversation, format);
    const url = URL.createObjectURL(new Blob([file.text], {type:file.type}));
    const link = document.createElement("a");
    link.href = url; link.download = file.filename; link.hidden = true;
    document.body.append(link);
    try { link.click(); } finally {link.remove(); setTimeout(()=>URL.revokeObjectURL(url), 1000);}
    return file.filename;
  }
  return {build, download};
})();
