import { getActedOnValue } from "@/lib/content-drafts";

export const dynamic = "force-dynamic";

const OUTCOME_ACCENT = {
  hit: "text-emerald-400",
  partial: "text-amber-400",
  miss: "text-rose-400",
  pending: "text-sky-400",
} as const;

export default async function RigorPage() {
  const v = await getActedOnValue();

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Acted-on Value</h1>
        <p className="text-xs text-muted">{v.total} goal-tagged published · live from Notion</p>
      </div>

      {v.total === 0 ? (
        <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">
          No goal-tagged published artifacts yet. Set a Goal at creation, then run{" "}
          <code className="text-fg">/tag-outcome</code> to record realized outcomes — they roll up here.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat
              label="Hit-rate (of graded)"
              value={v.hitRate === null ? "—" : `${Math.round(v.hitRate * 100)}%`}
              accent="text-emerald-400"
            />
            <Stat label="Hit" value={v.hit} accent={OUTCOME_ACCENT.hit} />
            <Stat label="Partial" value={v.partial} accent={OUTCOME_ACCENT.partial} />
            <Stat label="Miss" value={v.miss} accent={OUTCOME_ACCENT.miss} />
            <Stat label="Pending" value={v.pending} accent={OUTCOME_ACCENT.pending} />
          </div>

          <h2 className="mb-3 mt-8 text-sm font-medium text-muted">By goal</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="py-2 pr-4 font-medium">Goal</th>
                  <th className="py-2 pr-4 font-medium">Total</th>
                  <th className="py-2 pr-4 font-medium text-emerald-400">Hit</th>
                  <th className="py-2 pr-4 font-medium text-amber-400">Partial</th>
                  <th className="py-2 pr-4 font-medium text-rose-400">Miss</th>
                  <th className="py-2 pr-4 font-medium text-sky-400">Pending</th>
                </tr>
              </thead>
              <tbody>
                {v.byGoal.map((g) => (
                  <tr key={g.goal} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-fg">{g.goal}</td>
                    <td className="py-2 pr-4 text-muted">{g.total}</td>
                    <td className="py-2 pr-4">{g.hit}</td>
                    <td className="py-2 pr-4">{g.partial}</td>
                    <td className="py-2 pr-4">{g.miss}</td>
                    <td className="py-2 pr-4">{g.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-6 max-w-2xl text-[11px] leading-relaxed text-muted/80">
        North-star = realized <strong>outcome vs assigned goal</strong>. Outcomes are{" "}
        <strong>manually tagged</strong> (<code className="text-fg">/tag-outcome</code>) and lagging —{" "}
        <em>pending</em> means published but not yet observed, not a miss. Hit-rate is over graded items
        only. Build-session telemetry + judge-quality panels (from PostHog) land next.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className={`text-2xl font-semibold ${accent}`}>{value}</div>
      <div className="mt-1 text-[11px] text-muted">{label}</div>
    </div>
  );
}
