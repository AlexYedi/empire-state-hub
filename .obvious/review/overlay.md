# Review overlay: empire-state-hub

Read `AGENTS.md` first.

## Blocker (score ≥ 90) if the PR:
- imports `src/lib/notion` or `src/lib/linear` into `src/app/(public)/**`
- edits `scripts/verify-public-safe.mjs`, `scripts/gen-rooms.mjs` or `.github/workflows/public-safety.yml`
- hand-edits `src/data/rooms.json`
- adds a person field beyond name, title, company, LinkedIn, roles, or any email or phone
- adds a tracking or analytics script, or a new env var the spec didn't name
- commits `.env*`

## High scrutiny
- New `src/data/*.json`: needs a zod schema parsed at import, and must pass `pnpm check`.
- New routes: `generateStaticParams` with `dynamicParams = false` where data is static, plus metadata present.
- Accessibility: semantic landmarks, alt text, keyboard focus.

## Already handled by tooling (don't comment)
Lint and formatting (`pnpm lint`) · public-safe scan (`pnpm check`).

## Expected in every PR body
The spec ID (E-n), and the output of `pnpm check && pnpm lint && pnpm build`.
