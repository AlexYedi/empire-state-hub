import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { queryAllRows } from "./notion/client";
import { DB } from "./notion/databases";
import { selectName, titleText, urlValue } from "./notion/property";

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
