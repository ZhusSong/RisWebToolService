<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# RisWebToolService project context

This file is the portable Codex context for this repository. Keep it committed so
that Codex sessions on other computers receive the same project-level guidance.
Never put credentials, API keys, session secrets, or machine-specific paths here.

## Product

RisWebToolService is a multilingual web toolbox with Chinese, Japanese, and
English UI. Its main features are text translation, text counting, local 3D model
viewing, file-format conversion, visitor analytics, and an authenticated admin
statistics area.

## Stack and layout

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, and pnpm.
- `src/app/`: pages, API routes, and React components.
- `src/lib/`: authentication, rate limiting, analytics, i18n, pronunciation, and
  model-viewer parsing/import logic.
- `src/messages/`: all user-facing translations. Keep every locale complete.
- `tests/`: Node test-runner coverage for security, i18n, analytics, and model
  import behavior.
- `AI_OneAPI/`: Docker Compose services for One API, history, file processing,
  and document conversion. The public Next.js conversion route calls the local
  converter on `127.0.0.1:3004`.
- `deploy/`: nginx production configuration and guard scripts.

Treat `package.json` and `pnpm-lock.yaml` as the source of truth for exact tool
versions. The repository currently declares pnpm 11.19.0.

## Local workflow

On Windows/Visual Studio PowerShell, use the `.cmd` form if PowerShell script
execution is restricted:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd dev
pnpm.cmd lint
pnpm.cmd exec tsc --noEmit
node --test tests/*.test.cjs AI_OneAPI/tests/*.test.cjs
pnpm.cmd build
pnpm.cmd start
```

The development URL is `http://localhost:3000`. A production build must pass
TypeScript, ESLint, tests, and `next build` before a change is considered done.

## Environment and data

Local secrets belong in `.env.local`, which is ignored by Git. Use
`.env.local.example` as the variable reference. Important variables include:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `GOOGLE_TRANSLATE_API_KEY`
- `TRANSLATION_MONTHLY_LIMIT`
- `ANALYTICS_TRUST_PROXY`

Runtime SQLite databases are created under `data/` and must not be committed.
`AI_OneAPI/.env` and its persistent data are also local-only. Docker Desktop is
required to run the complete `AI_OneAPI` stack.

## Engineering constraints

- Preserve server-side request-size, origin, rate-limit, and authentication
  checks when changing API routes.
- Never forward client cookies, arbitrary URLs, tokens, or AI parameters to the
  local converter service.
- File conversion output keeps the selected input's base name and changes only
  the extension; the browser handles duplicate download names with `(1)`, `(2)`,
  and similar suffixes.
- Keep local-file model viewing local; reject remote paths and unsafe archives.
- Add or update regression tests for behavior changes.

## Cross-device continuation

At the start of a new Codex session, read `CODEX_PROJECT_STATE.md` for the
latest project-specific conversation handoff. After completing a feature or
resolving an incident, update that file with the outcome, verification,
deployment steps, and any remaining work. Never copy raw chat transcripts,
credentials, session secrets, or API keys into the repository. Every completed
feature response must include the server-side update commands relevant to it.

Before switching computers, commit and push code plus this file to `origin`.
On the other computer, clone or pull the repository, install locked dependencies,
create its own `.env.local`, and start a Codex chat from the repository root.
Project context is shared through Git; local chat databases and credentials are
intentionally not copied.
