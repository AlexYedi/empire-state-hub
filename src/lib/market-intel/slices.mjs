// Pure slice logic for the market-intel heatmap. The proposal's honesty rules as code
// (docs/proposals/2026-11-04-market-lens-and-slices.md, pipeline commit 622a221, §3.3):
//   1. Never sum across lenses — the matrix has no total column, by construction.
//   2. Denominators per lens — carried beside the counts, never a cross-lens ratio.
//   3. Floors before labels — a theme × lens cell below FACT_FLOOR facts in the window
//      is `insufficient_data`; lead/lag renders only when both lenses clear the floor
//      AND the observed lead sits outside the permutation-null band.
// Plain ESM + JSDoc (no TS): exercised directly by node --test on Node 20
// (scripts/fixtures/market-intel/market-intel.test.mjs). No I/O, deterministic.

/**
 * Fixed lens vocabulary and display order (proposal §3.1).
 * @type {readonly ["attended", "research", "market", "job"]}
 */
export const LENSES = /** @type {const} */ (["attended", "research", "market", "job"]);

/** A theme × lens cell below this many facts in the window is insufficient_data (§3.3 rule 3). */
export const FACT_FLOOR = 3;

/**
 * @typedef {"ok" | "insufficient_data" | "no_information"} CellStatus
 */

/**
 * @typedef {Object} ThemeWeekRow
 * @property {string} theme_id
 * @property {string} theme
 * @property {string} lens                one of LENSES
 * @property {string} iso_week            e.g. "2026-W44"; lexicographic order == chronological
 * @property {number} facts
 * @property {number|null} [distinct_companies]
 * @property {number|null} [distinct_sources]
 * @property {number|null} [denominator]  per-lens denominator for the week (§3.3 rule 2)
 * @property {"live"|"seed"|null} [theme_resolved]  "seed" = resolved via the pre-history fallback
 */

/**
 * @typedef {Object} HeatmapCell
 * @property {number} facts      summed over the window for this theme × lens
 * @property {CellStatus} status
 */

/**
 * @typedef {Object} HeatmapRow
 * @property {string} themeId
 * @property {string} theme
 * @property {"live"|"seed"} themeResolved  "seed" if any contributing row resolved via fallback
 * @property {Partial<Record<typeof LENSES[number], HeatmapCell>>} cells  missing lens = no row at all
 */

/**
 * @typedef {Object} Heatmap
 * @property {typeof LENSES} lenses
 * @property {string[]} weeks   window weeks, ascending
 * @property {HeatmapRow[]} rows
 * @property {Partial<Record<typeof LENSES[number], number|null>>} denominators  per-lens max over the window
 */

/**
 * Cell status from a fact count. A missing/null count means the slice has no
 * information at all — distinct from a measured-but-below-floor count.
 * @param {number|null|undefined} facts
 * @returns {CellStatus}
 */
export function deriveCellStatus(facts) {
  if (facts == null || !Number.isFinite(facts)) return "no_information";
  return facts >= FACT_FLOOR ? "ok" : "insufficient_data";
}

/** Structural validity — malformed rows are dropped, not faked. */
function isValidThemeWeekRow(row) {
  return (
    row != null &&
    typeof row.theme_id === "string" &&
    row.theme_id.length > 0 &&
    typeof row.theme === "string" &&
    row.theme.length > 0 &&
    typeof row.lens === "string" &&
    LENSES.includes(row.lens) &&
    typeof row.iso_week === "string" &&
    row.iso_week.length > 0 &&
    typeof row.facts === "number" &&
    Number.isFinite(row.facts) &&
    row.facts >= 0
  );
}

// ISO-8601 week labels ("2026-W41") sort lexicographically in time order. The window is
// TIME-based — `windowWeeks` calendar weeks back from the anchor, gaps included — never
// "the last N weeks that happen to have data": a stalled pipeline must show an honest,
// mostly-empty window, not one that silently widens to reach old rows.

