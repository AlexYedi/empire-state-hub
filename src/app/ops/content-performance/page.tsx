import {
  META,
  HEADLINE_STATS,
  ROLE_FAMILIES,
  SENIORITY,
  INDUSTRY,
  INDUSTRY_ROLLUP,
  COMPANY_SIZE,
  SIZE_ROLLUP,
  TOPIC_AUDIENCE,
  FORMAT_EFFECT,
  SEASONALITY,
  REACH_VS_ENGAGEMENT,
  TAKEAWAYS,
  type Bar,
  type Rollup,
  type Pair,
} from "@/data/content-performance";

export const metadata = { title: "Content Performance — Empire State Ops" };

// Slate used for the "technical/infra" cohort — deliberately neutral vs the teal accent
// (on-target), so the two cohorts read as distinct identities, not a value ramp.
const TECH_COLOR = "#64748b";

function Section({ title, kicker, children }: { title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs uppercase tracking-widest text-muted">{title}</h2>
        {kicker ? <span className="text-[11px] text-muted">{kicker}</span> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BarRow({ label, pct, max }: Bar & { max: number }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-44 shrink-0 truncate text-[13px]">{label}</div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-border" aria-hidden>
        <div className="h-full rounded-full bg-accent" style={{ width: `${(pct / max) * 100}%` }} />
      </div>
      <div className="w-12 shrink-0 text-right text-[13px] tabular-nums text-muted">{pct}%</div>
    </div>
  );
}

function Bars({ data }: { data: Bar[] }) {
  const max = Math.max(...data.map((d) => d.pct));
  return (
    <div>
      {data.map((d) => (
        <BarRow key={d.label} label={d.label} pct={d.pct} max={max} />
      ))}
    </div>
  );
}

function RollupChips({ data }: { data: Rollup[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {data.map((r) => (
        <span
          key={r.group}
          className={
            "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[12px] " +
            (r.onTarget ? "border-accent/40 text-accent" : "border-border text-muted")
          }
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: r.onTarget ? "var(--color-accent, #5eead4)" : TECH_COLOR }}
            aria-hidden
          />
          {r.group}
          <span className="tabular-nums font-semibold">{r.pct}%</span>
          {r.onTarget ? <span className="text-[10px] uppercase tracking-wide">on-target</span> : null}
        </span>
      ))}
    </div>
  );
}

function PairCompare({ pair }: { pair: Pair }) {
  const max = Math.max(pair.a.pct, pair.b.pct);
  const rows = [
    { ...pair.a, strong: true },
    { ...pair.b, strong: false },
  ];
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-3">
          <div className="w-48 shrink-0 text-[13px]">{r.name}</div>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border" aria-hidden>
            <div
              className="h-full rounded-full"
              style={{ width: `${(r.pct / max) * 100}%`, background: r.strong ? "var(--color-accent, #5eead4)" : TECH_COLOR }}
            />
          </div>
          <div className="w-14 shrink-0 text-right text-[13px] tabular-nums font-semibold">{r.pct}%</div>
        </div>
      ))}
    </div>
  );
}

