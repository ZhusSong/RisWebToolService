# Codex 项目工作记录

更新日期：2026-10-30。此文件供另一台电脑上的 Codex 读取项目最近状态；以代码和服务器实际配置为最终依据。完成新功能或解决故障后更新本文件并提交推送。

## 用户偏好

- 使用中文交流。
- 每次新功能完成后，附上准确的服务器端更新操作指令。
- 新增文件使用 UTF-8 无 BOM。
- `Summarize/` 是本机说明资料，已被 Git 忽略；需要跨电脑共享的工作状态写在本文件。
- 聊天框的文件操作以拖拽为主；不显示“＋附件”和“输出选项”。

## 项目与部署

- 主站：Next.js，服务器仓库为 `~/ristoolservice`，构建后由 PM2 运行。
- AI 中转站：仓库目录 `AI_OneAPI/`，服务器运行目录 `/opt/ristool-ai`，Docker Compose 管理 `one-api`、`history`、`files`、`converter`。
- AI 页面是 `/opt/ristool-ai/web` 下的静态文件；仅改页面时，从仓库的 `AI_OneAPI/web/.` 复制过去，通常不需重建容器。
- 文件服务代码从仓库 `AI_OneAPI/files/` 复制到 `/opt/ristool-ai/files/` 后，需要 `sudo docker compose build files` 和 `sudo docker compose up -d --no-deps files`。
- 部署前先在本机提交并推送；服务器在 `~/ristoolservice` 执行 `git pull --ff-only`。
- 线上 `.env`、`data/` 和 Compose 自定义设置不得被仓库示例覆盖。

## 最近完成的工作

1. 聊天框已移除“＋附件”和“输出选项”。用户可拖入或粘贴文件，输入指令。前端从文字判断图片生成、图片编辑、文件输出及明确要求的直接格式转换。相关 Node 前端测试 10 项通过。
2. 生图模型由 `IMAGE_MODEL` 配置。图片生成成功，生成结果可在聊天内容中下载，服务器保存 24 小时。
3. 图片编辑曾返回 HTTP 503。服务器日志显示 One API 收到 `/v1/images/edits`，但模型名为空；进一步核对 One API v0.6.10 源码发现该路由为 `RelayNotImplemented`。
4. 文件服务新增 `IMAGE_EDIT_BASE_URL` 与 `IMAGE_EDIT_API_KEY`，编辑图片直接请求单独的上游；图片生成仍走 One API。编辑请求仍经本站账号、令牌和会话验证，但独立上游费用不经 One API 渠道计费。服务器上曾因 Compose 配置缺失和 `volumes:` 缩进错误导致变量未传入，修正后容器检查显示 `URL: True`、`KEY: True`。用户随后确认图片编辑成功。
5. One API 和文件服务的密钥实际值仅在服务器 `.env` 中。对话里曾出现会话密钥，已提醒用户更换；尚未收到更换完成的确认。不要在本文件或聊天中记录密钥值。
6. 聊天页模型选择原先只写死 `gpt-5.6-sol` 和 `gpt-6-astra`。现已修改为按所选令牌的 `/v1/models` 返回值展示模型，并放开历史记录及文件处理服务的安全模型 ID 格式校验。图片模型选中后走图片处理流程；管理员配置的 `IMAGE_MODEL` 仍决定实际图片模型。此项改动的前端测试 16 项通过，本机没有可用 Python 解释器，Python 测试需在服务器运行。此项尚待服务器部署与用户验收。

## 后续注意

- 不要把 Codex 原始聊天数据库或逐字聊天记录提交到 Git；其中可能包含密钥、个人数据和临时信息。本文件只记录可公开给项目协作者的工作状态。
- 若用户要求跨电脑继续，先读取本文件、`AGENTS.md`、`git status` 和相关代码，再核对服务器实际部署状态。
- 图片编辑若再次失败，优先查看页面完整错误和 `/opt/ristool-ai` 中 `sudo docker compose logs --since=5m --tail=50 files`。不要打印 `.env` 或完整的 `docker compose config`。