/** Monday of ISO week `week` of `year`, as a UTC-date ms value. */
function isoWeekMonday(year, week) {
  // ISO week 1 is the week containing Jan 4 (ISO 8601).
  const jan4 = Date.UTC(year, 0, 4);
  const jan4Dow = new Date(jan4).getUTCDay() || 7; // Mon=1 … Sun=7
  const week1Monday = jan4 - (jan4Dow - 1) * 86400000;
  return week1Monday + (week - 1) * 7 * 86400000;
}

/**
 * Parse an ISO week label → UTC ms of its Monday, or null when malformed.
 * @returns {number|null}
 */
export function parseIsoWeek(label) {
  const match = /^(\d{4})-W(\d{2})$/.exec(label ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;
  const monday = isoWeekMonday(year, week);
  // Round-trip guard (the 53-week edge: some years have no W53).
  if (formatIsoWeek(monday) !== label) return null;
  return monday;
}

/** Format a UTC-ms Monday as an ISO week label. */
export function formatIsoWeek(mondayMs) {
  const d = new Date(mondayMs);
  const jan4 = Date.UTC(d.getUTCFullYear(), 0, 4);
  const jan4Dow = new Date(jan4).getUTCDay() || 7;
  const week1Monday = jan4 - (jan4Dow - 1) * 86400000;
  const week = Math.round((mondayMs - week1Monday) / (7 * 86400000)) + 1;
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Calendar-window week labels from (anchor − (windowWeeks−1) weeks) through the anchor,
 * inclusive, ascending. Gaps included — the window is time-based.
 * @returns {string[]}
 */
export function windowWeeks(anchorLabel, count) {
  const anchorMs = parseIsoWeek(anchorLabel);
  if (anchorMs == null || count < 1) return [];
  const startMs = anchorMs - (count - 1) * 7 * 86400000;
  const out = [];
  for (let ms = startMs; ms <= anchorMs; ms += 7 * 86400000) {
    out.push(formatIsoWeek(ms));
  }
  return out;
}

/**
 * Fold theme_week rows into a theme × lens matrix over the trailing window of
 * ISO weeks. No cross-lens aggregate is ever produced — not omitted, absent.
 * The window anchor is `now` when given, else the latest week in the data, so a
 * stalled pipeline shows an honest (mostly-empty) window rather than sliding.
 * @param {unknown[]} rows raw theme_week rows (untrusted shapes allowed)
 * @param {{ windowWeeks?: number, now?: string }} [opts]
 * @returns {Heatmap}
 */
export function buildHeatmap(rows, opts = {}) {
  const count = opts.windowWeeks ?? 8;
  const valid = (Array.isArray(rows) ? rows : []).filter(
    (r) => isValidThemeWeekRow(r) && parseIsoWeek(r.iso_week) != null,
  );
  if (valid.length === 0) {
    return { lenses: LENSES, weeks: [], rows: [], denominators: {} };
  }

  // Anchor: opts.now when given, else the latest week in the data — a stalled pipeline
  // shows an honest (mostly-empty) window rather than one that slides forward.
  const anchor = opts.now ?? valid.map((r) => r.iso_week).sort().at(-1);
  const windowWeekList = windowWeeks(anchor, count);
  const windowSet = new Set(windowWeekList);
  const inWindow = valid.filter((r) => windowSet.has(r.iso_week));

  /** @type {Map<string, HeatmapRow>} */
  const byTheme = new Map();
  /** @type {Map<string, number>} */
  const denominators = new Map();

  for (const row of inWindow) {
    let themeRow = byTheme.get(row.theme_id);
    if (!themeRow) {
      themeRow = { themeId: row.theme_id, theme: row.theme, themeResolved: "live", cells: {} };
      byTheme.set(row.theme_id, themeRow);
    }
    if (row.theme_resolved === "seed") themeRow.themeResolved = "seed";

    const cell = themeRow.cells[row.lens] ?? { facts: 0, status: "no_information" };
    cell.facts += row.facts;
    themeRow.cells[row.lens] = cell;

    const den = row.denominator;
    if (den != null && Number.isFinite(den)) {
      const prev = denominators.get(row.lens);
      // The denominator is per week per lens; the window's binding constraint is its max.
      if (prev == null || den > prev) denominators.set(row.lens, den);
    }
  }

  // Display order: strongest single-lens window count first (a cross-lens sum is never
  // computed — §3.3 rule 1), then by name for determinism.
  const out = [...byTheme.values()].sort((a, b) => {
    const maxA = Math.max(...LENSES.map((l) => a.cells[l]?.facts ?? 0));
    const maxB = Math.max(...LENSES.map((l) => b.cells[l]?.facts ?? 0));
    return maxB - maxA || a.theme.localeCompare(b.theme);
  });

  for (const row of out) {
    for (const lens of LENSES) {
      const cell = row.cells[lens];
      if (cell) cell.status = deriveCellStatus(cell.facts);
    }
  }

  return {
    lenses: LENSES,
    weeks: windowWeekList,
    rows: out,
    denominators: Object.fromEntries(denominators),
  };
}

/**
 * @typedef {Object} LeadLagRow
 * @property {string} theme_id
 * @property {string} theme
 * @property {string|null} market_first_seen
 * @property {string|null} attended_first_seen
 * @property {number|null} lead_weeks
 * @property {number|null} band_low
 * @property {number|null} band_high
 * @property {number|null} attended_count_8w
 * @property {number|null} market_count_8w
 */

/**
 * @typedef {Object} VisibleLeadLag
 * @property {string} themeId
 * @property {string} theme
 * @property {number} leadWeeks
 * @property {[number, number]} band
 */

/**
 * @typedef {"insufficient_data"|"no_information"|"within_null_band"} GateReason
 */

/**
 * @typedef {Object} GatedLeadLag
 * @property {string} theme
 * @property {GateReason} reason
 */

/**
 * @typedef {Object} LeadLag
 * @property {VisibleLeadLag[]} visible
 * @property {GatedLeadLag[]} gated
 */

/**
 * Lead/lag visibility gate (§7): show a lead only when both lenses clear the
 * fact floor AND the observed lead falls outside the permutation-null band;
 * otherwise the row stays visible as a named gate reason, so the honest blank
 * reads as data honesty, not a broken pipeline.
 * @param {unknown[]} rows raw theme_lead_lag rows (untrusted shapes allowed)
 * @param {{ floor?: number }} [opts]
 * @returns {LeadLag}
 */
export function buildLeadLag(rows, opts = {}) {
  const floor = opts.floor ?? FACT_FLOOR;
  const valid = (Array.isArray(rows) ? rows : []).filter(
    (r) =>
      r != null && typeof r.theme_id === "string" && r.theme_id.length > 0 &&
      typeof r.theme === "string" && r.theme.length > 0,
  );

  /** @type {VisibleLeadLag[]} */
  const visible = [];
  /** @type {GatedLeadLag[]} */
  const gated = [];

  for (const row of valid) {
    const attendedOk = typeof row.attended_count_8w === "number" && row.attended_count_8w >= floor;
    const marketOk = typeof row.market_count_8w === "number" && row.market_count_8w >= floor;
    const lead = typeof row.lead_weeks === "number" && Number.isFinite(row.lead_weeks) ? row.lead_weeks : null;
    const band =
      typeof row.band_low === "number" && Number.isFinite(row.band_low) &&
      typeof row.band_high === "number" && Number.isFinite(row.band_high)
        ? /** @type {[number, number]} */ ([row.band_low, row.band_high])
        : null;

    if (!attendedOk || !marketOk) {
      gated.push({ theme: row.theme, reason: "insufficient_data" });
      continue;
    }
    if (lead == null || band == null) {
      gated.push({ theme: row.theme, reason: "no_information" });
      continue;
    }
    if (lead >= band[0] && lead <= band[1]) {
      gated.push({ theme: row.theme, reason: "within_null_band" });
      continue;
    }
    visible.push({ themeId: row.theme_id, theme: row.theme, leadWeeks: lead, band });
  }

  return { visible, gated };
}
