import "server-only";

// Read-only PostgREST client for the Market-Intelligence graph (the ENGINE project,
// `empire state ai` / oicikjyzmxqfomrrqkvf) — NOT the Hub's own Supabase project.
//
// Uses plain fetch (no @supabase/supabase-js dependency) — the queries are simple GETs and
// keeping this dependency-free keeps the secret handling trivial and the footprint lean.
//
// SECURITY: MARKET_INTEL_SUPABASE_KEY is an `sb_secret_…` key that bypasses RLS (the graph has
// RLS on with no policies). It is full-access, so this module is `server-only` and must never be
// imported into a client component. Never prefix its env vars with NEXT_PUBLIC_.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function base(): string {
  return `${required("MARKET_INTEL_SUPABASE_URL").replace(/\/$/, "")}/rest/v1`;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  const key = required("MARKET_INTEL_SUPABASE_KEY");
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

/** GET rows from a PostgREST path (e.g. `/event?order=event_date.desc&limit=25`). */
export async function graphGet<T>(path: string): Promise<T[]> {
  const res = await fetch(`${base()}${path}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Market-intel graph query failed (${res.status}) for ${path}`);
  }
  return (await res.json()) as T[];
}

/**
 * GET rows from a non-`public` schema by sending PostgREST's `Accept-Profile` header.
 * Used to read the `signal_read` anon-safe topic-intelligence views (counts-only, k>=5
 * suppressed in-view). e.g. graphGetFrom("signal_read", "/v_topic_movement?...").
 */
export async function graphGetFrom<T>(schema: string, path: string): Promise<T[]> {
  const res = await fetch(`${base()}${path}`, {
    headers: headers({ "Accept-Profile": schema }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Market-intel graph query failed (${res.status}) for ${schema}:${path}`);
  }
  return (await res.json()) as T[];
}

/** Exact row count for a table via the Content-Range header (cheap: limit 1). */
export async function graphCount(table: string): Promise<number> {
  const res = await fetch(`${base()}/${table}?select=id&limit=1`, {
    headers: headers({ Prefer: "count=exact" }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Market-intel count failed (${res.status}) for ${table}`);
  }
  // content-range looks like "0-0/137" or "*/0"
  const range = res.headers.get("content-range");
  const total = range?.split("/")[1];
  const n = Number(total);
  return Number.isFinite(n) ? n : 0;
}
