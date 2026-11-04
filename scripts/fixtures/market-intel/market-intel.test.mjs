// Selftest for src/lib/market-intel/slices.mjs (YED-304 Phase A hub heatmap) against the
// MERGED migration-0016 mi_slice contract (pipeline main, f9458b8 + dd88cca): the hub is
// rendering-only, so the honesty rules must hold on hostile input — envelope shape or
// contract mismatch renders instrumenting (never a partial slice), floors and the window
// come from SQL, a below-floor cell's number is suppressed, denominators are the nested
// per-lens SQL objects rendered verbatim, no cross-lens total exists anywhere,
// general_facts stay labelled, and the lead figure renders only when SQL's lead_lag_shown
// is true (all-false is the correct null state, rendered plainly). No reference to the
// dropped cohort tier column may exist anywhere on this surface.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHeatmap,
  buildLeadLag,
  parseMiEnvelope,
  THEME_WEEK_LENSES,
  formatIsoWeek,
  parseIsoWeek,
  windowWeekList,
} from "../../../src/lib/market-intel/slices.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const themeWeekFixture = JSON.parse(
  readFileSync(join(HERE, "theme-week.fixture.json"), "utf8"),
);
const leadLagFixture = JSON.parse(
  readFileSync(join(HERE, "lead-lag.fixture.json"), "utf8"),
);

function cell(heatmap, theme, lens) {
  const row = heatmap.rows.find((r) => r.theme === theme);
  return row?.cells[lens];
}

// --- envelope contract: a mismatch renders instrumenting, never a partial slice ---

test("parseMiEnvelope rejects a bare array — 0016 returns an envelope", () => {
  assert.equal(parseMiEnvelope(themeWeekFixture.invalid_bare_array, "mi.theme_week"), null);
});

test("parseMiEnvelope rejects an envelope without a window — the anchor is part of the contract", () => {
  assert.equal(parseMiEnvelope(themeWeekFixture.invalid_missing_window, "mi.theme_week"), null);
});

test("parseMiEnvelope rejects a payload whose view differs from the requested view", () => {
  assert.equal(parseMiEnvelope(themeWeekFixture.invalid_wrong_view, "mi.theme_week"), null);
});

test("parseMiEnvelope rejects a row with a malformed iso_week", () => {
  assert.equal(parseMiEnvelope(themeWeekFixture.invalid_malformed_iso_week, "mi.theme_week"), null);
});

test("parseMiEnvelope rejects a job-lens row — theme_week excludes the job lens (YED-149)", () => {
  assert.equal(parseMiEnvelope(themeWeekFixture.invalid_unknown_lens, "mi.theme_week"), null);
});

test("parseMiEnvelope rejects a row outside the SQL-declared window — no clip-and-render", () => {
  assert.equal(parseMiEnvelope(themeWeekFixture.invalid_row_outside_window, "mi.theme_week"), null);
});

test("parseMiEnvelope rejects a denominators object that is not the nested 0016 shape", () => {
  assert.equal(parseMiEnvelope(themeWeekFixture.invalid_denominator_shape, "mi.theme_week"), null);
});

test("parseMiEnvelope rejects a lead/lag row without SQL's lead_lag_shown verdict", () => {
  assert.equal(parseMiEnvelope(leadLagFixture.invalid_shown_missing, "mi.theme_lead_lag"), null);
});

test("parseMiEnvelope rejects a lead/lag row with a malformed first-seen date", () => {
  assert.equal(parseMiEnvelope(leadLagFixture.invalid_bad_date, "mi.theme_lead_lag"), null);
});

// --- valid envelopes parse and the fold honors the merged contract ---

test("a valid theme_week envelope parses and the weeks enumerate from SQL's from_week..to_week", () => {
  const envelope = parseMiEnvelope(themeWeekFixture.valid, "mi.theme_week");
  assert.ok(envelope);
  assert.deepEqual(windowWeekList(envelope.window), [
    "2026-W38", "2026-W39", "2026-W40", "2026-W41",
    "2026-W42", "2026-W43", "2026-W44", "2026-W45",
  ]);
});

