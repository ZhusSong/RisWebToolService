"use strict";
window.fileTools = (() => {
  const $ = id => document.getElementById(id);
  let url = null;
  $("scroll-area").append($("file-result"));
  function clearResult() {
    if (url) URL.revokeObjectURL(url);
    url = null;
    $("file-result").replaceChildren();
  }
  function clear() { clearResult(); $("uploads").value = ""; }
  function show(artifact) {
    clearResult();
    if (!artifact) return;
    const bytes = Uint8Array.from(atob(artifact.data), char => char.charCodeAt(0));
    url = URL.createObjectURL(new Blob([bytes], {type: artifact.mime}));
    if (artifact.mime === "image/png") {
      const image = document.createElement("img");
      image.src = url; image.alt = "本次生成的图片";
      image.style.maxWidth = "100%"; image.style.maxHeight = "300px";
      $("file-result").append(image);
    }
    const link = document.createElement("a");
    link.href = url; link.download = artifact.name;
    link.textContent = `下载 ${artifact.name}（刷新或切换对话后不保留）`;
    link.style.display = "block";
    $("file-result").append(link);
  }
  $("remove-uploads").addEventListener("click", clear);
  window.addEventListener("pagehide", clear);
  return {
    clear, clearResult, show,
    active() { return $("uploads").files.length > 0 || $("work-mode").value === "image" || $("output-format").value !== "text"; },
    busy(value) { for (const id of ["uploads", "work-mode", "output-format", "remove-uploads"]) $(id).disabled = value; },
    async process({owner, tokenId, prompt, messages, model, signal}) {
      const selected = Array.from($("uploads").files);
      if (selected.length > 4 || selected.some(file => file.size > 5*1024*1024) || selected.reduce((sum,file)=>sum+file.size,0) > 8*1024*1024) throw new Error("最多 4 个文件，单个最大 5 MiB，总计 8 MiB。");
      const files = [];
      for (const file of selected) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let raw = "";
        for (let i=0;i<bytes.length;i+=8192) raw += String.fromCharCode(...bytes.subarray(i,i+8192));
        files.push({name:file.name,data:btoa(raw)});
      }
      const response = await fetch("/files-api/process", {method:"POST",credentials:"same-origin",cache:"no-store",redirect:"error",signal,
        headers:{"Content-Type":"application/json","X-History-User":String(owner)},
        body:JSON.stringify({token_id:tokenId,prompt,messages,model,files,mode:$("work-mode").value,format:$("output-format").value})});
      let result;
      try { result = await response.json(); } catch { throw new Error("文件服务未返回有效数据，请管理员检查部署；请求可能已产生费用。"); }
      if (!response.ok) throw new Error(result.error || `文件服务错误 (${response.status})`);
      if (result.user_id !== owner || typeof result.text !== "string") throw new Error("账号或返回数据不匹配，请重新登录。");
      $("uploads").value = "";
      return result;
    }
  };
})();
