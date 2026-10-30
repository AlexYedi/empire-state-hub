# E-02 · Hub Long Reads + promotion (Empire)

**Repo:** empire-state-hub · three phases (Product, UX, Technical) · **Alex edits the Product phase before approving the plan.**

## Phase 1 · Product
**Problem.** An event post tops out at 3,000 characters plus a 4:5 PDF. The Learn-More link in the first comment has nowhere rich to land.

**Goal.** Every event gets a web-native long read on the hub: the long form of its post, amended after the event, and the Learn-More destination.

**Users.**
- LinkedIn readers clicking Learn More.
- Hiring managers and peers judging the depth of Alex's thinking.
- Alex, publishing one from a reviewed file in minutes.

**In scope (v1).**
- Committed, reviewed JSON per room. It MUST NOT be pulled live from Notion, which holds private context.
- A typed block model.
- `/rooms/<slug>/read`, plus links and promotion across the site.

**Out of scope (v1).** Interactive charts, video, 3D, comments, an authoring UI, Notion sync.

**Success.**
- The seed long read renders.
- A second long read needs only a new JSON file.
- `pnpm check` stays green.

**Hard constraints.**
- No email or phone fields exist in the schema.
- Quotes always carry attribution.
- Recorded speech never becomes public text (only quotes Alex approved).
- `scripts/verify-public-safe.mjs` already scans `src/data/**`, so files MUST live there. **Do not edit that script.**

## Phase 2 · UX
- **Reading layout:** single column with about a 68ch measure, house fonts, light and dark themes from the existing tokens.
- **Header:** event name, date, venue, series pill, reading time, and a "Back to room" link.
- **Blocks:**
  - Pull-quotes get an acid-green left rule.
  - Stats render as a large mono number, with the label and source beneath.
  - Images are lazy-loaded, with captions.
  - Sources form a numbered list at the end.
- **Room page:** a "Read the long read →" link under the title, shown only when a long read exists.
- **Mobile:** no horizontal scroll at 375px, with a 16px gutter.
- **Accessibility:** semantic `article`, `h2`, `blockquote` and `figure`; the schema MUST require alt text.

## Phase 3 · Technical
- **Data:** `src/data/long-reads/<slug>.json`. `<slug>` MUST match an existing room slug.
- **Schema:** `src/lib/long-reads.ts`.
  - A zod discriminated union on `type`: `heading`, `paragraph`, `quote` (with attribution), `image` (with alt and caption), `callout`, `stat` (value, label, source) and `sources`.
  - Top level: `{ slug, updated, readingMinutes?, blocks[] }`.
  - Parse at import, the same idiom as `src/lib/rooms.ts`.
- **Loader:** `getLongRead(slug)` and `hasLongRead(slug)`. `readingMinutes` is computed when omitted.
- **Route:** `src/app/(public)/rooms/[slug]/read/page.tsx`, with `generateStaticParams` over the slugs that have files, `dynamicParams = false`, and metadata from the room.
- **Components:** `src/components/long-read/`, one per block type.
- **Tests:** `node --test` beside the rooms test. A valid fixture parses. A missing alt, an unknown block type, and a slug with no room each fail. Wire it into `pnpm check`.

## Phase 4 · Promotion
1. A home-page "Latest long reads" module (the newest 3).
2. A long-read badge on room cards in `src/app/(public)/rooms/rooms-index.tsx`.
3. A per-read Open Graph image (title plus event, house tokens).
4. Long reads included in `src/app/sitemap.ts` (E-01) and the RSS feed (E-03) if they've merged. Otherwise the PR notes the follow-up.

## Seed
Alex supplies the slug and the published post text at plan approval. Proposed seed: `2026-09-28-shortlist-september-founder-showcase`, which has a published recap. **Until then, use a clearly fictional fixture in `scripts/fixtures/`, never in `src/data/`.**

**Executables:**
1. Schema, loader and tests.
2. Block components.
3. Route and metadata.
4. Room-page link.
5. Promotion: home module and badges.
6. Promotion: OG image, sitemap and RSS.
7. Seed (blocked on Alex).
