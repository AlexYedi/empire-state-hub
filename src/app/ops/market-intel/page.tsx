import { getMarketIntel } from "@/lib/market-intel/client";
import {
  buildHeatmap,
  buildLeadLag,
  FACT_FLOOR,
  type Heatmap,
  type LeadLag,
} from "@/lib/market-intel/slices.mjs";

export const dynamic = "force-dynamic";

// Read-only explorer over the market-lens slice views (mi.theme_week + mi.theme_lead_lag
// via the public.mi_slice RPC). Counts, week labels and theme names only — no person or
// target-list data is ever selected, so nothing private can reach this page.

const GATED_REASON_LABEL: Record<LeadLag["gated"][number]["reason"], string> = {
  insufficient_data: "below floor",
  no_information: "no information",
  within_null_band: "within null band",
};

function Instrumenting() {
  return (
    <div className="mt-6 rounded-lg border border-border bg-surface px-4 py-5 text-sm text-muted">
      <span className="text-accent">⊘ instrumenting</span> — MI read path not configured
      (MI_SUPABASE_URL / MI_SUPABASE_SERVICE_ROLE_KEY) or unreachable. No fabricated data is
      shown; wire the mi_slice reader to see the slices.
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
              <span className="block text-[10px] normal-case text-muted/70 tabular-nums">
                {heatmap.denominators[lens] != null ? `n = ${heatmap.denominators[lens]}` : "n = —"}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {heatmap.rows.map((row) => (
          <tr key={row.themeId} className="border-b border-border/60">
            <td className="px-2 py-1.5">
              {row.theme}
              {row.themeResolved === "seed" && (
                <span
                  className="ml-2 rounded border border-border px-1 text-[10px] text-muted"
                  title="theme resolved via the pre-history membership seed — treat the slice as approximate"
                >
                  seed
                </span>
              )}
            </td>
            {heatmap.lenses.map((lens) => {
              const cell = row.cells[lens];
              if (!cell || cell.status === "no_information") {
                return (
                  <td key={lens} className="px-2 py-1.5 text-right text-muted/50">
                    ·
                  </td>
                );
              }
              if (cell.status === "insufficient_data") {
                return (
                  <td
                    key={lens}
                    className="px-2 py-1.5 text-right text-muted/70 tabular-nums"
                    title={`${cell.facts} facts in window — below the ${FACT_FLOOR}-fact floor`}
                  >
                    {cell.facts}
                  </td>
                );
              }
              return (
                <td
                  key={lens}
                  className={`px-2 py-1.5 text-right font-semibold tabular-nums ${cellShading(cell.facts, max)}`}
                  title={`${cell.facts} facts in window`}
                >
                  {cell.facts}
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
          No themes clear the lead/lag gates yet. With {`${FACT_FLOOR}-fact`} floors on both
          lenses and a permutation-null band, most cells honestly read &ldquo;no
          information&rdquo; for now — that is the data, not a broken pipeline.
        </p>
      )}
      {leadLag.visible.length > 0 && (
        <ul className="divide-y divide-border/60">
          {leadLag.visible.map((row) => (
            <li key={row.themeId} className="flex items-baseline justify-between gap-4 py-2 text-sm">
              <span>{row.theme}</span>
              <span className="shrink-0 font-semibold tabular-nums text-accent">
                {row.leadWeeks > 0
                  ? `market leads by ${row.leadWeeks}w`
                  : `rooms lead by ${-row.leadWeeks}w`}
                <span className="ml-2 font-normal text-muted tabular-nums">
                  null band [{row.band[0]}, {row.band[1]}]
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {leadLag.gated.length > 0 && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted/70">
          {leadLag.gated.length} theme{leadLag.gated.length === 1 ? "" : "s"} gated:{" "}
          {leadLag.gated
            .map((g) => `${g.theme} (${GATED_REASON_LABEL[g.reason]})`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

export default async function MarketIntelPage() {
  const intel = await getMarketIntel();

  return (
    <div>
      <h1 className="text-lg font-semibold">Market intel</h1>
      <p className="mt-1 text-xs text-muted">
        Theme × lens slices over the mi semantic layer — where the rooms are vs where the
        market is. Lenses are never summed; every rate names its denominator.
      </p>

      {!intel ? (
        <Instrumenting />
      ) : intel.themeWeek.length === 0 ? (
        <NoSlices />
      ) : (
        <>
          <section className="mt-8">
            <h2 className="mb-3 text-xs uppercase tracking-widest text-muted">
              Heatmap — facts per lens, 8-week window
            </h2>
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <Heatmap heatmap={buildHeatmap(intel.themeWeek, { windowWeeks: 8 })} />
            </div>
            <p className="mt-2 text-[11px] text-muted/70">
              n = per-lens denominator (events / briefs / facts per source, per proposal §3.3).
              Cells below {FACT_FLOOR} facts in the window are insufficient_data. There is no
              total column: lenses are never summed.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mb-3 text-xs uppercase tracking-widest text-muted">
              Lead/lag — market first-seen vs rooms
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
