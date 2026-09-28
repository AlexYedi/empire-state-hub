// Carry-over template parser + NY date grouping. Run: pnpm test:todos (Node 22.18+ strips types natively).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseTemplate,
  parseFromComments,
  extractLinks,
  plainText,
  groupFor,
  relativeDue,
  nyDate,
  onTimeRate,
} from "./carry-over-template.ts";

const FULL = `**Who:** Alex
**What:** Read the three variants, pick one, schedule it.
**When:** by Tue 2026-09-29
**Why:** Recaps are the best-performing format;
it ages daily.
**Context:** Draft [https://app.notion.com/p/3e5d](<https://app.notion.com/p/3e5d>) · [YED-204](https://linear.app/yedibalian/issue/YED-204/some-slug) · https://github.com/AlexYedi/hub/pull/29 · run /post-event-content`;

test("well-formed template parses every field", () => {
  const p = parseTemplate(FULL);
  assert.ok(p);
  assert.equal(p.who, "Alex");
  assert.equal(p.what, "Read the three variants, pick one, schedule it.");
  assert.equal(p.when, "by Tue 2026-09-29");
  assert.equal(p.why, "Recaps are the best-performing format; it ages daily.");
  assert.deepEqual(p.missing, []);
});

test("links: markdown (incl. Linear angle-bracket form), bare URLs, slash commands, labeled by host", () => {
  const p = parseTemplate(FULL)!;
  assert.deepEqual(p.links, [
    { href: "https://app.notion.com/p/3e5d", label: "Notion" },
    { href: "https://linear.app/yedibalian/issue/YED-204/some-slug", label: "YED-204" },
    { href: "https://github.com/AlexYedi/hub/pull/29", label: "PR #29" },
    { href: "/post-event-content", label: "/post-event-content" },
  ]);
});

test("links: dedupes, strips trailing punctuation, ignores dotted paths", () => {
  const links = extractLinks(
    "See https://example.com/a. and [x](https://example.com/a) · .claude/.state/review.md · hub src/data/x.ts",
  );
  assert.deepEqual(links, [{ href: "https://example.com/a", label: "x" }]); // markdown text wins
});

test("missing fields are reported, not invented", () => {
  const p = parseTemplate("**What:** Do the thing\n**When:** Fri\n**Context:**");
  assert.ok(p);
  assert.equal(p.who, null);
  assert.equal(p.why, null);
  assert.equal(p.context, null);
  assert.deepEqual(p.missing, ["who", "why", "context"]);
  assert.deepEqual(p.links, []);
});

test("no template → null (prose, or What alone)", () => {
  assert.equal(parseTemplate("Paused at Alex's request. **Done:** 19 companies."), null);
  assert.equal(parseTemplate("**What:** only a what"), null);
  assert.equal(parseTemplate("**Who:** Alex\n**Why:** because"), null); // no What
  assert.equal(parseTemplate(""), null);
  assert.equal(parseTemplate(null), null);
});

test("bold / no-bold / list-item variants all parse", () => {
  for (const text of [
    "Who: Alex\nWhat: ship it",
    "**Who**: Alex\n**What**: ship it",
    "- **Who:** Alex\n- **What:** ship it",
    "__Who:__ Alex\n__What:__ ship it",
    "**who:** Alex\n**WHAT:** ship it",
  ]) {
    const p = parseTemplate(text);
    assert.ok(p, text);
    assert.equal(p.who, "Alex", text);
    assert.equal(p.what, "ship it", text);
  }
});

test("a blank line ends a field; repeated markers keep the first value", () => {
  const p = parseTemplate("**Who:** Alex\n**What:** first\n\nunrelated prose\n**What:** second");
  assert.equal(p!.what, "first");
});

test("comment fallback picks the newest comment that carries the template", () => {
  const p = parseFromComments([
    { body: "**Who:** old\n**What:** old what", createdAt: "2026-09-20T00:00:00Z" },
    { body: "just a note", createdAt: "2026-09-28T00:00:00Z" },
    { body: "**Who:** Alex names\n**What:** create 50 contacts", createdAt: "2026-09-27T00:00:00Z" },
  ]);
  assert.equal(p!.who, "Alex names");
  assert.equal(p!.what, "create 50 contacts");
  assert.equal(parseFromComments([{ body: "no template", createdAt: "2026-09-27T00:00:00Z" }]), null);
  assert.equal(parseFromComments([]), null);
});

