import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { queryAllRows } from "./notion/client";
import { DB } from "./notion/databases";
import { selectName, titleText, urlValue, dateStart } from "./notion/property";

export const CONTENT_STATUSES = [
  "needs_review",
  "approved",
  "scheduled",
  "published",
  "archived",
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

// Domain shape — deliberately omits any PII; Content Drafts hold no contact data anyway.
export const ContentDraftSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string().nullable(),
  phase: z.string().nullable(),
  status: z.string().nullable(),
  platform: z.string().nullable(),
  publishedUrl: z.string().nullable(),
  // Acted-on-value (YED-90/91): assigned goal + realized outcome. Outcome is manually tagged
  // (lagging, HITL) — never a live signal; rendered with that caveat.
  goal: z.string().nullable(),
  outcome: z.string().nullable(),
  outcomeDate: z.string().nullable(),
  // Honesty in the type system: "published" is the Notion status, a lagging proxy —
  // NOT a verified-live signal. Always rendered with that caveat.
  publishedIsProxy: z.literal(true),
});
export type ContentDraft = z.infer<typeof ContentDraftSchema>;

async function fetchContentDrafts(): Promise<ContentDraft[]> {
  const rows = await queryAllRows(DB.contentDrafts);
  return rows.map((row) => {
    const p = row.properties;
    return ContentDraftSchema.parse({
      id: row.id,
      title: titleText(p["Title"]) || "(untitled)",
      type: selectName(p["Content Type"]),
      phase: selectName(p["Event Phase"]),
      status: selectName(p["Content Status"]),
      platform: selectName(p["Platform"]),
      publishedUrl: urlValue(p["Published URL"]),
      goal: selectName(p["Goal"]),
      outcome: selectName(p["Outcome"]),
      outcomeDate: dateStart(p["Outcome Date"]),
      publishedIsProxy: true,
    });
  });
}

/** Cached read (60s) — keeps the Notion API (rate-limited) from being hit per request. */
export const getContentDrafts = unstable_cache(fetchContentDrafts, ["content-drafts"], {
  revalidate: 60,
  tags: ["content-drafts"],
});

export type KanbanColumn = { status: ContentStatus; drafts: ContentDraft[] };

export async function getContentDraftBoard(): Promise<KanbanColumn[]> {
  const drafts = await getContentDrafts();
  return CONTENT_STATUSES.map((status) => ({
    status,
    drafts: drafts.filter((d) => d.status === status),
  }));
}

// Public showcase: only output-grade types (no DMs/notes/questions), no PII.
const SHOWCASE_TYPES = new Set([
  "linkedin_post_post",
  "linkedin_post_pre",
  "linkedin_post_synthesis",
  "research_brief",
  "post_event_brief",
]);

export async function getShowcase(): Promise<ContentDraft[]> {
  const drafts = await getContentDrafts();
  const rank = (s: string | null) =>
    s === "published" ? 0 : s === "approved" ? 1 : s === "needs_review" ? 2 : 3;
  return drafts
    .filter((d) => d.type !== null && SHOWCASE_TYPES.has(d.type))
    .sort((a, b) => rank(a.status) - rank(b.status))
    .slice(0, 60);
}

// --- Acted-on value: the north-star (realized outcome vs assigned goal) — US-6 / YED-92 ---
export type GoalRollup = {
  goal: string;
  total: number;
  hit: number;
  partial: number;
  miss: number;
  pending: number;
};
export type ActedOnValue = {
  total: number; // published, goal-tagged, non-internal
  graded: number; // total minus pending (i.e. outcomes actually observed)
  hit: number;
  partial: number;
  miss: number;
  pending: number;
  hitRate: number | null; // hit / graded; null until something is graded (degrade gracefully)
  byGoal: GoalRollup[];
};

const isPending = (d: ContentDraft) => d.outcome === null || d.outcome === "pending";

/**
 * North-star rollup, computed from Notion Content Drafts (Goal + Outcome).
 * Scope: published, goal-tagged, non-`internal`. Outcomes are MANUALLY tagged via /tag-outcome —
 * lagging + HITL, never a live signal. `pending` = published but outcome not yet observed.
 */
export async function getActedOnValue(): Promise<ActedOnValue> {
  const drafts = await getContentDrafts();
  const scope = drafts.filter(
    (d) => d.status === "published" && d.goal !== null && d.goal !== "internal",
  );
  const tally = (list: ContentDraft[]): Omit<GoalRollup, "goal"> => ({
    total: list.length,
    hit: list.filter((d) => d.outcome === "hit").length,
    partial: list.filter((d) => d.outcome === "partial").length,
    miss: list.filter((d) => d.outcome === "miss").length,
    pending: list.filter(isPending).length,
  });

  const t = tally(scope);
  const graded = t.hit + t.partial + t.miss;
  const goals = Array.from(new Set(scope.map((d) => d.goal as string))).sort();

  return {
    total: t.total,
    graded,
    hit: t.hit,
    partial: t.partial,
    miss: t.miss,
    pending: t.pending,
    hitRate: graded > 0 ? t.hit / graded : null,
    byGoal: goals.map((goal) => ({ goal, ...tally(scope.filter((d) => d.goal === goal)) })),
  };
}
