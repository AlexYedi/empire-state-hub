Invariants for every task in empire-state-hub. They must never be violated:
- This Next.js version has breaking changes. Read node_modules/next/dist/docs/ before writing code.
- Public routes (src/app/(public)/**) read ONLY committed JSON under src/data/. NEVER import src/lib/notion or src/lib/linear into them.
- NEVER edit or weaken scripts/verify-public-safe.mjs. `pnpm check` MUST pass.
- Speakers carry name, title, company and LinkedIn only. NEVER add contact fields (no email, no phone).
- NEVER add tracking scripts, env vars or secrets unless the spec names them.
- Before the PR: pnpm check && pnpm lint && pnpm build. Put the spec ID (E-n) in the PR title.
