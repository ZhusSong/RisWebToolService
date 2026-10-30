"use strict";
window.fileTools = (() => {
  const $ = id => document.getElementById(id);
  const selected = [];
  const limit = {count:4, individual:5*1024*1024, total:8*1024*1024};
  function render() {
    const list = $("attachment-list");
    list.replaceChildren();
    for (const [index, file] of selected.entries()) {
      const chip = document.createElement("span");
      chip.className = "attachment-chip";
      chip.textContent = `${file.name} (${Math.ceil(file.size / 1024)} KiB) `;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `移除 ${file.name}`);
      remove.addEventListener("click", () => { selected.splice(index, 1); render(); });
      chip.append(remove);
      list.append(chip);
    }
  }
  function add(files) {
    const incoming = Array.from(files || []);
    if (!incoming.length) return;
    const all = [...selected, ...incoming];
    if (all.length > limit.count || all.some(file => !file.size || file.size > limit.individual) || all.reduce((sum, file) => sum + file.size, 0) > limit.total) {
      throw new Error("最多 4 个文件，单个最大 5 MiB，总计 8 MiB，且文件不能为空。");
    }
    selected.push(...incoming);
    render();
  }
  function clear() { selected.length = 0; $("uploads").value = ""; render(); }
  $("attach-button").addEventListener("click", () => $("uploads").click());
  $("uploads").addEventListener("change", event => {
    try { add(event.target.files); $("status").textContent = ""; }
    catch (error) { $("status").textContent = error.message; }
    event.target.value = "";
  });
  const composer = $("composer");
  let dragDepth = 0;
  composer.addEventListener("dragenter", event => { if (event.dataTransfer?.types?.includes("Files")) { event.preventDefault(); dragDepth++; composer.classList.add("drag-over"); } });
  composer.addEventListener("dragover", event => { if (event.dataTransfer?.types?.includes("Files")) event.preventDefault(); });
  composer.addEventListener("dragleave", () => { if (--dragDepth <= 0) { dragDepth = 0; composer.classList.remove("drag-over"); } });
  composer.addEventListener("drop", event => {
    event.preventDefault(); dragDepth = 0; composer.classList.remove("drag-over");
    try { add(event.dataTransfer?.files); $("status").textContent = ""; }
    catch (error) { $("status").textContent = error.message; }
  });
  $("prompt").addEventListener("paste", event => {
    const files = Array.from(event.clipboardData?.files || []);
    if (files.length) {
      event.preventDefault();
      try { add(files); $("status").textContent = ""; }
      catch (error) { $("status").textContent = error.message; }
    }
  });
  function task(prompt = "") {
    const mode = $("work-mode").value;
    const format = $("output-format").value;
    if (mode !== "document" || format !== "text") return {mode, format};
    if (/(生成|制作|创建|绘制|画|编辑|修改).{0,120}(图片|图像|插画|海报)|(?:图片|图像).{0,20}(编辑|修改)/i.test(prompt)) return {mode:"image", format:"text"};
    const match = prompt.match(/(?:生成|制作|创建|导出|输出|转换为|保存为).{0,12}?(PDF|DOCX|XLSX|PPTX|CSV|JSON|TXT|MD|ZIP)(?:文件|文档|表格|幻灯片)?/i);
    return {mode, format:match ? match[1].toLowerCase() : format};
  }
  return {
    clear,
    names() { return selected.map(file => ({name:file.name})); },
    direct() { return $("work-mode").value === "convert"; },
    active(prompt = "") { const {mode,format} = task(prompt); return selected.length > 0 || mode !== "document" || format !== "text"; },
    busy(value) { for (const id of ["uploads", "work-mode", "output-format", "attach-button"]) $(id).disabled = value; },
    async process({owner, tokenId, conversation, prompt, messages, model, signal}) {
      const {mode, format} = task(prompt);
      const files = [];
      for (const file of selected) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let raw = "";
        for (let i = 0; i < bytes.length; i += 8192) raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
        files.push({name:file.name,data:btoa(raw)});
      }
      const response = await fetch("/files-api/process", {method:"POST",credentials:"same-origin",cache:"no-store",redirect:"error",signal,
        headers:{"Content-Type":"application/json","X-History-User":String(owner)},
        body:JSON.stringify({token_id:tokenId,conversation,prompt,messages,model,files,mode,format})});
      let result;
      try { result = await response.json(); } catch { throw new Error("文件服务未返回有效数据，请管理员检查部署；请求可能已产生费用。"); }
      if (!response.ok) throw new Error(result.error || `文件服务错误 (${response.status})`);
      if (result.user_id !== owner || typeof result.text !== "string") throw new Error("账号或返回数据不匹配，请重新登录。");
      clear();
      return result;
    }
  };
})();
