// Pure rendering-layer folds over validated mi_slice envelopes (migration 0016, ADR-13).
// The hub is rendering-only: SQL owns the floor, the denominators and the window — this
// module never re-derives them, never sums across lenses, and never surfaces a number the
// SQL floored. Rules mirrored from slice.py / docs/proposals/2026-11-04-market-lens-and-slices.md §3.3:
//   1. No cross-lens total — a lens cell exists per lens, never an "all" aggregate.
//   2. Denominators arrive per lens from SQL (prose strings) and render verbatim.
//   3. Floors before labels — a floored cell renders "insufficient_data"; a lead figure on
//      a floored row renders "no information (floor)". Numbers are suppressed, never shown
//      "for context".
//   4. A theme's (general) topic counts are labelled, never merged into named-topic counts.
//   5. 0016 pins the lead sign: market_lead_weeks = attended_first_seen − market_first_seen,
//      positive = the market led. Carried as-is; the hub derives no sign.

export const FACT_FLOOR = 3;
export const GENERAL_TOPIC = "(general)";

/** Fixed lens vocabulary and display order (proposal §3.1). @type {readonly string[]} */
export const LENSES = ["attended", "research", "market", "job"];

// ---------------------------------------------------------------------------
// 0016 envelope contract — single validation point, shared by the server client
// and the node selftests. Hand-rolled (no deps): the RPC payload is untrusted and
// the hub fails closed — a contract mismatch renders instrumenting, never a
// partial slice, and no malformed row is silently dropped.
// ---------------------------------------------------------------------------

/** @typedef {{ theme: string, topic?: string, iso_week: string, lens: string,
 *             facts: number, companies?: number, sources?: number, general_facts?: number,
 *             floor_flag: "ok"|"insufficient_data", market_lead_weeks?: number|null }} MiRow */
