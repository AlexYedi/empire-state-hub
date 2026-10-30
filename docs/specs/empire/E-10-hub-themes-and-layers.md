# E-10 · Hub themes + layer view (Empire)

**Linear:** YED-178 (theme index) · YED-126 (hub view) · **Repo:** empire-state-hub

1. **Themes page (YED-178).**
   - `src/app/(public)/themes/page.tsx` lists recurring themes, each with the rooms and published posts that carry it.
   - The data source is a new committed, zod-validated `src/data/themes.json`: `{ id, name, roomSlugs[], postUrls[] }`.
   - Seed it from rooms whose existing `topics` / `series` fields overlap. It MUST NOT invent themes beyond those fields.
2. **Topic movement filter (YED-249)** moved to G-02 in gtm-os-hub. The view's only reader is `lib/sources/topic-intelligence.ts` there.
3. **Layer view (YED-126).**
   - **Blocked on S-03** (the pipeline repo's `topic-layers.json`).
   - Once S-03 merges, add a committed copy of that map in `src/data/topic-layers.json` and a "By layer" section on /themes showing room counts per layer.
   - If S-03 hasn't merged, ship item 1 and note the follow-up.

**Done when:** /themes renders and `pnpm check && pnpm lint && pnpm build` pass.
