import {
  getGraphCounts,
  getSignalFeed,
  getWatchlist,
  getTrustStrip,
  getTopByRelevance,
  getTopicIntelligence,
  type SignalEvent,
  type WatchlistEntity,
  type ProducerHealth,
  type RelevanceTopic,
  type TopicIntelligence,
  type TopicMovement,
} from "@/lib/market-intel";

export const dynamic = "force-dynamic";

const STALE_DAYS = 7; // matches trend-radar's 7-day half-life + the stalest-producer registry row

export default async function MarketIntelPage() {
  const [counts, feed, watchlist, trust, relevance, intel] = await Promise.all([
    getGraphCounts(),
    getSignalFeed(),
    getWatchlist(),
    getTrustStrip(),
    getTopByRelevance(),
    getTopicIntelligence(),
  ]);
  const now = Date.now();
  const lastRefresh = new Date(now);

  const tiles = [
    { label: "signals", value: counts.events },
    { label: "companies", value: counts.companies },
    { label: "topics", value: counts.topics },
    { label: "people", value: counts.people },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold">Market Intel</h1>
      <p className="mt-1 text-xs text-muted">
        What the engine is sensing — decoupled from events. Primary question: <em>what should I post about now?</em>
      </p>

      {/* Trust strip — veracity mechanism 3: is the whole board alive & honest right now? */}
      <TrustStrip trust={trust} lastRefresh={lastRefresh} now={now} />

      {/* Stat tiles */}
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="bg-surface px-4 py-5 text-center">
            <div className="text-2xl font-semibold tabular-nums">{t.value}</div>
            <div className="mt-1 text-[11px] uppercase tracking-widest text-muted">{t.label}</div>
          </div>
        ))}
      </div>

      {/* The evolving viewpoint — relevance-ranked topics (rising × relevant); the "what to post now" answer */}
      <RelevancePanel topics={relevance} now={now} />

      {/* Topic intelligence — carried-forward from the signal graph via signal_read (one graph, two lenses) */}
      <TopicIntelligencePanel intel={intel} />

      {/* Recent signal feed — the primary surface */}
      <section className="mt-8">
        <h2 className="mb-3 text-xs uppercase tracking-widest text-muted">Recent signals</h2>
        {feed.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-2">
            {feed.map((s) => (
              <SignalRow key={s.id} s={s} now={now} />
            ))}
          </ul>
        )}
      </section>

      {/* Watchlist — honest ordering by raw signal activity (relevance_score is 0 until recompute ships) */}
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <WatchList title="Companies" items={watchlist.companies} />
        <WatchList title="Topics" items={watchlist.topics} />
      </div>
      <p className="mt-3 text-[11px] text-muted/70">
        Watchlist ordered by raw signal activity (touch count). For the ranked, freshness-weighted view, see
        the evolving viewpoint above. People are counted only (privacy by design).
      </p>
    </div>
  );
}

