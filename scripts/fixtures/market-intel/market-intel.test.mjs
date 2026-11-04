// Selftest for src/lib/market-intel/slices.mjs (YED-304 Phase A hub heatmap) against the
// migration-0016 mi_slice envelope contract: the hub is rendering-only, so the honesty
// rules must hold on hostile input — envelope shape or contract mismatch renders
// instrumenting (never a partial slice), floors come from SQL's floor_flag, a floored
// cell's number is suppressed, denominators render verbatim per lens, no cross-lens
// total exists anywhere, (general)-topic counts stay labelled, and the lead sign is the
// 0016-pinned market_lead_weeks (positive = the market led), floored leads suppressed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHeatmap,
  buildLeadLag,
  parseMiEnvelope,
  LENSES,
  weekLabelForDate,
} from "../../../src/lib/market-intel/slices.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const themeWeekFixture = JSON.parse(
  readFileSync(join(HERE, "theme-week.fixture.json"), "utf8"),
);
const leadLagFixture = JSON.parse(
  readFileSync(join(HERE, "lead-lag.fixture.json"), "utf8"),
);

function cell(heatmap, theme, lens, { general = false } = {}) {
  const row = heatmap.rows.find((r) => r.theme === theme && r.isGeneral === general);
  return row?.cells[lens];
}

// --- envelope contract: a mismatch renders instrumenting, never a partial slice ---

test("parseMiEnvelope rejects a bare array — 0016 returns an envelope", () => {
  assert.equal(parseMiEnvelope(themeWeekFixture.invalid_bare_array), null);
});

test("parseMiEnvelope rejects an envelope without window — the anchor is part of the contract", () => {
  assert.equal(parseMiEnvelope(themeWeekFixture.invalid_missing_window), null);
});

test("parseMiEnvelope rejects a lens whose denominator is missing (§3.3 rule 2)", () => {
  assert.equal(parseMiEnvelope(themeWeekFixture.invalid_denominator_gap), null);
});

test("parseMiEnvelope rejects the blended lens 'all' — lenses are never summed", () => {
  assert.equal(parseMiEnvelope(themeWeekFixture.invalid_blended_lens), null);
});

test("parseMiEnvelope rejects a row outside the declared window — mismatch, not silent clipping", () => {
  assert.equal(parseMiEnvelope(themeWeekFixture.invalid_row_outside_window), null);
});

test("parseMiEnvelope rejects malformed rows — nothing is dropped silently", () => {
  const envelope = structuredClone(themeWeekFixture.heatmap_envelope);
  envelope.rows[0].facts = "many";
  assert.equal(parseMiEnvelope(envelope), null);
});

// --- heatmap fold ---

test("buildHeatmap has no cross-lens total — not omitted, structurally absent", () => {
  const heat = buildHeatmap(themeWeekFixture.heatmap_envelope);
  for (const row of heat.rows) {
    assert.deepEqual(Object.keys(row.cells).filter((k) => !LENSES.includes(k)), []);
  }
  assert.equal(heat.lenses.join(","), LENSES.join(","));
});

test("buildHeatmap sums unfloored rows over the window and keeps the SQL floor verdict", () => {
  const heat = buildHeatmap(themeWeekFixture.heatmap_envelope);
  const attended = cell(heat, "Agentic infrastructure", "attended");
  assert.equal(attended.facts, 7); // 4 (W45) + 3 (W44), both floor_flag ok
  assert.equal(attended.status, "ok");
});

test("buildHeatmap renders a floored-only cell as insufficient_data with the number suppressed", () => {
  const heat = buildHeatmap(themeWeekFixture.heatmap_envelope);
  const floored = cell(heat, "Inference cost curves", "attended");
  assert.equal(floored.status, "insufficient_data");
  // slice.py suppresses the number — the fold must not carry a displayable count.
  assert.equal(floored.facts, 0);
});

test("buildHeatmap floors a surviving total under the 3-fact floor", () => {
  const heat = buildHeatmap(themeWeekFixture.heatmap_envelope);
  // Only 2 unfloored general-topic facts — under FACT_FLOOR even though floor_flag is ok.
  const general = cell(heat, "Agentic infrastructure", "market", { general: true });
  assert.equal(general.status, "insufficient_data");
  assert.equal(general.facts, 0);
});

test("buildHeatmap keeps (general)-topic counts a labelled separate group, never merged", () => {
  const heat = buildHeatmap(themeWeekFixture.heatmap_envelope);
  const named = cell(heat, "Agentic infrastructure", "market");
  const general = cell(heat, "Agentic infrastructure", "market", { general: true });
  assert.equal(named.facts, 9);
  assert.equal(general.generalFacts, 2); // labelled, folded nowhere into the named cell
  assert.equal(named.generalFacts, 0);
});

test("buildHeatmap anchors the window on today and prints the declared week range", () => {
  const heat = buildHeatmap(themeWeekFixture.heatmap_envelope);
  assert.equal(heat.anchoredOn, "2026-11-02");
  assert.deepEqual(heat.weeks, themeWeekFixture.heatmap_envelope.window.weeks);
  assert.equal(heat.weeks.length, 8);
});

test("buildHeatmap derives the trailing calendar window from anchored_on when SQL omits weeks", () => {
  const heat = buildHeatmap(themeWeekFixture.derived_window_envelope);
  assert.equal(heat.weeks[0], "2026-W38"); // 8 calendar weeks ending at the anchor
  assert.equal(heat.weeks.at(-1), "2026-W45"); // 2026-11-02 is a Monday of W45
  assert.equal(heat.weeks.length, 8);
});

test("weekLabelForDate maps an ISO date to its ISO week", () => {
  assert.equal(weekLabelForDate("2026-11-02"), "2026-W45");
  assert.equal(weekLabelForDate("2026-01-01"), "2026-W01"); // Thursday — ISO week 1
});

test("buildHeatmap passes SQL denominators through verbatim, per lens", () => {
  const heat = buildHeatmap(themeWeekFixture.heatmap_envelope);
  assert.equal(heat.denominators.attended, themeWeekFixture.heatmap_envelope.denominators.attended);
  assert.equal(heat.denominators.market, themeWeekFixture.heatmap_envelope.denominators.market);
});

// --- lead/lag strip: the 0016 sign, floored leads suppressed ---

test("buildLeadLag reads market_lead_weeks with the 0016 sign — positive means the market led", () => {
  const leadLag = buildLeadLag(leadLagFixture.leadlag_envelope);
  assert.deepEqual(leadLag.visible, [
    { theme: "Agent protocols", marketLeadWeeks: 6 }, // positive = market led
    { theme: "Room-led theme", marketLeadWeeks: -3 }, // negative = rooms led
  ]);
});

test("buildLeadLag suppresses a floored lead as 'no information (floor)' — number never shown", () => {
  const leadLag = buildLeadLag(leadLagFixture.leadlag_envelope);
  assert.deepEqual(leadLag.gated, [{ theme: "Context engineering", reason: "floor" }]);
  assert.equal(leadLag.visible.find((r) => r.theme === "Context engineering"), undefined);
});

test("buildLeadLag ignores rows without a lead figure", () => {
  const leadLag = buildLeadLag(leadLagFixture.leadlag_envelope);
  assert.equal(leadLag.visible.find((r) => r.theme === "No lead field"), undefined);
  assert.equal(leadLag.gated.find((r) => r.theme === "No lead field"), undefined);
});
