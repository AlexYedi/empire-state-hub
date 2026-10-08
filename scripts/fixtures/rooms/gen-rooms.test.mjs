// gen-rooms contract tests — run: pnpm test:rooms   (UPDATE=1 rewrites expected.json after a reviewed change)
// The allowlist is the product's safety property, so it is asserted two ways: an exact snapshot of the
// output, and a sentinel sweep — every fixture string that must never publish carries LEAK_.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRooms,
  validateOverlay,
  cleanFirstComment,
  publishedVariant,
  safetyScan,
  extractTakeaways,
  hasQuotedSpeech,
  cleanTitle,
  publicName,
  cleanUrl,
  publicLocation,
  looksLikeAddress,
  carouselFor,
  carouselFromText,
} from "../../gen-rooms.mjs";
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
  assert.deepEqual(safetyScan(data), { phrases: 0, emails: 0, addresses: 0, trackedLinks: 0 });
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
    "The host's recap: https://www.linkedin.com/posts/host-recap-1",
    "The paper: https://arxiv.org/abs/2501.00001",
    "A-only link: https://example.com/variant-a",
    "The event page: https://example.com/event",
  ]);
  assert.deepEqual(room.posts[0].firstComment, ["Primer on agent evals (https://example.com/primer)", "Further reading: http://clay.com/blog"]);
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

test("companies: only the exported speakers' companies — never the Event's Companies relation", async () => {
  const { data } = await run();
  const room = data.rooms.find((r) => r.slug === "2026-09-16-agents-in-production-nyc");
  // the fixture event's Companies relation holds Acme AI (a speaker's) AND a non-speaker company
  assert.deepEqual(room.companies, ["Acme AI"]);
  assert.ok(!JSON.stringify(data).includes("Beta Labs"), "a non-speaker company on the Event relation must not publish");
  const other = data.rooms.find((r) => r.slug === "2026-09-16-another-room-same-night");
  assert.deepEqual(other.companies, []);
});

test("location: venue + city only; overlay location wins; addresses never publish", async () => {
  const { data } = await run();
  assert.equal(data.rooms.find((r) => r.slug === "2026-09-16-agents-in-production-nyc").location, "Some Venue, New York");
  assert.equal(data.rooms.find((r) => r.slug === "2026-09-16-another-room-same-night").location, "Other Venue, New York");
  assert.equal(publicLocation("111 W 19th St, New York, NY (Clay HQ) — invite-only, address released to accepted guests"), "Clay HQ, New York");
  assert.equal(publicLocation("Insight Partners, 1114 6th Ave, 36th floor, New York, NY 10036"), "Insight Partners, New York");
  assert.equal(publicLocation("620 8th Ave, 45th Floor (NYT Building), New York, NY"), "NYT Building, New York");
  assert.equal(publicLocation("49 Elizabeth St / Canopy, NYC"), "Canopy, New York");
  assert.equal(publicLocation("Spara HQ, 7 World Trade Center, New York, NY 10006"), "Spara HQ, New York");
  assert.equal(publicLocation("18 E 50th St, New York, NY 10022"), "New York");
  assert.equal(publicLocation("NYC (application-only, address on approval) — Luma"), "New York");
  assert.equal(publicLocation("Virtual (Luma / Goldcast) — https://luma.com/x"), "Virtual");
  assert.equal(publicLocation(""), null);
  for (const r of data.rooms) assert.ok(!looksLikeAddress(r.location), `${r.slug}: ${r.location}`);
  assert.throws(() => validateOverlay([{ slug: "2026-01-01-a", location: "111 W 19th St, New York" }]));
});

test("speaker_overrides: may only null a field; applied after export", async () => {
  const { data, report } = await run();
  const hana = data.rooms.find((r) => r.slug === "2026-09-16-agents-in-production-nyc").speakers.find((s) => s.name === "Hana Host");
  assert.equal(hana.title, null);
  assert.deepEqual(report.overrideMisses, ["2026-09-16-another-room-same-night — Nobody Here"]);
  assert.throws(() => validateOverlay([{ slug: "2026-01-01-a", speaker_overrides: { X: { company: "Added Co" } } }]));
  assert.throws(() => validateOverlay([{ slug: "2026-01-01-a", speaker_overrides: { X: { name: null } } }]));
  assert.doesNotThrow(() => validateOverlay([{ slug: "2026-01-01-a", speaker_overrides: { X: { title: null, company: null } } }]));
});

