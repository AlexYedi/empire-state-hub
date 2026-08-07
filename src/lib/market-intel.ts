import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { graphGet, graphCount } from "./supabase/client";

// Data access for the Market-Intelligence graph (read-only). Mirrors the Notion lib pattern
// (server-only + Zod + unstable_cache). Powers /ops/market-intel.
//
// Veracity note: the graph's `relevance_score` is a COMPUTED output, now produced by the relevance
// recompute (YED-121: recency-decay × confidence-weighted engagement + event-proximity). The watchlist
// still sorts by `engagement_count` (an honest raw count, labeled as such); the "evolving viewpoint"
// panel sorts by `relevance_score` and shows only currently-active topics (score > 0). A dormant topic
// (no recent signal) decays to 0 and correctly drops off that panel — that is the ranking working.

// ---------- Schemas ----------
export const GraphCountsSchema = z.object({
  companies: z.number(),
  people: z.number(),
  topics: z.number(),
  events: z.number(),
});
export type GraphCounts = z.infer<typeof GraphCountsSchema>;

export const SignalEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string(),
  eventDate: z.string().nullable(),
  source: z.string().nullable(),
  confidence: z.coerce.number().nullable(),
  url: z.string().nullable(),
  sourceCount: z.coerce.number().nullable(),
});
export type SignalEvent = z.infer<typeof SignalEventSchema>;

export const WatchlistEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["company", "topic"]),
  engagementCount: z.coerce.number(),
  lastEngagedAt: z.string().nullable(),
});
export type WatchlistEntity = z.infer<typeof WatchlistEntitySchema>;

export const RelevanceTopicSchema = z.object({
  id: z.string(),
  name: z.string(),
  relevanceScore: z.coerce.number(),
  engagementCount: z.coerce.number(),
  lastEngagedAt: z.string().nullable(),
});
export type RelevanceTopic = z.infer<typeof RelevanceTopicSchema>;

export const ProducerHealthSchema = z.object({
  source: z.string(),
  lastRun: z.string().nullable(),
  count: z.number(),
});
export type ProducerHealth = z.infer<typeof ProducerHealthSchema>;

export const TrustStripSchema = z.object({
  producers: z.array(ProducerHealthSchema),
  pctCited: z.number(), // 0..100
  recentWindow: z.number(),
});
export type TrustStrip = z.infer<typeof TrustStripSchema>;

// ---------- Raw row shapes (PostgREST) ----------
type EventRow = {
  id: string;
  title: string;
  kind: string;
  event_date: string | null;
  source: string | null;
  confidence: number | string | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
};
type EntityRow = {
  id: string;
  name: string;
  engagement_count: number | string | null;
  last_engaged_at: string | null;
};

// ---------- Fetchers ----------
async function fetchGraphCounts(): Promise<GraphCounts> {
  const [companies, people, topics, events] = await Promise.all([
    graphCount("company"),
    graphCount("person"),
    graphCount("topic"),
    graphCount("event"),
  ]);
  return GraphCountsSchema.parse({ companies, people, topics, events });
}
export const getGraphCounts = unstable_cache(fetchGraphCounts, ["mi-graph-counts"], {
  revalidate: 60,
  tags: ["market-intel"],
});

async function fetchSignalFeed(): Promise<SignalEvent[]> {
  const rows = await graphGet<EventRow>(
    "/event?select=id,title,kind,event_date,source,confidence,url,metadata&order=event_date.desc.nullslast&limit=25",
  );
  return rows.map((r) =>
    SignalEventSchema.parse({
      id: r.id,
      title: r.title,
      kind: r.kind,
      eventDate: r.event_date,
      source: r.source,
      confidence: r.confidence,
      url: r.url,
      sourceCount: (r.metadata?.source_count as number | undefined) ?? null,
    }),
  );
}
export const getSignalFeed = unstable_cache(fetchSignalFeed, ["mi-signal-feed"], {
  revalidate: 60,
  tags: ["market-intel"],
});

async function fetchWatchlist(): Promise<{ companies: WatchlistEntity[]; topics: WatchlistEntity[] }> {
  const [companies, topics] = await Promise.all([
    graphGet<EntityRow>(
      "/company?select=id,name,engagement_count,last_engaged_at&order=engagement_count.desc,created_at.desc&limit=15",
    ),
    graphGet<EntityRow>(
      "/topic?select=id,name,engagement_count,last_engaged_at&order=engagement_count.desc,created_at.desc&limit=15",
    ),
  ]);
  const map = (rows: EntityRow[], kind: "company" | "topic") =>
    rows.map((r) =>
      WatchlistEntitySchema.parse({
        id: r.id,
        name: r.name,
        kind,
        engagementCount: r.engagement_count ?? 0,
        lastEngagedAt: r.last_engaged_at,
      }),
    );
  return { companies: map(companies, "company"), topics: map(topics, "topic") };
}
export const getWatchlist = unstable_cache(fetchWatchlist, ["mi-watchlist"], {
  revalidate: 60,
  tags: ["market-intel"],
});

// The evolving viewpoint — topics ranked by the recomputed relevance_score (rising × relevant), the
// engine's answer to "what should I post about now?". Only currently-active topics (score > 0); dormant
// topics decay off. Powered by the relevance recompute (YED-121), refreshed by /morning-refresh.
type RelevanceRow = EntityRow & { relevance_score: number | string | null };
async function fetchTopByRelevance(): Promise<RelevanceTopic[]> {
  const rows = await graphGet<RelevanceRow>(
    "/topic?select=id,name,relevance_score,engagement_count,last_engaged_at&relevance_score=gt.0&order=relevance_score.desc&limit=12",
  );
  return rows.map((r) =>
    RelevanceTopicSchema.parse({
      id: r.id,
      name: r.name,
      relevanceScore: r.relevance_score ?? 0,
      engagementCount: r.engagement_count ?? 0,
      lastEngagedAt: r.last_engaged_at,
    }),
  );
}
export const getTopByRelevance = unstable_cache(fetchTopByRelevance, ["mi-top-relevance"], {
  revalidate: 60,
  tags: ["market-intel"],
});

// Derives per-producer health + provenance coverage from the recent event window (no producer_run
// table in V1). Powers the "trust strip" — is the pipeline alive and honest right now?
async function fetchTrustStrip(): Promise<TrustStrip> {
  const rows = await graphGet<Pick<EventRow, "source" | "event_date" | "url">>(
    "/event?select=source,event_date,url&order=event_date.desc.nullslast&limit=200",
  );
  const byProducer = new Map<string, { lastRun: string | null; count: number }>();
  let cited = 0;
  for (const r of rows) {
    const producer = (r.source ?? "unknown").split(":")[0];
    const cur = byProducer.get(producer) ?? { lastRun: null, count: 0 };
    cur.count += 1;
    if (r.event_date && (!cur.lastRun || r.event_date > cur.lastRun)) cur.lastRun = r.event_date;
    byProducer.set(producer, cur);
    if (r.source || r.url) cited += 1;
  }
  const producers = [...byProducer.entries()]
    .map(([source, v]) => ({ source, lastRun: v.lastRun, count: v.count }))
    .sort((a, b) => b.count - a.count);
  const pctCited = rows.length ? Math.round((cited / rows.length) * 100) : 0;
  return TrustStripSchema.parse({ producers, pctCited, recentWindow: rows.length });
}
export const getTrustStrip = unstable_cache(fetchTrustStrip, ["mi-trust-strip"], {
  revalidate: 60,
  tags: ["market-intel"],
});