// The headline chart: topic → audience. Grouped bars, GTM (teal) vs Technical (slate).
function TopicAudience() {
  const max = 70;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-accent" /> GTM / business posts
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: TECH_COLOR }} /> Technical / infra posts
        </span>
      </div>
      <div className="space-y-4">
        {TOPIC_AUDIENCE.map((m) => (
          <div key={m.metric}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[13px]">{m.metric}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted">{m.hint}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border" aria-hidden>
                <div className="h-full rounded-full bg-accent" style={{ width: `${(m.gtm / max) * 100}%` }} />
              </div>
              <span className="w-11 text-right text-[12px] tabular-nums text-accent">{m.gtm}%</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${(m.technical / max) * 100}%`, background: TECH_COLOR }} />
              </div>
              <span className="w-11 text-right text-[12px] tabular-nums text-muted">{m.technical}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Reach ≠ resonance — hand-authored SVG scatter (impressions × engagement rate).
function ReachScatter() {
  const W = 640;
  const H = 260;
  const padL = 40;
  const padB = 30;
  const padT = 12;
  const padR = 14;
  const maxImp = 3200;
  const maxEng = 3.8;
  const x = (imp: number) => padL + (imp / maxImp) * (W - padL - padR);
  const y = (eng: number) => H - padB - (eng / maxEng) * (H - padB - padT);
  const xTicks = [0, 1000, 2000, 3000];
  const yTicks = [0, 1, 2, 3];
  const labeled = new Set(["brex-social", "ai-seo-geo-aeo"]);
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[560px]" role="img" aria-label="Impressions versus engagement rate scatter">
        {/* gridlines + y ticks */}
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" className="fill-muted text-[9px]">{t}%</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={x(t)} y={H - padB + 14} textAnchor="middle" className="fill-muted text-[9px]">
            {t === 0 ? "0" : `${t / 1000}k`}
          </text>
        ))}
        <text x={(W - padR + padL) / 2} y={H - 2} textAnchor="middle" className="fill-muted text-[9px] uppercase tracking-widest">impressions →</text>
        {/* median eng reference */}
        <line x1={padL} x2={W - padR} y1={y(1)} y2={y(1)} stroke={TECH_COLOR} strokeDasharray="3 3" strokeWidth={1} opacity={0.6} />
        {/* points */}
        {REACH_VS_ENGAGEMENT.map((p) => (
          <g key={p.slug}>
            <circle cx={x(p.impressions)} cy={y(p.engRatePct)} r={5} fill="var(--color-accent, #5eead4)" opacity={0.85} />
            {labeled.has(p.slug) ? (
              <text
                x={x(p.impressions) + (p.slug === "brex-social" ? -8 : 8)}
                y={y(p.engRatePct) - 8}
                textAnchor={p.slug === "brex-social" ? "end" : "start"}
                className="fill-fg text-[9px]"
              >
                {p.slug === "brex-social" ? "3,104 seen · 4 engagements" : "top eng · 3.5%"}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <p className="mt-1 text-[11px] text-muted">Dashed line = 1.0% median. High reach clusters at the bottom — big audiences, low resonance.</p>
    </div>
  );
}

export default function ContentPerformancePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold">Content Performance</h1>
        <p className="mt-1 text-sm text-muted">
          Who the work actually reaches · {META.nPosts} LinkedIn posts · {META.dateRange} ·{" "}
          <span className="text-[11px]">as of {META.asOf}</span>
        </p>
      </div>

      {/* Headline stat tiles */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {HEADLINE_STATS.map((s) => (
          <div key={s.label} className="bg-surface px-4 py-5 text-center">
            <div className="text-2xl font-semibold tabular-nums text-accent">{s.value}</div>
            <div className="mt-1 text-[11px] uppercase tracking-widest text-muted">{s.label}</div>
            <div className="mt-1 text-[11px] text-muted">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Key finding callout */}
      <div className="rounded-lg border border-accent/40 bg-accent/5 p-5">
        <div className="text-xs uppercase tracking-widest text-accent">the finding</div>
        <p className="mt-2 text-sm leading-relaxed">
          <span className="font-semibold">Topic decides the audience.</span> GTM/business content reaches founders + GTM
          decision-makers (54% on-target); technical/infra content reaches engineers + enterprise IT (65% engineers). Same
          author, same feed — the subject picks the room. This is the biggest, cleanest lever, and it&apos;s un-confounded.
        </p>
      </div>

      {/* Topic → audience (hero chart) */}
      <Section title="Topic → audience" kicker="reach-weighted % of shown viewers">
        <TopicAudience />
      </Section>

      {/* Two-up: role families + seniority */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Who's seeing it — role families">
          <Bars data={ROLE_FAMILIES} />
        </Section>
        <Section title="Seniority" kicker="26% decision-makers">
          <Bars data={SENIORITY} />
        </Section>
      </div>

      {/* Two-up: industry + company size, each with on-target rollup */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Industry — at AI-native companies?">
          <Bars data={INDUSTRY} />
          <RollupChips data={INDUSTRY_ROLLUP} />
        </Section>
        <Section title="Company size — startups or incumbents?">
          <Bars data={COMPANY_SIZE} />
          <RollupChips data={SIZE_ROLLUP} />
        </Section>
      </div>

      {/* Two-up: format effect + seasonality */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Format drives engagement" kicker="~2.4× lift">
          <PairCompare pair={FORMAT_EFFECT} />
          <p className="mt-3 text-[12px] text-muted">Visual (carousel / native document) posts vs plain text/link — engagement rate.</p>
        </Section>
        <Section title="Summer engagement drag" kicker="~37% lower">
          <PairCompare pair={SEASONALITY} />
          <p className="mt-3 text-[12px] text-muted">Holds within-format (both visual and text dropped) — a real seasonal effect, not a mix artifact.</p>
        </Section>
      </div>

      {/* Reach vs engagement */}
      <Section title="Reach ≠ resonance" kicker="impressions × engagement rate">
        <ReachScatter />
      </Section>

      {/* Takeaways */}
      <Section title="What it means">
        <ol className="space-y-2">
          {TAKEAWAYS.map((t, i) => (
            <li key={i} className="flex gap-3 text-[13px] leading-relaxed">
              <span className="mt-0.5 shrink-0 text-accent tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </Section>

      <p className="pb-4 text-[11px] text-muted">
        Source: LinkedIn SinglePostAnalytics exports (50 distinct posts, deduped). Demographics are LinkedIn&apos;s shown
        top-N (truncated; do not sum to 100) — shares are reach-weighted % of shown viewers. Point-in-time snapshot.
      </p>
    </div>
  );
}
