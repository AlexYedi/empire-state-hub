# Codebase Map — empire-state-hub

| Path | What it is |
|---|---|
| `src/app/(public)/` | Public portfolio routes (App Router): `page.tsx` (home), `rooms/` (index + `[slug]` detail), `architecture/` (system map viewer), `work/`, `journal/`, `about/`, `changelog/`, `build-arcs/`. Shared shell in `layout.tsx`. |
| `src/app/ops/` | Password-gated operator cockpit: overview, `events/`, `entities/`, `content/`, `content-performance/` — all live Notion reads, `force-dynamic`. |
| `src/app/` (root files) | `layout.tsx`, `globals.css`, `favicon.ico`. |
| `src/proxy.ts` | Next 16 proxy (ex-middleware): Basic-auth gate for `/ops` + `/ops/*` against `OPS_PASSWORD`/`OPS_PASSWORD_PREVIEW`. |
| `src/components/` | UI: `hero`, `site-header`/`site-footer`, `lens-provider`/`lens-toggle`, `work-showcase`, plus `diagram/` and `system-map/` visualizers (elkjs + @xyflow/react). |
| `src/lib/` | Server data layer: `notion/` (client, database ids, property mappers), `linear/`, `events.ts`, `entities.ts`, `content-drafts.ts`, `rooms.ts`, `system-map/`, `lens.ts`, `cn.ts`. |
| `src/data/` | Generated + curated data: `system-map.json` / `system-map.files.json` (generated), `system-map.curated.json` (hand overlay), `rooms.json` / `rooms.curated.json`, `build-arcs*`, `build-journal.json`, `changelog.ts`, `content-performance.ts`, `diagrams/`. |
| `scripts/` | Node builtins only, no deps: `gen-rooms.mjs` (+ `fixtures/rooms/` test), `gen-system-map.mjs`, `verify-public-safe.mjs`, `verify-system-map.mjs` (privacy check), `content-drafts-status.mjs`. |
| `public/rooms/` | Per-event PDFs (carousels, maps) keyed by room slug. |
| `docs/` | `system-map.prd.md` (PRD) and `build-diary/` (inbox/merged build notes). |
| `.github/workflows/public-safety.yml` | CI: runs the two verifiers on PRs/pushes, with the pipeline repo checked out to `_pipeline` (Node 20, no install step). |

**Key invariant:** `src/data/system-map*.json` are generated from the sibling pipeline repo (`AlexYedi/Empire_State_Events_Pipeline_Take_3`) — never hand-edit the generated files; curate via `system-map.curated.json` and regenerate with `pnpm gen:system-map`. `pnpm check` enforces public-safety and privacy rules on every PR.