/** @typedef {{ anchored_on: string, weeks?: string[] }} MiWindow */
/** @typedef {{ view: string, rows: MiRow[], denominators: Record<string,string>, window: MiWindow }} MiEnvelope */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isNonnegNumber(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

function rowDefects(row) {
  if (row == null || typeof row !== "object" || Array.isArray(row)) return "not an object";
  if (typeof row.theme !== "string" || row.theme.length === 0) return "theme missing";
  if (typeof row.iso_week !== "string" || parseIsoWeek(row.iso_week) == null) return "iso_week malformed";
  if (!LENSES.includes(row.lens)) return `unknown lens ${JSON.stringify(row.lens)}`;
  if (!isNonnegNumber(row.facts)) return "facts missing or invalid";
  if (row.floor_flag !== "ok" && row.floor_flag !== "insufficient_data") return "unknown floor_flag";
  for (const k of ["topic", "companies", "sources", "general_facts"]) {
    if (row[k] !== undefined && !isNonnegNumber(row[k]) && typeof row[k] !== "string") {
      return `${k} invalid`;
    }
  }
  if (
    row.market_lead_weeks !== undefined &&
    row.market_lead_weeks !== null &&
    typeof row.market_lead_weeks !== "number"
  ) {
    return "market_lead_weeks invalid";
  }
  return null;
}

/**
 * Validate one mi_slice envelope against the 0016 contract. Beyond the shape, the row
 * contract holds (slice.py rules): a denominator must exist for EVERY lens present in
 * rows, and every row's iso_week must fall inside the declared window. Any violation is
 * a contract mismatch → null → the surface renders instrumenting.
 * @param {unknown} payload
 * @returns {MiEnvelope|null}
 */
export function parseMiEnvelope(payload) {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = /** @type {Record<string, unknown>} */ (payload);
  if (typeof p.view !== "string" || !/^mi\.[a-z_]+$/.test(p.view)) return null;
  if (!Array.isArray(p.rows)) return null;
  if (p.window == null || typeof p.window !== "object" || Array.isArray(p.window)) return null;
  const window = /** @type {Record<string, unknown>} */ (p.window);
  if (typeof window.anchored_on !== "string" || !ISO_DATE_RE.test(window.anchored_on)) return null;
  if (window.weeks !== undefined) {
    if (!Array.isArray(window.weeks) || window.weeks.some((w) => typeof w !== "string" || parseIsoWeek(w) == null)) {
      return null;
    }
  }
  if (p.denominators == null || typeof p.denominators !== "object" || Array.isArray(p.denominators)) return null;
  const denominators = /** @type {Record<string, unknown>} */ (p.denominators);

  /** @type {MiRow[]} */
  const rows = [];
  for (const raw of p.rows) {
    const defect = rowDefects(raw);
    if (defect) return null;
    rows.push(/** @type {MiRow} */ (raw));
  }

  // Denominators per lens — a rate without its denominator is a contract error (§3.3 rule 2).
  for (const row of rows) {
    const den = denominators[row.lens];
    if (typeof den !== "string" || den.length === 0) return null;
  }

  // Rows outside the declared window are a mismatch, not a clip-and-render.
  if (Array.isArray(window.weeks)) {
    const weeks = new Set(/** @type {string[]} */ (window.weeks));
    if (rows.some((r) => !weeks.has(r.iso_week))) return null;
  }

  return {
    view: p.view,
    rows,
    denominators: /** @type {Record<string,string>} */ ({ ...denominators }),
    window: /** @type {MiWindow} */ ({
      anchored_on: window.anchored_on,
      ...(Array.isArray(window.weeks) ? { weeks: /** @type {string[]} */ (window.weeks) } : {}),
    }),
  };
}

// ---------------------------------------------------------------------------
// ISO-8601 week helpers ("2026-W44"). Labels sort lexicographically in time order.
// ---------------------------------------------------------------------------

/** Monday of ISO week `week` of `year`, as UTC ms. ISO week 1 is the week containing Jan 4. */
function isoWeekMonday(year, week) {
  const jan4 = Date.UTC(year, 0, 4);
  const jan4Dow = new Date(jan4).getUTCDay() || 7; // Mon=1 … Sun=7
  const week1Monday = jan4 - (jan4Dow - 1) * 86400000;
  return week1Monday + (week - 1) * 7 * 86400000;
}

/** Format a UTC-ms week Monday as an ISO week label. The week-year is taken from the
 * week's Thursday (ISO 8601) so a week straddling Dec 31 labels correctly. */
export function formatIsoWeek(mondayMs) {
  const weekYear = new Date(mondayMs + 3 * 86400000).getUTCFullYear();
  const jan4 = Date.UTC(weekYear, 0, 4);
  const jan4Dow = new Date(jan4).getUTCDay() || 7;
  const week1Monday = jan4 - (jan4Dow - 1) * 86400000;
  const week = Math.round((mondayMs - week1Monday) / (7 * 86400000)) + 1;
  return `${weekYear}-W${String(week).padStart(2, "0")}`;
}

/** Parse an ISO week label → UTC ms of its Monday, or null when malformed. */
export function parseIsoWeek(label) {
  const match = /^(\d{4})-W(\d{2})$/.exec(label ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;
  const monday = isoWeekMonday(year, week);
  // Round-trip guard (the 53-week edge: some years have no W53).
  return formatIsoWeek(monday) === label ? monday : null;
}

/** ISO week label containing the given ISO date ("2026-11-02"). */
export function weekLabelForDate(dateIso) {
  const ms = Date.parse(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms);
  const day = d.getUTCDay() || 7;
  return formatIsoWeek(ms + (1 - day) * 86400000);
}

/**
 * The heatmap window's week labels: SQL declares the window; when it ships weeks we use
 * them verbatim, else we derive the trailing calendar window from window.anchored_on —
 * the anchor is TODAY, so a stalled pipeline reads as mostly-empty, not as fresh.
 * @param {{ anchored_on: string, weeks?: string[] }} window
 * @param {number} count
 * @returns {string[]}
 */
export function windowWeekList(window, count) {
  if (window.weeks && window.weeks.length > 0) return [...window.weeks].sort();
  const anchorLabel = weekLabelForDate(window.anchored_on);
  if (!anchorLabel) return [];
  const anchorMs = parseIsoWeek(anchorLabel);
  if (anchorMs == null || count < 1) return [];
  const startMs = anchorMs - (count - 1) * 7 * 86400000;
  const out = [];
  for (let ms = startMs; ms <= anchorMs; ms += 7 * 86400000) {
    out.push(formatIsoWeek(ms));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Heatmap fold
// ---------------------------------------------------------------------------

/**
 * @typedef {{ facts: number, generalFacts: number, companies: number|null, sources: number|null,
 *             status: "ok"|"insufficient_data" }} HeatmapCell
 * @typedef {{ theme: string, isGeneral: boolean, cells: Record<string, HeatmapCell|null> }} HeatmapRow
 * @typedef {{ lenses: string[], weeks: string[], anchoredOn: string, denominators: Record<string,string>,
 *             rows: HeatmapRow[] }} Heatmap
 */

/**
 * Fold a validated mi.theme_week envelope into a theme × lens matrix. Rows outside the
 * declared window cannot occur (the envelope parser rejects them). Floored weekly rows are
 * suppressed by SQL — their counts are never folded into a visible number; a cell renders
 * "insufficient_data" unless enough unfloored facts remain over the window.
 *
 * No cross-lens aggregate is ever produced — not omitted, structurally absent.
 * @param {import("./schema").MiEnvelope} envelope
 * @returns {Heatmap}
 */
export function buildHeatmap(envelope) {
  const weeks = windowWeekList(envelope.window, 8);
  const weekSet = new Set(weeks);
  const inWindow = envelope.rows.filter((r) => weekSet.has(r.iso_week));

  /** @type {Map<string, HeatmapRow>} */
  const byKey = new Map();

  for (const row of inWindow) {
    // (general)-topic counts stay their own labelled group — never merged (PR #267 rule).
    const isGeneral = row.topic === GENERAL_TOPIC;
    const key = `${row.theme}::${isGeneral ? GENERAL_TOPIC : "-"}`;
    let themeRow = byKey.get(key);
    if (!themeRow) {
      themeRow = { theme: row.theme, isGeneral, cells: {} };
      byKey.set(key, themeRow);
    }

    if (row.floor_flag === "insufficient_data") {
      // SQL floored this week — its number is suppressed, but the cell still exists and
      // reads insufficient_data (a floored cell is data honesty, not absence).
      themeRow.cells[row.lens] ??= {
        facts: 0,
        generalFacts: 0,
        companies: null,
        sources: null,
        status: "insufficient_data",
      };
      continue;
    }

    const cell = themeRow.cells[row.lens] ?? {
      facts: 0,
      generalFacts: 0,
      companies: null,
      sources: null,
      status: "ok",
    };
    cell.facts += row.facts;
    cell.generalFacts += row.general_facts ?? 0;
    if (row.companies != null) {
      cell.companies = (cell.companies ?? 0) + row.companies;
    }
    if (row.sources != null) {
      cell.sources = (cell.sources ?? 0) + row.sources;
    }
    themeRow.cells[row.lens] = cell;
  }

  // Floors before labels: status is recomputed from the surviving total — a floored-only
  // cell that gains enough unfloored facts upgrades, a thin total downgrades — and a
  // suppressed cell carries no displayable number (slice.py: never "for context").
  const out = [...byKey.values()].map((row) => {
    for (const lens of LENSES) {
      const cell = row.cells[lens];
      if (cell) {
        row.cells[lens] =
          cell.facts >= FACT_FLOOR
            ? { ...cell, status: "ok" }
            : { ...cell, facts: 0, status: "insufficient_data" };
      }
    }
    return row;
  });

  // Display order: strongest single-lens count first (never a cross-lens sum), then name.
  out.sort((a, b) => {
    const maxA = Math.max(...LENSES.map((l) => a.cells[l]?.facts ?? 0));
    const maxB = Math.max(...LENSES.map((l) => b.cells[l]?.facts ?? 0));
    return maxB - maxA || a.theme.localeCompare(b.theme);
  });

  return {
    lenses: [...LENSES],
    weeks,
    anchoredOn: envelope.window.anchored_on,
    denominators: envelope.denominators,
    rows: out,
  };
}

// ---------------------------------------------------------------------------
// Lead/lag strip
// ---------------------------------------------------------------------------

/**
 * @typedef {{ theme: string, marketLeadWeeks: number }} VisibleLeadRow
 * @typedef {{ theme: string, reason: "floor" }} GatedLeadRow
 * @typedef {{ visible: VisibleLeadRow[], gated: GatedLeadRow[] }} LeadLag
 */

/**
 * Lead/lag rows carry the 0016-signed `market_lead_weeks` (positive = the market led).
 * A lead on a floored row renders "no information (floor)" — the number is suppressed.
 * SQL owns the visibility verdict (floor_flag); the hub derives nothing.
 * @param {MiEnvelope} envelope
 * @returns {LeadLag}
 */
export function buildLeadLag(envelope) {
  const visible = [];
  const gated = [];
  for (const row of envelope.rows) {
    if (row.market_lead_weeks == null) continue;
    if (row.floor_flag === "ok") {
      visible.push({ theme: row.theme, marketLeadWeeks: row.market_lead_weeks });
    } else {
      gated.push({ theme: row.theme, reason: "floor" });
    }
  }
  return { visible, gated };
}