test("nyDate uses New York wall-clock, not UTC", () => {
  // 03:30 UTC on 9/29 is still 23:30 on 9/28 in New York (EDT, UTC-4).
  assert.equal(nyDate(new Date("2026-09-29T03:30:00Z")), "2026-09-28");
  assert.equal(nyDate(new Date("2026-09-29T04:00:00Z")), "2026-09-29");
  // Winter (EST, UTC-5): 04:30 UTC on 1/15 is 23:30 on 1/14.
  assert.equal(nyDate(new Date("2027-01-15T04:30:00Z")), "2027-01-14");
});

test("grouping by due date around the NY day boundary", () => {
  const lateEvening = nyDate(new Date("2026-09-29T03:30:00Z")); // 2026-09-28 in NY
  assert.equal(groupFor("2026-09-29", lateEvening), "week"); // tomorrow in NY, not today
  assert.equal(groupFor("2026-09-28", lateEvening), "today");
  const afterMidnight = nyDate(new Date("2026-09-29T04:30:00Z")); // 2026-09-29 in NY
  assert.equal(groupFor("2026-09-29", afterMidnight), "today");
  assert.equal(groupFor("2026-09-28", afterMidnight), "overdue");
});

test("grouping buckets: overdue / today / this week (next 6 days) / later / no date", () => {
  const today = "2026-09-28";
  assert.equal(groupFor("2026-09-27", today), "overdue");
  assert.equal(groupFor("2026-09-28", today), "today");
  assert.equal(groupFor("2026-09-29", today), "week");
  assert.equal(groupFor("2026-10-04", today), "week");
  assert.equal(groupFor("2026-10-05", today), "later");
  assert.equal(groupFor(null, today), "none");
  // DST end (Nov 1 2026) doesn't shift day counts.
  assert.equal(groupFor("2026-11-02", "2026-10-31"), "week");
  assert.equal(relativeDue("2026-11-02", "2026-10-31"), "in 2d");
});

test("relativeDue", () => {
  assert.equal(relativeDue("2026-09-28", "2026-09-28"), "today");
  assert.equal(relativeDue("2026-09-25", "2026-09-28"), "3d overdue");
  assert.equal(relativeDue("2026-10-01", "2026-09-28"), "in 3d");
  assert.equal(relativeDue(null, "2026-09-28"), "");
});

test("on-time rate: NY completion day vs due date; null below n=5", () => {
  const few = onTimeRate([{ dueDate: "2026-09-28", completedAt: "2026-09-28T12:00:00Z" }]);
  assert.deepEqual(few, { n: 1, onTime: 1, pct: null });
  const rows = [
    { dueDate: "2026-09-28", completedAt: "2026-09-29T03:00:00Z" }, // 23:00 NY on the due day → on time
    { dueDate: "2026-09-28", completedAt: "2026-09-29T05:00:00Z" }, // 01:00 NY next day → late
    { dueDate: "2026-09-20", completedAt: "2026-09-19T12:00:00Z" },
    { dueDate: "2026-09-21", completedAt: "2026-09-21T12:00:00Z" },
    { dueDate: "2026-09-22", completedAt: "2026-09-25T12:00:00Z" },
    { dueDate: null, completedAt: "2026-09-25T12:00:00Z" }, // no due date: excluded from n
  ];
  assert.deepEqual(onTimeRate(rows), { n: 5, onTime: 3, pct: 60 });
});

test("plainText strips markdown in Who/What/When/Why", () => {
  assert.equal(
    plainText("Re-scope `roadmap.md`: kill P3 ([YED-162](https://linear.app/x/issue/YED-162/s)/163) drip \\~2/week **now**"),
    "Re-scope roadmap.md: kill P3 (YED-162/163) drip ~2/week now",
  );
  assert.equal(parseTemplate("**Who:** Alex\n**What:** run `/scan-roles` \\~weekly")!.what, "run /scan-roles ~weekly");
});
