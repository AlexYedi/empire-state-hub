---
name: local-dev
description: How to get empire-state-hub running locally — discovered during automated onboarding (2026-10-30)
---

# local-dev

## What the stack is

Next.js 16.2.9 (App Router + Turbopack) / TypeScript 5 / React 19 / Tailwind 4. No database, no Docker, no Compose — the only external services are Notion + Linear (read-only, runtime API calls). Deploy target is Vercel.

## Gotchas discovered during onboarding

1. **pnpm 10 required.** `pnpm-workspace.yaml` holds pnpm-10-style config (`ignoredBuiltDependencies`, `supportedArchitectures`) with no `packages:` field. pnpm 9 fails on *any* invocation with `ERROR packages field missing or empty`. Install with `npm install -g pnpm@10`.
2. **Root-owned leftovers.** A fresh sandbox image ships a root-owned `node_modules/` and an untracked root-owned `bun.lock` in the repo. `sudo rm -rf node_modules bun.lock` before `pnpm install`, or pnpm dies with `EACCES: mkdir node_modules/.pnpm`. `bun.lock` is not canonical — `pnpm-lock.yaml` is.
3. **No env needed for the public site.** `pnpm dev` → `✓ Ready` on **port 3000** (from startup output). `/`, `/rooms`, `/rooms/<slug>`, `/architecture`, `/journal`, `/about`, `/changelog`, `/build-arcs` all render with no `.env.local`.
4. **`/work` and `/ops/*` need real Notion credentials.** `src/lib/notion/databases.ts` throws at module load without `NOTION_DB_*` vars, and the pages call Notion live with no fallback → 500 without a real token. No sandbox secrets exist for these; document, don't block.
5. **`/ops` auth.** `src/proxy.ts` allows `/ops` in dev when no `OPS_PASSWORD` is set; production without it returns 404.
6. **Next 16 is new.** `AGENTS.md` mandates reading `node_modules/next/dist/docs/` before writing Next code — APIs may differ from training data.

## Verification commands that passed (2026-10-30)

- `pnpm lint` — 0 errors (1 pre-existing warning: unused `e` at `scripts/gen-system-map.mjs:233`).
- `npx tsc --noEmit` — clean.
- `pnpm check` — both verifiers pass + 17/17 `node --test` tests pass.
- HTTP: all public routes 200; room detail flow verified via index → slug → 200.

## Primary flow exercised

Home page (title `Empire State — NYC AI field notes & the system behind them`) → `/rooms` index → `/rooms/2026-09-28-shortlist-september-founder-showcase` detail → `/architecture` system map. All 200 over HTTP against the running dev server.
