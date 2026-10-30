# E-03 · /builds page + RSS feed (Empire)

**Repo:** empire-state-hub · two PRs

## 1 · /builds, replacing /ops/content-performance
Source: the roadmap row "Hub: About/Work refresh + /builds page".
- New public route `src/app/(public)/builds/page.tsx` listing builds from a new committed, zod-validated `src/data/builds.json`: `{ slug, name, date, event?, oneLine, repoUrl?, demoUrl?, stack[] }`.
- Seed it with **only** these public entries, leaving unknown fields empty:
  - the pipeline (`github.com/AlexYedi/Empire_State_Events_Pipeline_Take_3`);
  - this hub;
  - `warm-path-finder`.
- Add a nav link in `src/components/site-header.tsx`.
- **One-in-one-out:** the same PR deletes `src/app/ops/content-performance/` and `src/data/content-performance.ts`, plus their imports.
- About/Work copy is out of scope (Alex writes it).

## 2 · RSS feed
- `src/app/feed.xml/route.ts`, statically generated, emitting RSS 2.0:
  - one item per room (title, link to `/rooms/<slug>`, date, the `what` line);
  - one item per journal entry from `src/data/build-journal.json`;
  - newest first, capped at 50.
- Add `<link rel="alternate" type="application/rss+xml">` to the public layout metadata.
- Public fields only, and no new dependencies.

**Done when:** /builds renders the seeds, content-performance is gone, `/feed.xml` validates as RSS 2.0, and `pnpm check && pnpm lint && pnpm build` pass.
