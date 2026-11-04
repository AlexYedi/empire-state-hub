// Selftest for src/lib/market-intel/slices.mjs (YED-304 Phase A hub heatmap): the
// market-lens proposal's honesty rules must hold on hostile input — floor before labels,
// no cross-lens total anywhere, lead/lag visible only outside the permutation-null band
// with both lenses above floor, malformed rows dropped rather than faked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHeatmap, buildLeadLag, deriveCellStatus, FACT_FLOOR, LENSES } from "../../../src/lib/market-intel/slices.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const themeWeekFixture = JSON.parse(
  readFileSync(join(HERE, "theme-week.fixture.json"), "utf8"),
);
const leadLagFixture = JSON.parse(
  readFileSync(join(HERE, "lead-lag.fixture.json"), "utf8"),
);

function cell(heatmap, themeId, lens) {
  const row = heatmap.rows.find((r) => r.themeId === themeId);
  return row?.cells[lens];
}

test("deriveCellStatus floors at 3 facts and separates no_information from insufficient_data", () => {
  assert.equal(deriveCellStatus(2), "insufficient_data");
  assert.equal(deriveCellStatus(FACT_FLOOR - 1), "insufficient_data");
  assert.equal(deriveCellStatus(FACT_FLOOR), "ok");
  assert.equal(deriveCellStatus(0), "insufficient_data");
  assert.equal(deriveCellStatus(null), "no_information");
  assert.equal(deriveCellStatus(undefined), "no_information");
  assert.equal(deriveCellStatus(Number.NaN), "no_information");
});

test("buildHeatmap sums per lens within the window and statuses each cell", () => {
  const { anchor, windowWeeks } = themeWeekFixture.window;
  const heat = buildHeatmap(themeWeekFixture.theme_week, { windowWeeks, now: anchor });

  // t-agentic: attended 2+1=3 (floor), market 3+2=5 (ok), no research/job rows.
  assert.equal(cell(heat, "t-agentic", "attended").facts, 3);
  assert.equal(cell(heat, "t-agentic", "attended").status, "ok");
  assert.equal(cell(heat, "t-agentic", "market").facts, 5);
  assert.equal(cell(heat, "t-agentic", "market").status, "ok");
  assert.equal(cell(heat, "t-agentic", "research"), undefined);
  assert.equal(cell(heat, "t-agentic", "job"), undefined);

  // t-inference: research 6, attended 4 — both above floor; resolved via the seed fallback.
  assert.equal(cell(heat, "t-inference", "research").facts, 6);
  assert.equal(cell(heat, "t-inference", "attended").facts, 4);
  const inferenceRow = heat.rows.find((r) => r.themeId === "t-inference");
  assert.equal(inferenceRow.themeResolved, "seed");
});

test("buildHeatmap clips the window to the trailing calendar weeks around the anchor", () => {
  const { anchor, windowWeeks: count } = themeWeekFixture.window;
  const heat = buildHeatmap(themeWeekFixture.theme_week, { windowWeeks: count, now: anchor });
  // Time-based window: 8 calendar weeks ending at the anchor, gaps included —
  // never "the last N weeks that have data".
  assert.equal(heat.weeks.length, count);
  assert.equal(heat.weeks[0], "2026-W34");
  assert.equal(heat.weeks.at(-1), "2026-W41");
  // 2026-W20 (9 facts) is outside the window and must not appear anywhere.
  assert.equal(heat.rows.find((r) => r.themeId === "t-old"), undefined);
});

test("buildHeatmap has no cross-lens total — not omitted, structurally absent", () => {
  const { anchor, windowWeeks } = themeWeekFixture.window;
  const heat = buildHeatmap(themeWeekFixture.theme_week, { windowWeeks, now: anchor });
  assert.deepEqual(heat.lenses, LENSES);
  for (const row of heat.rows) {
    assert.deepEqual(Object.keys(row.cells).filter((k) => !LENSES.includes(k)), []);
    for (const c of Object.values(row.cells)) {
      assert.equal(typeof c.facts, "number");
      assert.ok(
        c.status === "ok" || c.status === "insufficient_data",
        `unexpected cell status ${c.status}`,
      );
      // No aggregate keys smuggled into cells.
      assert.deepEqual(Object.keys(c).sort(), ["facts", "status"]);
    }
  }
});

test("buildHeatmap drops malformed rows instead of faking them", () => {
  const { anchor, windowWeeks } = themeWeekFixture.window;
  const heat = buildHeatmap(themeWeekFixture.theme_week, { windowWeeks, now: anchor });
  // Unknown lens, empty theme_id, negative facts, non-object — all dropped.
  assert.equal(heat.rows.find((r) => r.themeId === "t-unknown"), undefined);
  assert.equal(heat.rows.find((r) => r.themeId === ""), undefined);
  assert.equal(heat.rows.find((r) => r.themeId === "t-neg"), undefined);
  assert.equal(heat.rows.length, 2);
});

test("buildHeatmap is honest on empty or garbage input", () => {
  for (const garbage of [[], null, undefined, [null], ["x"], 42]) {
    const heat = buildHeatmap(garbage);
    assert.deepEqual(heat.rows, []);
    assert.deepEqual(heat.weeks, []);
    assert.deepEqual(Object.keys(heat.denominators), []);
  }
});

test("buildHeatmap carries per-lens denominators, never a cross-lens denominator", () => {
  const { anchor, windowWeeks } = themeWeekFixture.window;
  const heat = buildHeatmap(themeWeekFixture.theme_week, { windowWeeks, now: anchor });
  assert.equal(heat.denominators.attended, 84);
  assert.equal(heat.denominators.market, 40);
  assert.equal(heat.denominators.research, 12);
  assert.equal(heat.denominators.job, undefined);
  assert.deepEqual(Object.keys(heat.denominators).filter((k) => !LENSES.includes(k)), []);
});

test("buildLeadLag shows only leads outside the null band with both lenses above floor", () => {
  const { visible, gated } = buildLeadLag(leadLagFixture.lead_lag);

  // t-agentic: 3/5 facts, lead 4, band [-1, 1] → visible.
  assert.equal(visible.length, 1);
  assert.equal(visible[0].themeId, "t-agentic");
  assert.equal(visible[0].leadWeeks, 4);
  assert.deepEqual(visible[0].band, [-1, 1]);

  // t-inference: inside the band; t-thin: attended below floor; t-noband: null band.
  assert.equal(gated.length, 3);
  const reasons = Object.fromEntries(gated.map((g) => [g.theme, g.reason]));
  assert.equal(reasons["Inference cost curves"], "within_null_band");
  assert.equal(reasons["Thin theme"], "insufficient_data");
  assert.equal(reasons["No band theme"], "no_information");
});

test("buildLeadLag gates everything when input is empty or garbage", () => {
  for (const garbage of [[], null, undefined, [{}], 7]) {
    const { visible, gated } = buildLeadLag(garbage);
    assert.equal(visible.length, 0);
    assert.equal(gated.length, 0);
  }
});
