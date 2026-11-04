import { fetchMarketIntel } from "@/lib/market-intel/client";
import {
  buildHeatmap,
  buildLeadLag,
  GENERAL_TOPIC,
  type Heatmap,
  type LeadLag,
} from "@/lib/market-intel/slices.mjs";

export const dynamic = "force-dynamic";

// Read-only explorer over the market-lens slices (mi.theme_week via the public.mi_slice
// RPC, migration 0016). Rendering-only: SQL owns the floor, the denominators and the
// window; this page prints what the envelope carries and nothing else. Counts, week
// labels and theme names only — no person or target-list data is ever selected, so
// nothing private can reach this page.

function Instrumenting() {
  return (
    <div className="mt-6 rounded-lg border border-border bg-surface px-4 py-5 text-sm text-muted">
      <span className="text-accent">⊘ instrumenting</span> — MI read path not configured
      (MI_SUPABASE_URL / MI_SUPABASE_SERVICE_ROLE_KEY), unreachable, or the payload
      violated the mi_slice contract. No fabricated data and no partial slice is shown;
      fix the read path to see the slices.
    </div>
  );
}

function NoSlices() {
  return (
    <div className="mt-6 rounded-lg border border-border bg-surface px-4 py-5 text-sm text-muted">
      No slices yet — the mi views are empty on this environment. The heatmap appears once
      migration 0016&rsquo;s views hold facts.
    </div>
  );
}

/** Week range header: anchored on today, so a stalled pipeline reads as stalled. */
function WindowRange({ heatmap }: { heatmap: Heatmap }) {
  return (
    <p className="text-[11px] tabular-nums text-muted/70">
      window {heatmap.weeks[0]} … {heatmap.weeks.at(-1)} · anchored {heatmap.anchoredOn}
    </p>
  );
}

/** Intensity shading for an above-floor cell; buckets keep the mapping explainable. */
function cellShading(facts: number, max: number): string {
  if (max <= 0) return "bg-accent/10";
  const ratio = facts / max;
  if (ratio > 0.66) return "bg-accent/45";
  if (ratio > 0.33) return "bg-accent/25";
  return "bg-accent/10";
}

function Heatmap({ heatmap }: { heatmap: Heatmap }) {
  const max = Math.max(
    ...heatmap.rows.flatMap((row) =>
      heatmap.lenses.map((lens) => row.cells[lens]?.facts ?? 0),
    ),
    0,
  );

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-border text-left text-[11px] uppercase tracking-widest text-muted">
          <th className="px-2 py-2 font-medium">theme</th>
          {heatmap.lenses.map((lens) => (
            <th key={lens} className="px-2 py-2 text-right font-medium">
              {lens}
              <span className="block text-[10px] normal-case text-muted/70">
                {heatmap.denominators[lens] ?? "denominator —"}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {heatmap.rows.map((row) => (
          <tr key={`${row.theme}${row.isGeneral ? GENERAL_TOPIC : ""}`} className="border-b border-border/60">
            <td className="px-2 py-1.5">
              {row.theme}
              {row.isGeneral && (
                <span
                  className="ml-2 rounded border border-border px-1 text-[10px] text-muted"
                  title={`counts the theme's ${GENERAL_TOPIC} topic — labelled, never merged into named topics`}
                >
                  [general]
                </span>
              )}
            </td>
            {heatmap.lenses.map((lens) => {
              const cell = row.cells[lens];
              if (!cell) {
                return (
                  <td key={lens} className="px-2 py-1.5 text-right text-muted/50">
                    ·
                  </td>
                );
              }
              if (cell.status === "insufficient_data") {
                // slice.py rule: the number is suppressed, never shown "for context".
                return (
                  <td key={lens} className="px-2 py-1.5 text-right text-[11px] text-muted/70">
                    insufficient_data
                  </td>
                );
              }
              const generalLabel =
                cell.generalFacts > 0 ? ` (${cell.generalFacts} general)` : "";
              return (
                <td
                  key={lens}
                  className={`px-2 py-1.5 text-right font-semibold tabular-nums ${cellShading(cell.facts, max)}`}
                  title={`${cell.facts}${generalLabel} facts in window`}
                >
                  {cell.facts}
                  {generalLabel}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LeadLagStrip({ leadLag }: { leadLag: LeadLag }) {
  return (
    <div>
      {leadLag.visible.length === 0 && (
        <p className="text-sm text-muted">
          No lead/lag figures clear the floor yet — a lead on a floored cell renders as
          &ldquo;no information (floor)&rdquo;. That is the data, not a broken pipeline.
        </p>
      )}
      {leadLag.visible.length > 0 && (
        <ul className="divide-y divide-border/60">
          {leadLag.visible.map((row) => (
            <li key={row.theme} className="flex items-baseline justify-between gap-4 py-2 text-sm">
              <span>{row.theme}</span>
              <span className="shrink-0 font-semibold tabular-nums text-accent">
                {row.marketLeadWeeks > 0
                  ? `market leads by ${row.marketLeadWeeks}w`
                  : `rooms lead by ${-row.marketLeadWeeks}w`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {leadLag.gated.length > 0 && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted/70">
          {leadLag.gated.length} theme{leadLag.gated.length === 1 ? "" : "s"} gated:{" "}
          {leadLag.gated.map((g) => `${g.theme} (no information (floor))`).join(" · ")}
        </p>
      )}
    </div>
  );
}

export default async function MarketIntelPage() {
  const intel = await fetchMarketIntel();

  return (
    <div>
      <h1 className="text-lg font-semibold">Market intel</h1>
      <p className="mt-1 text-xs text-muted">
        Theme × lens slices over the mi semantic layer — where the rooms are vs where the
        market is. Lenses are never summed; every rate names its denominator.
      </p>

      {!intel ? (
        <Instrumenting />
      ) : intel.heatmap.rows.length === 0 ? (
        <NoSlices />
      ) : (
        <>
          <section className="mt-8">
            <h2 className="mb-1 text-xs uppercase tracking-widest text-muted">
              Heatmap — facts per lens, 8-week window
            </h2>
            <WindowRange heatmap={buildHeatmap(intel.heatmap)} />
            <div className="mt-2 overflow-hidden rounded-lg border border-border bg-surface">
              <Heatmap heatmap={buildHeatmap(intel.heatmap)} />
            </div>
            <p className="mt-2 text-[11px] text-muted/70">
              Denominators come from SQL per lens and render verbatim. Cells the views
              floor render insufficient_data — the number is suppressed, not shown for
              context. There is no total column: lenses are never summed.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mb-3 text-xs uppercase tracking-widest text-muted">
              Lead/lag — market first-seen vs rooms (positive = market led)
            </h2>
            <div className="overflow-hidden rounded-lg border border-border bg-surface px-4 py-2">
              <LeadLagStrip leadLag={buildLeadLag(intel.leadLag)} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
