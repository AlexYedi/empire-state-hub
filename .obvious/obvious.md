# empire-state-hub — Agent Guidance

Public portfolio + operator cockpit for an AI-native GTM pipeline. Next.js (App Router, Turbopack) · TypeScript · Tailwind 4 · React 19. Live data is read from Notion (read-only integration) and Linear; the site is deployed on Vercel.

## Stack

- **Next.js 16.2.9 (App Router, Turbopack)** — pages in `src/app`; `/ops` cockpit under `src/app/ops`, gated by Basic auth via `src/proxy.ts` (Next 16 "proxy" convention, successor to middleware).
- **TypeScript 5, React 19, Tailwind 4** — no test framework beyond `node --test` scripts (see below).
- **Package manager: pnpm 10** (`pnpm-lock.yaml` is canonical; `pnpm-workspace.yaml` carries config — this is why pnpm < 10 fails with "packages field missing or empty"). There is NO database, NO Docker, NO Compose — no infra to bring up locally.
- **Node 20** (CI pins node-version 20).

## Commands

| Task | Command | Notes |
|---|---|---|
| Install | `pnpm install` | requires pnpm 10+ |
| Dev server | `pnpm dev` | http://localhost:3000, parses as "Ready" in output |
| Lint | `pnpm lint` | eslint 9; 1 pre-existing warning in `scripts/gen-system-map.mjs` is normal |
| Typecheck | `npx tsc --noEmit` | no script defined; clean as of onboarding |
| Public-safety checks | `pnpm check` | runs `verify-public-safe.mjs` + `verify-system-map.mjs` + `node --test` (17 tests) |
| Unit tests | `pnpm test:rooms` | node:test suite for `scripts/gen-rooms.mjs` |
| Regenerate system map | `pnpm gen:system-map` | rebuilds `src/data/system-map{,.files}.json` from the pipeline repo; needs `PIPELINE_DIR` |

## Environment variables

`.env.example` is the authoritative list — copy to `.env.local` (gitignored). All server-only; none may be `NEXT_PUBLIC_`-prefixed.

- `NOTION_TOKEN`, `NOTION_DB_EVENTS`, `NOTION_DB_PEOPLE`, `NOTION_DB_COMPANIES`, `NOTION_DB_TOPICS`, `NOTION_DB_CONTENT_DRAFTS` — Notion read-only integration + real DATABASE ids.
- `LINEAR_API_KEY`, `LINEAR_TEAM_KEY` (default `YED`).
- `OPS_PASSWORD` (prod) / `OPS_PASSWORD_PREVIEW` (preview) — Basic-auth gate for `/ops`. In local dev with no password set, `/ops` is open by design; in production unset = 404.

**No real Notion/Linear credentials exist in the sandbox.** Public pages need no env vars and render fine. `/work` and `/ops/*` call Notion live with no error fallback and return 500 without real credentials — this is expected locally, TODO(confirm) whether stub data should be added for offline dev.

## Next.js 16 warning

Per `AGENTS.md`: this is NOT the Next.js in your training data — read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.

## Local verification

1. `pnpm install && pnpm dev` — wait for `✓ Ready` on port 3000.
2. `curl -s -o /dev/null -w "%{http_code}" localhost:3000/` → 200 (same for `/rooms`, `/architecture`, `/journal`, `/about`, `/changelog`, `/build-arcs`, any `/rooms/<slug>`).
3. `pnpm lint`, `npx tsc --noEmit`, `pnpm check` — all clean.
4. CI (`public-safety.yml`) runs only the two verifiers on PRs/pushes, checking out the sibling pipeline repo into `_pipeline` so the privacy check runs (set `PIPELINE_DIR=.../Empire_State_Events_Pipeline_Take_3` locally to replicate).

## Snapshot

- **Snapshot ID:** `1dhcyx4motbxi927q5yp:default` (e2b template)
- **Captured:** 2026-10-30T15:05:56.995Z
- State: pnpm 10 installed, dependencies installed, dev server verified healthy on :3000, lint/typecheck/check suite green.

## Codebase map

See `.obvious/codebase-map.md`.

## Work queue and rules

- **Rules:** `AGENTS.md`, plus the `hub-guardrails` skill (its invariants load on every turn).
- **Specs:** `docs/specs/empire/` (E-01, E-02, E-03, E-04, E-06, E-10). The cross-repo index lives in the pipeline repo at `docs/specs/README.md`.
