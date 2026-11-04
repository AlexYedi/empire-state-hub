import "server-only";
import { unstable_cache } from "next/cache";
import {
  parseLeadLagRows,
  parseThemeWeekRows,
  type ThemeLeadLagRow,
  type ThemeWeekRow,
} from "./schema";

// Read-only PostgREST client for the MI graph's hub slices — the same env pattern as the
// sibling hub's MI readers: service_role key, server-side only, never NEXT_PUBLIC_, never
// shipped to the browser. The only call shape is a GET to the public.mi_slice RPC (the
// market-lens proposal's "one door" — security-definer, service role); the mi schema itself
// is not PostgREST-exposed, and no write-shaped request exists in this module.
// Returns null when env is absent or the read fails: the surface renders instrumenting,
// never a fabricated number. Unset in this environment until migration 0016 wiring lands.

/** Views the hub is allowed to read; anything else is refused before a request is built. */
export type MiView = "theme_week" | "theme_lead_lag";

export interface MarketIntel {
  themeWeek: ThemeWeekRow[];
  leadLag: ThemeLeadLagRow[];
}

function miClient(): { url: string; key: string } | null {
  const url = process.env.MI_SUPABASE_URL;
  const key = process.env.MI_SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

/**
 * Read-only PostgREST RPC: public.mi_slice(view, filters) with the service-role key.
 * GET only — read-only by construction. Any non-OK or malformed payload → null.
 */
async function miSlice<T>(view: MiView, parse: (payload: unknown) => T | null): Promise<T | null> {
  const client = miClient();
  if (!client) return null;
  try {
    const url = `${client.url}/rest/v1/rpc/mi_slice?view=${encodeURIComponent(view)}&filters={}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { apikey: client.key, Authorization: `Bearer ${client.key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return parse(await res.json());
  } catch {
    return null;
  }
}

async function fetchMarketIntel(): Promise<MarketIntel | null> {
  const [themeWeek, leadLag] = await Promise.all([
    miSlice("theme_week", parseThemeWeekRows),
    miSlice("theme_lead_lag", parseLeadLagRows),
  ]);
  if (!themeWeek || !leadLag) return null;
  return { themeWeek, leadLag };
}

export const getMarketIntel = unstable_cache(fetchMarketIntel, ["market-intel"], {
  revalidate: 900,
  tags: ["market-intel"],
});
