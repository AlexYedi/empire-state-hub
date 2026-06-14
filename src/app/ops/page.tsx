import Link from "next/link";
import { getContentDraftBoard } from "@/lib/content-drafts";
import { getEventWindows } from "@/lib/events";
import { getProjectIdeas } from "@/lib/project-ideas";
import { getEntityCounts } from "@/lib/entities";
import { getBacklog } from "@/lib/linear/backlog";

export const dynamic = "force-dynamic";

export default async function OpsOverview() {
  const [board, windows, ideas, entities, backlog] = await Promise.all([
    getContentDraftBoard(),
    getEventWindows(),
    getProjectIdeas(),
    getEntityCounts(),
    getBacklog(),
  ]);

  const draftsTotal = board.reduce((sum, col) => sum + col.drafts.length, 0);
  const published = board.find((c) => c.status === "published")?.drafts.length ?? 0;
  const needsReview = board.find((c) => c.status === "needs_review")?.drafts.length ?? 0;
  const activeIdeas = ideas.filter((i) => i.status === "active").length;

  const tiles = [
    { label: "drafts", value: draftsTotal, sub: `${needsReview} need review`, href: "/ops/content" },
    { label: "published *", value: published, sub: "status proxy", href: "/ops/content" },
    { label: "events", value: windows.total, sub: `${windows.last30.length} in 30d`, href: "/ops/events" },
    { label: "ideas", value: ideas.length, sub: `${activeIdeas} active`, href: "/ops/ideas" },
    { label: "open issues", value: backlog.length, sub: "Linear", href: "/ops/backlog" },
    {
      label: "entities",
      value: entities.people + entities.companies + entities.topics,
      sub: `${entities.people} ppl · ${entities.companies} co · ${entities.topics} topics`,
      href: "/ops/entities",
    },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold">Overview</h1>
      <p className="mt-1 text-xs text-muted">Live operating state — pulled from Notion + Linear.</p>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="bg-surface px-4 py-5 transition-colors hover:bg-bg"
          >
            <div className="text-2xl font-semibold tabular-nums">{tile.value}</div>
            <div className="mt-1 text-[11px] uppercase tracking-widest text-muted">{tile.label}</div>
            <div className="mt-1 text-[11px] text-muted/70">{tile.sub}</div>
          </Link>
        ))}
      </div>

      <p className="mt-4 max-w-2xl text-[11px] leading-relaxed text-muted/80">
        * &ldquo;published&rdquo; is the Notion status field — a lagging proxy, not a verified-live
        signal, and it spans every content type (posts, DMs, notes). Treat it as &ldquo;marked
        done,&rdquo; not reach.
      </p>
    </div>
  );
}
