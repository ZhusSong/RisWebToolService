"use strict";
window.tokenPicker = (() => {
  const select = document.getElementById("token"), status = document.getElementById("token-status");
  const refresh = document.getElementById("refresh-tokens"), more = document.getElementById("more-tokens");
  let page = 0, ended = false, loading = false, busy = false, preferred = "", generation = 0;
  const ids = new Set();
  let onSelection = () => {};
  const keyOf = token => typeof token.key === "string" ? (token.key.startsWith("sk-") ? token.key : `sk-${token.key}`) : "";
  function reason(token) {
    if (token.status !== 1) return "不可用";
    if (token.expired_time !== -1 && token.expired_time <= Date.now()/1000) return "已过期";
    if (!token.unlimited_quota && token.remain_quota <= 0) return "额度用尽";
    return "";
  }
  function controls() { select.disabled = busy || loading; refresh.disabled = busy || loading; more.disabled = busy || loading || ended; }
  function reset() {
    const option = document.createElement("option"); option.value = ""; option.textContent = "请选择自己的令牌";
    select.replaceChildren(option); select.value = ""; ids.clear(); page = 0; ended = false;
  }
  async function get(url, signal) {
    const response = await fetch(url, {credentials:"same-origin",cache:"no-store",redirect:"error",signal});
    if (!response.ok) throw new Error("无法读取令牌，请重新登录后台后刷新。");
    const body = await response.json();
    if (body.success !== true) throw new Error("登录已失效或无权读取令牌，请重新登录后台。");
    return body.data;
  }
  async function load(restart = false) {
    if (busy || loading) return;
    if (restart) { generation++; reset(); }
    if (ended) return;
    const version = generation; loading = true; controls(); status.textContent = "正在读取我的令牌…";
    const controller = new AbortController(), timer = setTimeout(()=>controller.abort(),15000);
    try {
      const rows = await get(`/api/token/?p=${page}`, controller.signal);
      if (version !== generation) return;
      if (!Array.isArray(rows)) throw new Error("令牌列表格式异常。");
      let added = 0;
      for (const token of rows) {
        const id = String(token.id);
        if (!Number.isInteger(token.id) || ids.has(id)) continue;
        ids.add(id); added++;
        const option = document.createElement("option"), unavailable = reason(token);
        option.value = id; option.disabled = !!unavailable;
        option.textContent = `${token.name || "未命名"} (#${id})${unavailable ? ` · ${unavailable}` : ""}`;
        select.append(option);
        if (preferred && keyOf(token) === preferred && !unavailable) { select.value = id; preferred = ""; }
      }
      ended = rows.length === 0 || added === 0; page++;
      status.textContent = ids.size ? (preferred ? "尚未找到所选令牌，可加载更多或另选令牌。" : `已加载 ${ids.size} 条令牌；未找到时点击加载更多。`) : "暂无令牌，请先在管理我的令牌中创建。";
      onSelection(select.value);
    } catch { if (version === generation) { reset(); ended = true; preferred = ""; status.textContent = "无法读取令牌。请确认已登录后台，然后点击刷新令牌。"; } }
    finally {clearTimeout(timer); loading = false; controls();}
  }
  select.addEventListener("change",()=>{preferred = "";onSelection(select.value);});
  refresh.addEventListener("click",()=>load(true)); more.addEventListener("click",()=>load());
  return {
    load,
    preselect(key) {preferred = key;},
    onSelection(callback) {onSelection = callback;},
    setBusy(value) {busy = value; controls();},
    clear() {generation++; preferred = ""; reset();},
    async resolve(id, signal) {
      if (!ids.has(id)) throw new Error("请从自己的令牌列表选择令牌。");
      // Re-read with the current session before every send: do not reuse another login's cached key.
      const token = await get(`/api/token/${encodeURIComponent(id)}`, signal);
      if (!token || String(token.id) !== id || reason(token) || !keyOf(token)) throw new Error("所选令牌不可用，请刷新列表检查状态与额度。");
      return keyOf(token);
    },
    async models(id, signal) {
      const key = await this.resolve(id, signal);
      const response = await fetch('/v1/models', {credentials:'omit',cache:'no-store',redirect:'error',signal,
        headers:{Authorization:`Bearer ${key}`}});
      if (!response.ok) throw new Error('无法读取此令牌可用的模型，请检查令牌权限。');
      const body = await response.json();
      if (!Array.isArray(body.data)) throw new Error('模型列表格式异常。');
      return [...new Set(body.data.map(item=>item?.id).filter(id=>typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(id)))].sort();
    }
  };
})();
