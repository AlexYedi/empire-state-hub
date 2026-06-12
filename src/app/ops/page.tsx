import Link from "next/link";
import { getContentDraftBoard } from "@/lib/content-drafts";

export const dynamic = "force-dynamic";

export default async function OpsOverview() {
  const board = await getContentDraftBoard();
  const total = board.reduce((sum, col) => sum + col.drafts.length, 0);

  return (
    <div>
      <h1 className="text-lg font-semibold">Overview</h1>
      <p className="mt-1 text-xs text-muted">Live operating state — pulled from Notion.</p>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
        {board.map((col) => (
          <Link
            key={col.status}
            href="/ops/content"
            className="bg-surface px-4 py-5 transition-colors hover:bg-bg"
          >
            <div className="text-2xl font-semibold">{col.drafts.length}</div>
            <div className="mt-1 text-[11px] uppercase tracking-widest text-muted">
              {col.status.replace("_", " ")}
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted">
        {total} content drafts total ·{" "}
        <Link href="/ops/content" className="text-accent hover:underline">
          open the board →
        </Link>
      </p>
      <p className="mt-6 max-w-xl text-[11px] leading-relaxed text-muted/80">
        Note: &ldquo;published&rdquo; is the Notion status field — a lagging proxy, not a
        verified-live signal, and it spans every content type (posts, DMs, notes). Treat it as
        &ldquo;marked done,&rdquo; not as reach.
      </p>
    </div>
  );
}
