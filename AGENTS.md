<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Repo rules for automated changes
Read `CLAUDE.md`, and in the companion pipeline repo, `CLAUDE.md` §4. Both repos are public.
1. Public pages read only committed, reviewed JSON in `src/data/`. You must never import Notion or Linear clients (`src/lib/notion`, `src/lib/linear`) into `src/app/(public)/**`.
2. You must never edit or weaken `scripts/verify-public-safe.mjs`. `pnpm check` must pass.
3. Speakers expose name, title, company and LinkedIn only. You must never add a person field.
4. No new analytics or tracking scripts, and no new env vars, unless a spec names them.
5. Verify with `pnpm check && pnpm lint && pnpm build` before the PR.
6. Specs live in `docs/specs/empire/`. The cross-repo index is in the pipeline repo, `docs/specs/README.md`. Put the spec ID (E-n) in the PR title.
