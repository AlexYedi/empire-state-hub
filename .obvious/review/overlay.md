# Review overlay: empire-state-hub

Read `AGENTS.md` first.

## Blocker (score ≥ 90) if the PR:
- imports `src/lib/notion` or `src/lib/linear` into `src/app/(public)/**`
- edits `scripts/verify-public-safe.mjs`, `scripts/gen-rooms.mjs` or `.github/workflows/public-safety.yml`
- hand-edits `src/data/rooms.json`
- adds a person field beyond name, title, company, LinkedIn, roles, or any email or phone
- adds a tracking or analytics script, or a new env var the spec didn't name
- commits `.env*`
- ships an editorial marker (`[confirm]`, `TODO`, `TBD`) in any `src/data/**` file a public page renders
- adds public prose with a firm- or person-level claim or figure that has no published source or attribution, or restates an attributed figure ("X said ~$160M") as fact

## High scrutiny
- New `src/data/*.json`: needs a zod schema parsed at import, and must pass `pnpm check`.
- New routes: `generateStaticParams` with `dynamicParams = false` where data is static, plus metadata present.
- Accessibility: semantic landmarks, alt text, keyboard focus.

## Public prose (long reads, room copy, builds)
Check every claim against the **published** post it came from. Check internal consistency (a stat vs. a chart on the same page). Quotes appear only if they were already published, with attribution. This is the output-evaluator `source` check (pipeline `CLAUDE.md` §6); run it, or cite in the PR body that it ran.

## Already handled by tooling (don't comment)
Lint and formatting (`pnpm lint`) · public-safe scan (`pnpm check`).

## Expected in every PR body
The spec ID (E-n), and the output of `pnpm check && pnpm lint && pnpm build`.
