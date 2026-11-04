// Pure rendering-layer folds over validated mi_slice envelopes (migration 0016, ADR-13).
// The hub is rendering-only: SQL owns the floor, the denominators and the window — this
// module never re-derives them, never sums across lenses, and never surfaces a number the
// SQL floored. Contract facts mirrored from supabase/migrations/0016_mi_semantic_layer.sql:
//   1. No cross-lens total — a lens cell exists per lens, never an "all" aggregate.
//   2. Denominators arrive per lens from SQL, nested per lens (attended.events,
//      research.briefs, market.facts_by_source/watchlist_*, job.boards_scanned), and render
//      verbatim. The private target-tier list leaves the DB only as aggregate watchlist
//      counts in the market denominators (ADR-13 F1) — never as a row column.
//   3. Floors before labels — floor_flag is SQL's verdict for the trailing-8-week basis; a
//      cell under the FACT_FLOOR renders "insufficient_data", its count zeroed, never shown
//      "for context". lead_lag_shown = false → the lead figure is not rendered; the theme
//      still appears, plainly, as "no information (floor)".
//   4. A theme's (general) topic facts are counted in general_facts — labelled, never merged
//      into named-topic counts and never a separate theme.
//   5. 0016 pins the lead sign: market_lead_weeks = attended_first_seen − market_first_seen,
//      POSITIVE = the market led. Carried as-is; the hub derives no sign. The permutation
//      band is Phase B and does not exist yet.
//   6. The window is {from_week, to_week, anchored_on}, anchored on current_date — never on
//      the latest row — so a stalled pipeline reads as stale.

export const FACT_FLOOR = 3;

/** theme_week's lens vocabulary (migration 0016 §6f: job lens excluded, YED-149). */
export const THEME_WEEK_LENSES = ["attended", "research", "market"];

// ---------------------------------------------------------------------------
// 0016 envelope contract — single validation point, shared by the server client
// and the node selftests. Hand-rolled (no deps): the RPC payload is untrusted and
// the hub fails closed — a contract mismatch renders instrumenting, never a
// partial slice, and no malformed row is silently dropped.
// ---------------------------------------------------------------------------

/** @typedef {{ theme_id: string, theme: string, iso_week: string, lens: string,
 *             facts: number, distinct_companies: number, distinct_sources: number,
 *             general_facts: number, floor_flag: "ok"|"insufficient_data",
 *             theme_resolved: "seed"|"asof" }} ThemeWeekRow */
/** @typedef {{ theme_id: string, theme: string, market_first_seen: string|null,
 *             attended_first_seen: string|null, market_lead_weeks: number|null,
 *             attended_count_8w: number, market_count_8w: number,
 *             lead_lag_shown: boolean }} LeadLagRow */
/** @typedef {{ from_week: string, to_week: string, anchored_on: string }} MiWindow */
/** @typedef {{ attended: {events:number}, research: {briefs:number},
 *             market: {facts_by_source: Record<string,number>, watchlist_covered:number,
 *                      watchlist_size:number},
 *             job: {boards_scanned:number} }} MiDenominators */
/** @typedef {{ view: "mi.theme_week", rows: ThemeWeekRow[], denominators: MiDenominators,
 *             window: MiWindow }} ThemeWeekEnvelope
 * @typedef {{ view: "mi.theme_lead_lag", rows: LeadLagRow[], denominators: MiDenominators,
 *             window: MiWindow }} LeadLagEnvelope
 * @typedef {ThemeWeekEnvelope|LeadLagEnvelope} MiEnvelope */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MI_VIEWS = ["mi.theme_week", "mi.theme_lead_lag"];

