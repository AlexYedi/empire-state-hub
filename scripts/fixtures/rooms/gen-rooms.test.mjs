// gen-rooms contract tests — run: pnpm test:rooms   (UPDATE=1 rewrites expected.json after a reviewed change)
// The allowlist is the product's safety property, so it is asserted two ways: an exact snapshot of the
// output, and a sentinel sweep — every fixture string that must never publish carries LEAK_.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRooms, validateOverlay, cleanFirstComment, publishedVariant, safetyScan } from "../../gen-rooms.mjs";
import { source, COMMITTED, OVERLAY } from "./fixture.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXPECTED = join(HERE, "expected.json");
const NOW = "2026-09-28T00:00:00.000Z";

const run = () => buildRooms({ overlay: validateOverlay(structuredClone(OVERLAY)), source, committed: COMMITTED, now: NOW });

test("output matches the reviewed snapshot", async () => {
  const { data } = await run();
  if (process.env.UPDATE || !existsSync(EXPECTED)) writeFileSync(EXPECTED, JSON.stringify(data, null, 2) + "\n");
  assert.deepEqual(data, JSON.parse(readFileSync(EXPECTED, "utf8")));
});

test("nothing outside the allowlist leaks (Quote Bank, attendees, Event Description, scheduled posts, …)", async () => {
  const { data } = await run();
  const out = JSON.stringify(data);
  const leaks = out.match(/LEAK_[A-Za-z_]*/g) ?? [];
  assert.deepEqual(leaks, [], `leaked: ${[...new Set(leaks)].join(", ")}`);
  assert.deepEqual(safetyScan(data), { phrases: 0, emails: 0 });
  for (const banned of ["Event Description", "Quote Bank", "Hot Take", "email", "phone", "Notes", "Bio"])
    assert.ok(!out.includes(`"${banned}"`), `field name ${banned} present`);
});

test("speakers: allowlisted roles only; empty Role Context dropped and reported", async () => {
  const { data, report } = await run();
  const room = data.rooms.find((r) => r.slug === "2026-09-16-agents-in-production-nyc");
  assert.deepEqual(
    room.speakers.map((s) => [s.name, s.roles]),
    [
      ["Sam Speaker", ["speaker"]],
      ["Hana Host", ["host"]],
    ],
  );
  assert.equal(room.speakers[1].linkedin, null, "non-linkedin URL must not export");
  assert.deepEqual(Object.keys(room.speakers[0]).sort(), ["company", "linkedin", "name", "roles", "title"]);
  const r = report.rooms.find((x) => x.slug === room.slug);
  assert.equal(r.noRole, 1);
  assert.equal(r.people, 4);
});

test("posts: only published + URL, of post types; carousel only if committed", async () => {
  const { data, assets } = await run();
  const room = data.rooms.find((r) => r.slug === "2026-09-16-agents-in-production-nyc");
  assert.deepEqual(
    room.posts.map((p) => [p.kind, p.url, p.roundup]),
    [
      ["preview", "https://www.linkedin.com/posts/preview-456", false],
      ["preview", "https://www.linkedin.com/posts/roundup-789", true],
      ["recap", "https://www.linkedin.com/posts/recap-123", false],
    ],
  );
  const recap = room.posts.find((p) => p.kind === "recap");
  assert.deepEqual(recap.carousel, { pdf: "/rooms/demo-dir/post-event-carousel.pdf", preview: null });
  assert.equal(room.posts[0].carousel, null, "uncommitted PDF must not match");
  assert.deepEqual([...assets.keys()].sort(), ["content-drafts/demo-dir/post-event-carousel.pdf", "content-drafts/other-dir/carousel.pdf"]);
});

test("first comment: public URLs only, editor notes and other-variant lines stripped", async () => {
  const { data } = await run();
  const room = data.rooms.find((r) => r.slug === "2026-09-16-agents-in-production-nyc");
  const recap = room.posts.find((p) => p.kind === "recap");
  assert.deepEqual(recap.firstComment, [
    "The talk slides: https://example.com/slides",
    "The paper: https://arxiv.org/abs/2501.00001",
    "A-only link: https://example.com/variant-a",
    "The event page: https://example.com/event",
  ]);
  assert.deepEqual(room.posts[0].firstComment, ["Primer on agent evals (https://example.com/primer)"]);
  const legacy = data.rooms.find((r) => r.slug === "2026-06-24-nyc-ai-demos-10");
  assert.equal(legacy.posts[0].firstComment, null, "variant-only line with unknown published variant is dropped");
});

test("takeaways: four allowed sections, first 5 insights, any heading ends a section", async () => {
  const { data } = await run();
  const room = data.rooms.find((r) => r.slug === "2026-09-16-agents-in-production-nyc");
  assert.deepEqual(room.takeaways, {
    quickTake: ["Reliability, not capability, was the through-line."],
    thesis: ["Evals are the new unit tests."],
    insights: ["Insight one", "Insight two", "Insight three", "Insight four", "Insight five"],
    tools: ["LangGraph", "Braintrust"],
  });
  assert.equal(room.recapPending, false);
});

test("overlay: notion_page_id resolves a legacy page; publish:false holds; unresolved is reported", async () => {
  const { data, report } = await run();
  const legacy = data.rooms.find((r) => r.slug === "2026-06-24-nyc-ai-demos-10");
  assert.equal(legacy.name, "NYC AI Demos #10");
  assert.equal(legacy.recapPending, true);
  assert.deepEqual(legacy.carousel, { pdf: "/rooms/other-dir/carousel.pdf", preview: null });
  assert.equal(legacy.posts.length, 1);
  assert.ok(!data.rooms.some((r) => r.slug === "2026-09-20-held-room"));
  assert.deepEqual(report.held, ["2026-09-20-held-room"]);
  assert.equal(report.unresolved.length, 1);
  assert.match(report.unresolved[0], /2026-09-18-nowhere/);
});

test("overlay validation rejects bad and duplicate slugs", () => {
  assert.throws(() => validateOverlay([{ slug: "Bad Slug" }]));
  assert.throws(() => validateOverlay([{ slug: "2026-01-01-a" }, { slug: "2026-01-01-a" }]));
  assert.throws(() => validateOverlay({}));
  assert.deepEqual(validateOverlay([]), []);
});

test("helpers: variant detection and fail-closed first comment", () => {
  assert.equal(publishedVariant(["Post [PUBLISHED 9/22: Variant C]"]), "C");
  assert.equal(publishedVariant(["✅ SHIPPED 2026-09-09 — Variant B posted to LinkedIn"]), "B");
  assert.equal(publishedVariant(["no marker"]), null);
  const rep = { phraseDrops: 0 };
  assert.equal(cleanFirstComment(["off the record: https://example.com/x"], null, rep), null);
  assert.equal(rep.phraseDrops, 1);
  assert.equal(cleanFirstComment([], null, rep), null);
});
