"use strict";
const messages = {
  "zh-CN": {language:"语言",eyebrow:"私人 AI 工作空间 · 基础阶段",title:"一个入口，管理你的 AI 使用。",intro:"为受邀成员提供独立账号、访问令牌与额度管理。先建立可靠的基础，再逐步开放创作工具。",login:"登录管理后台 →",service:"网关状态",statusNote:"在线状态仅表示网关响应，不代表模型已配置或额度可用。",refresh:"重新检查",account:"独立账号",accountText:"由管理员邀请并创建账号。每位成员使用自己的身份，避免共享密钥。",quota:"额度与令牌",quotaText:"登录后台查看实际余额与使用记录。额度由管理员分配，不在入口页展示模拟数字。",future:"接下来",futureText:"中文网页聊天已接入，可使用用户令牌连续对话。本机文件分析和图片生成尚未接入。",noticeTitle:"使用前了解",notice:"此入口不收集 API 密钥。上游密钥仅由管理员在后台配置。可使用的模型和额度以后台实际设置为准。",footer:"独立部署 · 按用户授权",checking:"正在检查…",online:"网关已连接",offline:"暂时无法连接"},
  ja: {language:"言語",eyebrow:"プライベート AI ワークスペース · 初期段階",title:"AI の利用を、ひとつの入口から。",intro:"招待されたメンバーごとにアカウント、トークン、利用枠を管理します。まず基盤を整え、制作ツールを順次追加します。",login:"管理画面にログイン →",service:"ゲートウェイの状態",statusNote:"接続状態はモデルの設定や利用枠の有無を保証するものではありません。",refresh:"再確認",account:"個別アカウント",accountText:"管理者がメンバーを招待し、アカウントを作成します。キーを共有せず、自分のアカウントを使ってください。",quota:"利用枠とトークン",quotaText:"実際の残高と利用履歴は管理画面で確認できます。このページに仮の残高は表示しません。",future:"今後の機能",futureText:"中国語のチャットを利用できます。ファイル分析と画像生成は未実装です。",noticeTitle:"ご利用前に",notice:"この入口では API キーを収集しません。上流サービスのキーは管理者のみが設定します。利用可能なモデルと利用枠は管理画面の設定に従います。",footer:"独立した環境 · ユーザー別の権限",checking:"確認中…",online:"接続できました",offline:"現在接続できません"},
  en: {language:"Language",eyebrow:"PRIVATE AI WORKSPACE · FOUNDATION",title:"One place to manage your AI access.",intro:"Individual accounts, access tokens and quotas for invited members. A dependable foundation, with creative tools to follow.",login:"Sign in to the console →",service:"Gateway status",statusNote:"A connection does not confirm model configuration or available quota.",refresh:"Check again",account:"Individual accounts",accountText:"An administrator invites members and creates accounts. Use your own identity instead of sharing keys.",quota:"Quotas and tokens",quotaText:"Check your actual balance and usage in the console. This page never displays simulated balances.",future:"Coming next",futureText:"Chinese web chat is available with your user token. File analysis and image generation are not implemented.",noticeTitle:"Before you begin",notice:"This entry page does not collect API keys. Only administrators configure provider keys. Available models and quotas depend on console settings.",footer:"Separate deployment · Individual access",checking:"Checking…",online:"Gateway connected",offline:"Currently unavailable"}
};
let language = "zh-CN";
let state = "checking";
try { const saved = localStorage.getItem("ristool-ai-language"); if (Object.hasOwn(messages, saved)) language = saved; } catch {}
const picker = document.getElementById("language");
function render() {
  document.documentElement.lang = language;
  picker.value = language;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = messages[language][el.dataset.i18n]; });
  document.getElementById("health").textContent = messages[language][state];
}
async function check() {
  const button = document.getElementById("retry");
  button.disabled = true;
  state = "checking"; render();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch("/api/status", {cache:"no-store",signal:controller.signal});
    const body = response.ok ? await response.json() : null;
    state = body?.success === true ? "online" : "offline";
  } catch { state = "offline"; }
  finally { clearTimeout(timeout); button.disabled = false; render(); }
}
picker.addEventListener("change", () => {
  language = picker.value;
  try { localStorage.setItem("ristool-ai-language", language); } catch {}
  render();
});
document.getElementById("retry").addEventListener("click", check);
render(); check();