test("buildHeatmap sums weekly rows per lens and never produces a cross-lens total", () => {
  const heatmap = buildHeatmap(parseMiEnvelope(themeWeekFixture.valid, "mi.theme_week"));
  assert.deepEqual(heatmap.lenses, THEME_WEEK_LENSES);
  // Agent infra attended = W45(4) + W44(2)
  assert.equal(cell(heatmap, "Agent infra", "attended").facts, 6);
  assert.equal(cell(heatmap, "Agent infra", "market").facts, 5);
  for (const row of heatmap.rows) {
    assert.equal(row.cells.all, undefined, "no cross-lens aggregate may exist");
  }
});

test("a cell under the three-fact floor renders insufficient_data with its count zeroed", () => {
  const heatmap = buildHeatmap(parseMiEnvelope(themeWeekFixture.valid, "mi.theme_week"));
  // Eval tooling attended total is 1 (< FACT_FLOOR) even though the weekly row said ok-basis.
  const c = cell(heatmap, "Eval tooling", "attended");
  assert.equal(c.status, "insufficient_data");
  assert.equal(c.facts, 0);
});

test("general_facts stay labelled per cell — never merged away, never a separate theme", () => {
  const heatmap = buildHeatmap(parseMiEnvelope(themeWeekFixture.valid, "mi.theme_week"));
  const market = cell(heatmap, "Agent infra", "market");
  assert.equal(market.generalFacts, 2);
  assert.equal(market.facts, 5, "general facts are part of the cell, labelled separately");
});

test("theme_resolved = seed propagates as the approximate-slice badge", () => {
  const heatmap = buildHeatmap(parseMiEnvelope(themeWeekFixture.valid, "mi.theme_week"));
  assert.equal(heatmap.rows.find((r) => r.theme === "Eval tooling").seedResolved, true);
  assert.equal(heatmap.rows.find((r) => r.theme === "Agent infra").seedResolved, false);
});

test("distinct_companies/sources fold to the window max — distinct counts are not summable", () => {
  const heatmap = buildHeatmap(parseMiEnvelope(themeWeekFixture.valid, "mi.theme_week"));
  // Agent infra attended weeks had 3 and 2 distinct companies; window max is 3, not 5.
  assert.equal(cell(heatmap, "Agent infra", "attended").companies, 3);
});

test("buildLeadLag renders the 0016-signed figure only when SQL's lead_lag_shown is true", () => {
  const leadLag = buildLeadLag(parseMiEnvelope(leadLagFixture.valid, "mi.theme_lead_lag"));
  const shown = leadLag.rows.find((r) => r.theme === "Agent infra");
  assert.equal(shown.shown, true);
  assert.equal(shown.marketLeadWeeks, 7.0);
  // Eval tooling: SQL says false, so the figure is not carried — but the theme still appears.
  const gated = leadLag.rows.find((r) => r.theme === "Eval tooling");
  assert.equal(gated.shown, false);
  assert.equal(gated.marketLeadWeeks, null);
  assert.ok(leadLag.rows.some((r) => r.theme === "Eval tooling"));
  // Rooms-only theme: null lead + shown=false renders plainly like any other floored row.
  const roomsOnly = leadLag.rows.find((r) => r.theme === "Rooms-only theme");
  assert.equal(roomsOnly.shown, false);
  assert.equal(roomsOnly.marketLeadWeeks, null);
});

// --- hygiene: 0016 dropped company_cohort.target_tier — no reference may remain ---

test("no target_tier reference exists in the market-intel surface", () => {
  const surfaceRoot = join(HERE, "../../../src/lib/market-intel");
  const files = [
    join(surfaceRoot, "slices.mjs"),
    join(surfaceRoot, "client.ts"),
    join(HERE, "../../../src/app/ops/market-intel/page.tsx"),
    join(HERE, "theme-week.fixture.json"),
    join(HERE, "lead-lag.fixture.json"),
  ];
  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /target_tier/, `${file} mentions target_tier`);
  }
});

// --- ISO-8601 helpers: the Thursday rule and the 53-week edge ---

test("formatIsoWeek derives the week-year from the week's Thursday (ISO 8601)", () => {
  // Monday 2025-12-29 opens the week containing Thu 2026-01-01 → 2026-W01.
  assert.equal(formatIsoWeek(parseIsoWeek("2026-W01")), "2026-W01");
  assert.equal(parseIsoWeek("2026-W01"), Date.parse("2025-12-29T00:00:00Z"));
});

test("parseIsoWeek rejects a W53 label in a year that has no W53 (round-trip guard)", () => {
  assert.equal(parseIsoWeek("2025-W53"), null);
  assert.ok(parseIsoWeek("2020-W53"), "2020 does have a W53");
});