function RelevancePanel({ topics, now }: { topics: RelevanceTopic[]; now: number }) {
  if (topics.length === 0) return null;
  const max = Math.max(...topics.map((t) => t.relevanceScore), 0.0001);
  return (
    <section className="mt-8">
      <h2 className="mb-1 text-xs uppercase tracking-widest text-muted">Evolving viewpoint — what to post now</h2>
      <p className="mb-3 text-[11px] text-muted/70">
        Topics ranked by recomputed relevance (recency-decay × confidence-weighted signal + event proximity).
        Refreshed each <code className="rounded bg-border/40 px-1 py-0.5 font-mono">/morning-refresh</code>; dormant
        topics decay off.
      </p>
      <ol className="space-y-1.5">
        {topics.map((t, i) => (
          <li key={t.id} className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
            <span className="w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted/60">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm" title={t.name}>
              {t.name}
            </span>
            <span className="hidden h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-border sm:block" aria-hidden>
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${Math.round((t.relevanceScore / max) * 100)}%` }}
              />
            </span>
            <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums" title="relevance score">
              {t.relevanceScore.toFixed(2)}
            </span>
            <span
              className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted/70"
              title={`${t.engagementCount} signals · last ${ago(t.lastEngagedAt, now)}`}
            >
              {ago(t.lastEngagedAt, now)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const TREND_GLYPH: Record<TopicMovement["trend"], string> = {
  rising: "↑",
  falling: "↓",
  steady: "→",
  new: "✦",
};

function TopicIntelligencePanel({ intel }: { intel: TopicIntelligence }) {
  const { movement, intersections } = intel;
  if (movement.length === 0 && intersections.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="mb-1 text-xs uppercase tracking-widest text-muted">Topic intelligence</h2>
        <div className="rounded-md border border-dashed border-border bg-surface/50 px-4 py-8 text-center text-xs text-muted">
          ⊘ instrumenting — the <code className="rounded bg-border/40 px-1 py-0.5 font-mono">signal_read</code> views
          aren&rsquo;t reachable yet. Carried-forward topic-intelligence lights up here once the graph is wired.
        </div>
      </section>
    );
  }
  const maxEv = Math.max(...movement.map((m) => m.eventCount ?? 0), 1);
  const maxScore = Math.max(...intersections.map((i) => i.intersectionScore ?? 0), 1);
  return (
    <section className="mt-8">
      <h2 className="mb-1 text-xs uppercase tracking-widest text-muted">Topic intelligence — theme movement</h2>
      <p className="mb-3 text-[11px] text-muted/70">
        Carried-forward from the signal graph, read through counts-only{" "}
        <code className="rounded bg-border/40 px-1 py-0.5 font-mono">signal_read</code> views (k≥5, no PII) — the same
        contract the public <code className="rounded bg-border/40 px-1 py-0.5 font-mono">/signal</code> surface renders.
      </p>
      <ol className="space-y-1.5">
        {movement.map((m, i) => (
          <li key={m.theme} className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
            <span className="w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted/60">{i + 1}</span>
            <span className="w-4 shrink-0 text-center text-xs" title={m.trend} aria-hidden>
              {TREND_GLYPH[m.trend]}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm" title={m.theme}>
              {m.theme}
              {m.isLowConfidence && (
                <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted/50" title="low confidence">
                  low-conf
                </span>
              )}
            </span>
            <span className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-border sm:block" aria-hidden>
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${Math.round(((m.eventCount ?? 0) / maxEv) * 100)}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right font-mono text-xs tabular-nums" title="events">
              {m.eventCount ?? "—"}
            </span>
            <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted/70" title="distinct speakers">
              {m.distinctSpeakerCount != null ? `${m.distinctSpeakerCount} spk` : "—"}
            </span>
          </li>
        ))}
      </ol>

      {intersections.length > 0 && (
        <>
          <h2 className="mb-1 mt-6 text-xs uppercase tracking-widest text-muted">Theme intersections</h2>
          <p className="mb-3 text-[11px] text-muted/70">
            Where two themes co-occur — ranked by intersection score. Bridge = shared people (count only, never names).
          </p>
          <ol className="space-y-1.5">
            {intersections.map((x, i) => (
              <li
                key={`${x.themeA}|${x.themeB}`}
                className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2"
              >
                <span className="w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted/60">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm" title={`${x.themeA} × ${x.themeB}`}>
                  {x.themeA} <span className="text-muted/50">×</span> {x.themeB}
                  {x.isNewPair && (
                    <span className="ml-1.5 rounded border border-border px-1 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                      new
                    </span>
                  )}
                </span>
                <span className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-border sm:block" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${Math.round(((x.intersectionScore ?? 0) / maxScore) * 100)}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right font-mono text-xs tabular-nums" title="intersection score">
                  {x.intersectionScore ?? "—"}
                </span>
                <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted/70" title="bridge people (count only)">
                  {x.bridgePersonCount != null ? `${x.bridgePersonCount} br` : "—"}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function TrustStrip({
  trust,
  lastRefresh,
  now,
}: {
  trust: { producers: ProducerHealth[]; pctCited: number; recentWindow: number };
  lastRefresh: Date;
  now: number;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-[11px] text-muted">
      <span>
        updated <span className="text-fg tabular-nums">{lastRefresh.toISOString().slice(11, 16)}Z</span>
      </span>
      <span className="text-muted/40">·</span>
      <span>
        <span className="text-fg tabular-nums">{trust.pctCited}%</span> of signals cited/sourced
      </span>
      <span className="text-muted/40">·</span>
      {trust.producers.length === 0 ? (
        <span className="text-muted/60">no producers have run yet</span>
      ) : (
        <span className="flex flex-wrap items-center gap-2">
          {trust.producers.map((p) => {
            const stale = isStale(p.lastRun, STALE_DAYS, now);
            return (
              <span
                key={p.source}
                className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5"
                title={stale ? `stale — no run in ${STALE_DAYS}+ days` : "healthy"}
              >
                <span className={stale ? "text-amber-500" : "text-emerald-500"}>{stale ? "◌" : "●"}</span>
                <span className="text-fg">{p.source}</span>
                <span className="tabular-nums">{p.count}</span>
                <span className="text-muted/60">{ago(p.lastRun, now)}</span>
              </span>
            );
          })}
        </span>
      )}
    </div>
  );
}

function SignalRow({ s, now }: { s: SignalEvent; now: number }) {
  const stale = isStale(s.eventDate, STALE_DAYS, now);
  return (
    <li className="rounded-md border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm">
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer" className="hover:text-accent hover:underline">
                {s.title}
              </a>
            ) : (
              s.title
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
            <Badge>{s.kind}</Badge>
            {s.source && <span className="font-mono">{s.source}</span>}
            {s.sourceCount != null && s.sourceCount > 1 && (
              <span className="rounded border border-border px-1 py-0.5">{s.sourceCount}× sources</span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right text-[11px]">
          {s.confidence != null && (
            <div className="tabular-nums text-muted" title="confidence (labeled by producer — not yet normalized across producers)">
              conf {s.confidence.toFixed(2)}
            </div>
          )}
          <div className={stale ? "text-amber-500" : "text-muted/70"} title={stale ? "stale signal" : "fresh"}>
            {ago(s.eventDate, now)}
          </div>
        </div>
      </div>
    </li>
  );
}

function WatchList({ title, items }: { title: string; items: WatchlistEntity[] }) {
  return (
    <section>
      <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">
        {title} ({items.length})
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {items.map((e) => (
          <span
            key={e.id}
            className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2 py-1 text-xs"
          >
            {e.name}
            {e.engagementCount > 0 && <span className="tabular-nums text-muted/60">{e.engagementCount}</span>}
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-muted/60">—</span>}
      </div>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded border border-border px-1.5 py-0.5 uppercase tracking-wide">{children}</span>;
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-border bg-surface/50 px-4 py-8 text-center text-xs text-muted">
      No signals yet. Run <code className="rounded bg-border/40 px-1 py-0.5 font-mono">/scan-trends</code> in the
      pipeline to emit the first market signals into the graph.
    </div>
  );
}

// ---------- helpers ----------
function ago(iso: string | null, now: number): string {
  if (!iso) return "—";
  const diff = now - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "—";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

function isStale(iso: string | null, days: number, now: number): boolean {
  if (!iso) return true;
  return now - new Date(iso).getTime() > days * 86400000;
}