function isNonnegInt(v) {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

function nonEmptyString(v) {
  return typeof v === "string" && v.length > 0;
}

function dateOrNull(v) {
  return v === null || (typeof v === "string" && ISO_DATE_RE.test(v));
}

function themeWeekRowDefects(row) {
  if (row == null || typeof row !== "object" || Array.isArray(row)) return "not an object";
  if (!nonEmptyString(row.theme_id)) return "theme_id missing";
  if (!nonEmptyString(row.theme)) return "theme missing";
  if (typeof row.iso_week !== "string" || parseIsoWeek(row.iso_week) == null) return "iso_week malformed";
  if (!THEME_WEEK_LENSES.includes(row.lens)) return `unknown lens ${JSON.stringify(row.lens)}`;
  if (!isNonnegInt(row.facts)) return "facts missing or invalid";
  for (const k of ["distinct_companies", "distinct_sources", "general_facts"]) {
    if (!isNonnegInt(row[k])) return `${k} missing or invalid`;
  }
  if (row.floor_flag !== "ok" && row.floor_flag !== "insufficient_data") return "unknown floor_flag";
  if (row.theme_resolved !== "seed" && row.theme_resolved !== "asof") return "unknown theme_resolved";
  return null;
}

function leadLagRowDefects(row) {
  if (row == null || typeof row !== "object" || Array.isArray(row)) return "not an object";
  if (!nonEmptyString(row.theme_id)) return "theme_id missing";
  if (!nonEmptyString(row.theme)) return "theme missing";
  if (!dateOrNull(row.market_first_seen)) return "market_first_seen invalid";
  if (!dateOrNull(row.attended_first_seen)) return "attended_first_seen invalid";
  if (row.market_lead_weeks !== null && typeof row.market_lead_weeks !== "number") {
    return "market_lead_weeks invalid";
  }
  if (!Number.isFinite(/** @type {number} */ (row.market_lead_weeks ?? 0)) && row.market_lead_weeks !== null) {
    return "market_lead_weeks not finite";
  }
  if (!isNonnegInt(row.attended_count_8w)) return "attended_count_8w missing or invalid";
  if (!isNonnegInt(row.market_count_8w)) return "market_count_8w missing or invalid";
  if (typeof row.lead_lag_shown !== "boolean") return "lead_lag_shown missing or invalid";
  return null;
}

/**
 * Validate the mi_slice denominators object against the 0016 shape. Structural only —
 * the hub renders these verbatim and derives nothing from them.
 * @param {Record<string, unknown>} d
 * @returns {string|null} defect or null
 */
function denominatorsDefects(d) {
  if (d == null || typeof d !== "object" || Array.isArray(d)) return "denominators not an object";
  if (!isNonnegInt(/** @type {any} */ (d.attended)?.events)) return "denominators.attended.events invalid";
  if (!isNonnegInt(/** @type {any} */ (d.research)?.briefs)) return "denominators.research.briefs invalid";
  const market = /** @type {any} */ (d.market);
  if (market == null || typeof market !== "object" || Array.isArray(market)) {
    return "denominators.market not an object";
  }
  if (market.facts_by_source == null || typeof market.facts_by_source !== "object" || Array.isArray(market.facts_by_source)) {
    return "denominators.market.facts_by_source invalid";
  }
  for (const [src, n] of Object.entries(market.facts_by_source)) {
    if (!nonEmptyString(src) || !isNonnegInt(n)) return "denominators.market.facts_by_source entry invalid";
  }
  if (!isNonnegInt(market.watchlist_covered)) return "denominators.market.watchlist_covered invalid";
  if (!isNonnegInt(market.watchlist_size)) return "denominators.market.watchlist_size invalid";
  if (!isNonnegInt(/** @type {any} */ (d.job)?.boards_scanned)) return "denominators.job.boards_scanned invalid";
  return null;
}

/**
 * Validate one mi_slice envelope against the merged 0016 contract. Beyond the shape, the
 * row contract holds: every theme_week row's iso_week must fall inside the declared
 * [from_week, to_week] window. Any violation is a contract mismatch → null → the surface
 * renders instrumenting.
 * @param {unknown} payload
 * @param {"mi.theme_week"|"mi.theme_lead_lag"} view the view this fetch asked for
 * @returns {MiEnvelope|null}
 */
export function parseMiEnvelope(payload, view) {
  if (!MI_VIEWS.includes(view)) return null;
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = /** @type {Record<string, unknown>} */ (payload);
  if (p.view !== view) return null;
  if (!Array.isArray(p.rows)) return null;
  if (p.window == null || typeof p.window !== "object" || Array.isArray(p.window)) return null;
  const window = /** @type {Record<string, unknown>} */ (p.window);
  if (typeof window.anchored_on !== "string" || !ISO_DATE_RE.test(window.anchored_on)) return null;
  if (typeof window.from_week !== "string" || parseIsoWeek(window.from_week) == null) return null;
  if (typeof window.to_week !== "string" || parseIsoWeek(window.to_week) == null) return null;
  if (window.from_week > window.to_week) return null;
  const denDefect = denominatorsDefects(/** @type {Record<string, unknown>} */ (p.denominators ?? null));
  if (denDefect) return null;

  const rowDefects = view === "mi.theme_week" ? themeWeekRowDefects : leadLagRowDefects;
  const rows = [];
  for (const raw of p.rows) {
    const defect = rowDefects(raw);
    if (defect) return null;
    rows.push(raw);
  }

  // Rows outside the declared window are a mismatch, not a clip-and-render.
  // (theme_lead_lag rows carry no iso_week — its window is fixed 8-week on asserted_week.)
  if (view === "mi.theme_week") {
    for (const row of /** @type {ThemeWeekRow[]} */ (rows)) {
      if (row.iso_week < window.from_week || row.iso_week > window.to_week) return null;
    }
  }

  return view === "mi.theme_week"
    ? { view, rows: /** @type {ThemeWeekRow[]} */ (rows), denominators: p.denominators, window }
    : { view, rows: /** @type {LeadLagRow[]} */ (rows), denominators: p.denominators, window };
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

/**
 * The window's week labels, enumerated from SQL's declared [from_week, to_week] — both
 * anchored on current_date, so a stalled pipeline reads as mostly-empty, not as fresh.
 * @param {MiWindow} window
 * @returns {string[]}
 */
export function windowWeekList(window) {
  const fromMs = parseIsoWeek(window.from_week);
  const toMs = parseIsoWeek(window.to_week);
  if (fromMs == null || toMs == null || fromMs > toMs) return [];
  const out = [];
  for (let ms = fromMs; ms <= toMs; ms += 7 * 86400000) {
    out.push(formatIsoWeek(ms));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Heatmap fold
// ---------------------------------------------------------------------------

/**
 * @typedef {{ facts: number, generalFacts: number, companies: number, sources: number,
 *             status: "ok"|"insufficient_data" }} HeatmapCell
 * @typedef {{ themeId: string, theme: string, seedResolved: boolean,
 *             cells: Record<string, HeatmapCell|null> }} HeatmapRow
 * @typedef {{ lenses: string[], weeks: string[], anchoredOn: string, fromWeek: string,
 *             toWeek: string, denominators: MiDenominators, rows: HeatmapRow[] }} Heatmap
 */

/**
 * Fold a validated mi.theme_week envelope into a theme × lens matrix over the declared
 * window. Per-week floor_flag rows are folded into the window total (the floor's basis IS
 * the trailing-8-week sum); a cell renders its total only when the total clears
 * FACT_FLOOR, else "insufficient_data" with the count zeroed — never "for context".
 *
 * No cross-lens aggregate is ever produced — not omitted, structurally absent.
 * @param {ThemeWeekEnvelope} envelope
 * @returns {Heatmap}
 */
export function buildHeatmap(envelope) {
  const weeks = windowWeekList(envelope.window);
  const weekSet = new Set(weeks);

  /** @type {Map<string, HeatmapRow>} */
  const byKey = new Map();

  for (const row of envelope.rows) {
    if (!weekSet.has(row.iso_week)) continue; // defensive; the parser already rejects these
    const key = row.theme_id;
    let themeRow = byKey.get(key);
    if (!themeRow) {
      themeRow = { themeId: row.theme_id, theme: row.theme, seedResolved: false, cells: {} };
      byKey.set(key, themeRow);
    }
    if (row.theme_resolved === "seed") themeRow.seedResolved = true;

    const cell = themeRow.cells[row.lens] ?? {
      facts: 0,
      generalFacts: 0,
      companies: 0,
      sources: 0,
      status: "ok",
    };
    cell.facts += row.facts;
    cell.generalFacts += row.general_facts;
    cell.companies = Math.max(cell.companies, row.distinct_companies);
    cell.sources = Math.max(cell.sources, row.distinct_sources);
    themeRow.cells[row.lens] = cell;
  }

  // Floors before labels: the window total decides — a thin total is zeroed and rendered
  // "insufficient_data" (slice.py: the number is suppressed, never shown "for context").
  const out = [...byKey.values()].map((row) => {
    for (const lens of THEME_WEEK_LENSES) {
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
    const maxA = Math.max(...THEME_WEEK_LENSES.map((l) => a.cells[l]?.facts ?? 0));
    const maxB = Math.max(...THEME_WEEK_LENSES.map((l) => b.cells[l]?.facts ?? 0));
    return maxB - maxA || a.theme.localeCompare(b.theme);
  });

  return {
    lenses: [...THEME_WEEK_LENSES],
    weeks,
    anchoredOn: envelope.window.anchored_on,
    fromWeek: envelope.window.from_week,
    toWeek: envelope.window.to_week,
    denominators: envelope.denominators,
    rows: out,
  };
}

// ---------------------------------------------------------------------------
// Lead/lag strip
// ---------------------------------------------------------------------------

/**
 * @typedef {{ theme: string, shown: boolean, marketLeadWeeks: number|null }} LeadLagRowOut
 * @typedef {{ rows: LeadLagRowOut[] }} LeadLag
 */

/**
 * Lead/lag rows carry the 0016-signed `market_lead_weeks` (POSITIVE = the market led) and
 * SQL's own `lead_lag_shown` verdict. When SQL says false the figure is not rendered —
 * but the theme still appears, plainly, as "no information (floor)". The hub hides
 * nothing and special-cases nothing: an all-false window renders as an all-floor list.
 * @param {LeadLagEnvelope} envelope
 * @returns {LeadLag}
 */
export function buildLeadLag(envelope) {
  return {
    rows: envelope.rows.map((row) => ({
      theme: row.theme,
      shown: row.lead_lag_shown,
      marketLeadWeeks: row.lead_lag_shown ? row.market_lead_weeks : null,
    })),
  };
}
