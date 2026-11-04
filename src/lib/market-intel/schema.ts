import { z } from "zod";

// Wire contract for the mi semantic layer's two hub-facing views, read through the
// public.mi_slice PostgREST RPC (proposal §4 — "the one door"). Column names follow the
// proposal's grain descriptions; migration 0016 is the final authority when it lands, and
// this file is the single adaptation point if names differ.

export const ThemeWeekRowSchema = z.object({
  theme_id: z.string().min(1),
  theme: z.string().min(1),
  lens: z.enum(["attended", "research", "market", "job"]),
  iso_week: z.string().min(1),
  facts: z.number().nonnegative(),
  distinct_companies: z.number().nullable().optional(),
  distinct_sources: z.number().nullable().optional(),
  denominator: z.number().nullable().optional(),
  theme_resolved: z.enum(["live", "seed"]).nullable().optional(),
});
export type ThemeWeekRow = z.infer<typeof ThemeWeekRowSchema>;

export const ThemeLeadLagRowSchema = z.object({
  theme_id: z.string().min(1),
  theme: z.string().min(1),
  market_first_seen: z.string().nullable().optional(),
  attended_first_seen: z.string().nullable().optional(),
  lead_weeks: z.number().nullable().optional(),
  band_low: z.number().nullable().optional(),
  band_high: z.number().nullable().optional(),
  attended_count_8w: z.number().nullable().optional(),
  market_count_8w: z.number().nullable().optional(),
});
export type ThemeLeadLagRow = z.infer<typeof ThemeLeadLagRowSchema>;

/**
 * Parse an RPC payload for a view. A malformed payload (wrong shape, non-array) is a
 * contract mismatch — surfaced as null so the page renders instrumenting, never guessed.
 */
export function parseThemeWeekRows(payload: unknown): ThemeWeekRow[] | null {
  if (!Array.isArray(payload)) return null;
  const rows = payload.flatMap((row) => {
    const parsed = ThemeWeekRowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
  return rows;
}

export function parseLeadLagRows(payload: unknown): ThemeLeadLagRow[] | null {
  if (!Array.isArray(payload)) return null;
  const rows = payload.flatMap((row) => {
    const parsed = ThemeLeadLagRowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
  return rows;
}
