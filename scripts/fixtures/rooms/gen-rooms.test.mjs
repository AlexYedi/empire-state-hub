// gen-rooms contract tests — run: pnpm test:rooms   (UPDATE=1 rewrites expected.json after a reviewed change)
// The allowlist is the product's safety property, so it is asserted two ways: an exact snapshot of the
// output, and a sentinel sweep — every fixture string that must never publish carries LEAK_.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRooms, validateOverlay, cleanFirstComment, publishedVariant, safetyScan, extractTakeaways, hasQuotedSpeech, cleanTitle, publicName } from "../../gen-rooms.mjs";
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
  assert.equal(legacy.takeaways, null, "no takeaways without the overlay opt-in");
  assert.equal(legacy.recapPending, false, "a published recap post means the recap is not pending");
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

test("takeaways: working-note lines, quoted speech and no-record rooms fail closed", async () => {
  const b = (type, text) => ({ id: text, type, has_children: false, [type]: { rich_text: [{ plain_text: text }] } });
  const src = { getBlocks: async () => [] };
  const brief = (extra) => [
    b("heading_2", "Quick Take"),
    b("paragraph", "Evals moved into production."),
    b("paragraph", "HIGH Speaker (~12:34): a confidence-tagged transcript line"),
    b("paragraph", "Working thesis (Alex's synthesis, not a quote)"),
    b("paragraph", "They spent $128K a week on tokens."),
    b("paragraph", 'He said "nobody on my team is technical" twice.'),
    b("paragraph", 'The "2X" story, measured.'),
    ...extra,
  ];
  const report = { phraseDrops: 0 };
  const out = await extractTakeaways(brief([]), src, report);
  assert.deepEqual(out.quickTake, ["Evals moved into production.", 'The "2X" story, measured.']);
  assert.equal(await extractTakeaways(brief([b("heading_2", "Notes"), b("paragraph", "Room norm: nothing is recorded.")]), src, report), null);
  assert.equal(await extractTakeaways(brief([b("paragraph", "An off-the-record evening.")]), src, report), null);
  assert.equal(hasQuotedSpeech("the 'stand behind every sentence' policy"), true);
  assert.equal(hasQuotedSpeech("Clay's own 'AI slop' term, don't worry"), false);
});

test("speaker fields: research notes stripped from titles, placeholder names dropped", () => {
  assert.equal(cleanTitle("Sr. TPM, AWS (confirmed by Alex from LinkedIn 2026-09-14)"), "Sr. TPM, AWS");
  assert.equal(cleanTitle("Principal Architect, Oracle — TITLE UNVERIFIED"), "Principal Architect, Oracle");
  assert.equal(cleanTitle("Director of Product (AI), Apollo.io"), "Director of Product (AI), Apollo.io");
  assert.equal(cleanTitle("Lead @ X (per public records — 'Y' is personal brand title)"), null);
  assert.equal(publicName("Michael (Datadog) — last name TBC"), null);
  assert.equal(publicName("Jack (Insight Partners)"), null);
  assert.equal(publicName("Miaolai (Mila) Zhou"), "Miaolai (Mila) Zhou");
});
