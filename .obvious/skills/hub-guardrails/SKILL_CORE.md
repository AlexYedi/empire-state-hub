Invariants for every task in empire-state-hub. They must never be violated:
- This Next.js version has breaking changes. Read node_modules/next/dist/docs/ before writing code.
- Public routes (src/app/(public)/**) read ONLY committed JSON under src/data/. NEVER import src/lib/notion or src/lib/linear into them.
- NEVER edit or weaken scripts/verify-public-safe.mjs. `pnpm check` MUST pass.
- Speakers carry name, title, company and LinkedIn only. NEVER add contact fields (no email, no phone).
- NEVER add tracking scripts, env vars or secrets unless the spec names them.
- Public prose (long reads, room "what" lines, builds copy, any new src/data/*.json a reader sees) MUST be source-checked before merge (pipeline CLAUDE.md §6, output-evaluator): every firm- or person-level claim and figure is cited to a published source, attributed as said, or cut. NEVER ship editorial markers ([confirm], TODO, TBD) in public data. Copy a published figure WITH its attribution; NEVER restate it as a fact.
- Before the PR: pnpm check && pnpm lint && pnpm build. Put the spec ID (E-n) in the PR title.
