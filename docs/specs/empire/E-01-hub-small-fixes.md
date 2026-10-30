# E-01 · Hub small fixes (Empire)

**Repo:** empire-state-hub · nine independent items, **one PR each**, run in parallel.
Read `node_modules/next/dist/docs/` first (Next 16 has breaking changes). Verify each PR with `pnpm check && pnpm lint && pnpm build`.

1. **404 page.** Add `src/app/not-found.tsx` using the existing header/footer and site tokens, linking to Home and /rooms.
2. **Metadata: Home + About.** Add `metadata` (title and description) to `src/app/(public)/page.tsx` and `about/page.tsx`. Copy MUST come only from text already on each page.
3. **Metadata: Work, Journal, Changelog.** The same for `work/`, `journal/` and `changelog/`.
4. **Metadata: Architecture, Build Arcs.** The same for `architecture/` and `build-arcs/`.
5. **Sitemap.** `src/app/sitemap.ts` covering the static public routes plus every room slug from `getRooms()` in `src/lib/rooms.ts`. It MUST exclude `/ops/*`.
6. **Robots.** `src/app/robots.ts`: allow all, disallow `/ops/`, and point to the sitemap.
7. **Skip link.**
   - A visually hidden skip link as the first focusable element in `src/app/(public)/layout.tsx`, targeting its `<main>` (add `id="main"`).
   - It MUST be visible on keyboard focus.
8. **Event structured data.**
   - JSON-LD `Event` on `src/app/(public)/rooms/[slug]/page.tsx` (name, startDate, `location.name`, performer = speaker names), built **only** from fields already in `rooms.json`.
   - It MUST pass `pnpm check`.
9. **Default Open Graph image.** A site-wide `opengraph-image` in house tokens: dark base, acid green `#8FE83A`, "Empire State" wordmark text.

## Must not
Add copy claims that aren't already on the page · add dependencies for items 1–8.

**Done when:** each item's PR passes the three commands, and the PR body shows the rendered result (route output or a screenshot).
