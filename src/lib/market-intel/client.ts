import "server-only";
import {
  parseMiEnvelope,
  type LeadLagEnvelope,
  type MiEnvelope,
  type ThemeWeekEnvelope,
} from "./slices.mjs";

// Read-only PostgREST client for the MI semantic layer's hub slices — the same env
// pattern as the sibling hub's MI readers: service_role key, server-side only, never
// NEXT_PUBLIC_, never shipped to the browser. The only call shape is a GET to the
// public.mi_slice RPC (migration 0016, ADR-13 — "the one door"): view + filters travel
// as query params, so the request is structurally read-only. The mi schema itself is not
// PostgREST-exposed, and no write-shaped request exists in this module.
//
// Unset env or an unreachable source → null → the page renders instrumenting, never a
// fabricated number. A malformed envelope is a contract mismatch and ALSO renders
// instrumenting — rows are never silently dropped. Caching is per-fetch (Next data
// cache): only successful responses are cached, so a failed read is never served stale
// for the revalidation window.

/** Canonical hub slices (migration 0016 §7): filters allow exactly weeks / lens /
 * theme_id / company_id / limit — anything else mi_slice raises. The heatmap takes the
 * default window (SQL's trailing 8 ISO weeks anchored on current_date); lead/lag carries
 * its own fixed 8-week basis. */
const HEATMAP_SLICE = {
  view: "mi.theme_week",
  filters: { weeks: 8 },
} as const;
const LEAD_LAG_SLICE = {
  view: "mi.theme_lead_lag",
  filters: {},
} as const;

export interface MarketIntel {
  heatmap: ThemeWeekEnvelope;
  leadLag: LeadLagEnvelope;
}

function miClient(): { url: string; key: string } | null {
  const url = process.env.MI_SUPABASE_URL;
  const key = process.env.MI_SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

/**
 * Read-only PostgREST RPC: GET /rpc/mi_slice?view=…&filters=<jsonb>, matching slice.py's
 * request shape. Only 2xx JSON responses that validate against the 0016 envelope contract
 * are returned (and cached by Next for revalidate seconds); anything else → null, uncached.
 * The overloads pin each slice's envelope type — the parser guarantees the returned
 * envelope's view equals the requested one.
 */
function miSlice(slice: { view: "mi.theme_week"; filters: Record<string, unknown> }): Promise<ThemeWeekEnvelope | null>;
function miSlice(slice: { view: "mi.theme_lead_lag"; filters: Record<string, unknown> }): Promise<LeadLagEnvelope | null>;
async function miSlice(slice: { view: "mi.theme_week" | "mi.theme_lead_lag"; filters: Record<string, unknown> }): Promise<MiEnvelope | null> {
  const client = miClient();
  if (!client) return null;
  const qs = new URLSearchParams({
    view: slice.view,
    filters: JSON.stringify(slice.filters),
  });
  try {
    const res = await fetch(`${client.url}/rest/v1/rpc/mi_slice?${qs.toString()}`, {
      method: "GET",
      headers: { apikey: client.key, Authorization: `Bearer ${client.key}` },
      next: { revalidate: 900 },
    });
    if (!res.ok) return null;
    return parseMiEnvelope(await res.json(), slice.view);
  } catch {
    return null;
  }
}

export async function fetchMarketIntel(): Promise<MarketIntel | null> {
  const [heatmap, leadLag] = await Promise.all([miSlice(HEATMAP_SLICE), miSlice(LEAD_LAG_SLICE)]);
  if (!heatmap || !leadLag) return null;
  return { heatmap, leadLag };
}
