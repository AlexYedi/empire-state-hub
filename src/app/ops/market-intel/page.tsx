import {
  getGraphCounts,
  getSignalFeed,
  getWatchlist,
  getTrustStrip,
  type SignalEvent,
  type WatchlistEntity,
  type ProducerHealth,
} from "@/lib/market-intel";

export const dynamic = "force-dynamic";

const STALE_DAYS = 7; // matches trend-radar's 7-day half-life + the stalest-producer registry row

export default async function MarketIntelPage() {
  const [counts, feed, watchlist, trust] = await Promise.all([
    getGraphCounts(),
    getSignalFeed(),
    getWatchlist(),
    getTrustStrip(),
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
        Watchlist ordered by recent signal activity (raw touch count), not a computed relevance score — the
        relevance recompute is a deferred producer. People are counted only (privacy by design).
      </p>
    </div>
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