test("linkedin URLs lose tracking query strings and fragments everywhere they are emitted", async () => {
  assert.equal(cleanUrl("https://www.linkedin.com/posts/x_activity-1-abc?utm_source=share&utm_medium=member_desktop&rcm=ACoAAB#c"), "https://www.linkedin.com/posts/x_activity-1-abc");
  assert.equal(cleanUrl("https://example.com/a?b=1"), "https://example.com/a?b=1");
  assert.deepEqual(cleanFirstComment(["Recap: https://www.linkedin.com/feed/update/urn:li:activity:1/?utm_source=x&rcm=y"], null, { phraseDrops: 0 }), [
    "Recap: https://www.linkedin.com/feed/update/urn:li:activity:1/",
  ]);
  const { data } = await run();
  const out = JSON.stringify(data);
  assert.ok(!/linkedin\.com\/[^"\s]*[?#]/.test(out), "a linkedin URL with a query/fragment was emitted");
  const room = data.rooms.find((r) => r.slug === "2026-09-16-agents-in-production-nyc");
  assert.equal(room.speakers[0].linkedin, "https://www.linkedin.com/in/sam-speaker");
});

test("carousel paths: legacy refs resolve through the move map; Event Content refs publish kebab-cased", () => {
  const committed = new Set([
    "Event Content/09 16 26 Postgres Tuning in the Age of AI/carousel.pdf",
    "Event Content/09 16 26 Postgres Tuning in the Age of AI/preview-slide1.png",
    "Event Content/Upcoming Weeks/09 14 26 Upcoming Week/carousel.pdf",
    "Event Content/10 01 26 NYC AI Demos #11/carousel.pdf",
  ]);
  const moves = new Map([
    ["content-drafts/postgres-tuning-ai-2026-09-16/carousel.pdf", "Event Content/09 16 26 Postgres Tuning in the Age of AI/carousel.pdf"],
  ]);
  // legacy ref: public path unchanged (stable links), file read from its new home
  const legacy = carouselFor("content-drafts/postgres-tuning-ai-2026-09-16/carousel.pdf", committed, moves);
  assert.deepEqual(legacy.pdf, "/rooms/postgres-tuning-ai-2026-09-16/carousel.pdf");
  assert.deepEqual(legacy.preview, "/rooms/postgres-tuning-ai-2026-09-16/preview-slide1.png");
  assert.deepEqual(legacy._assets[0], ["Event Content/09 16 26 Postgres Tuning in the Age of AI/carousel.pdf", "postgres-tuning-ai-2026-09-16/carousel.pdf"]);
  // legacy ref with no move entry and no committed file: no match
  assert.equal(carouselFor("content-drafts/gone/carousel.pdf", committed, moves), null);
  // Event Content ref: nested folders, spaces and '#' become a URL-safe path
  assert.equal(carouselFor("Event Content/Upcoming Weeks/09 14 26 Upcoming Week/carousel.pdf", committed).pdf, "/rooms/upcoming-weeks/09-14-26-upcoming-week/carousel.pdf");
  assert.equal(carouselFor("Event Content/10 01 26 NYC AI Demos #11/carousel.pdf", committed).pdf, "/rooms/10-01-26-nyc-ai-demos-11/carousel.pdf");
  assert.equal(carouselFor("Event Content/10 01 26 NYC AI Demos #11/missing.pdf", committed), null);
});

test("carousel paths: refs are read from draft text in order; the first committed one wins", () => {
  const committed = new Set([
    "Event Content/10 01 26 NYC AI Demos #11/carousel.pdf",
    "Event Content/09 16 26 Postgres Tuning in the Age of AI/carousel.pdf",
  ]);
  const moves = new Map([["content-drafts/postgres-tuning-ai-2026-09-16/carousel.pdf", "Event Content/09 16 26 Postgres Tuning in the Age of AI/carousel.pdf"]]);
  // two refs on one line: an uncommitted draft PDF, then the committed carousel
  const line = "Rendered: `Event Content/10 01 26 NYC AI Demos #11/draft.pdf` and Event Content/10 01 26 NYC AI Demos #11/carousel.pdf (5 pages)";
  assert.equal(carouselFromText([line], committed).pdf, "/rooms/10-01-26-nyc-ai-demos-11/carousel.pdf");
  // a legacy ref earlier in the text beats a later Event Content ref
  const mixed = "Old: content-drafts/postgres-tuning-ai-2026-09-16/carousel.pdf · New: Event Content/10 01 26 NYC AI Demos #11/carousel.pdf";
  assert.equal(carouselFromText([mixed], committed, moves).pdf, "/rooms/postgres-tuning-ai-2026-09-16/carousel.pdf");
  assert.equal(carouselFromText(["no carousel named here"], committed, moves), null);
});
