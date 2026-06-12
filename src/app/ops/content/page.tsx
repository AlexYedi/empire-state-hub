import {
  getContentDraftBoard,
  type ContentDraft,
  type ContentStatus,
} from "@/lib/content-drafts";

export const dynamic = "force-dynamic";

const STATUS_META: Record<ContentStatus, { label: string; accent: string }> = {
  needs_review: { label: "Needs review", accent: "text-amber-400" },
  approved: { label: "Approved", accent: "text-sky-400" },
  scheduled: { label: "Scheduled", accent: "text-violet-400" },
  published: { label: "Published", accent: "text-emerald-400" },
  archived: { label: "Archived", accent: "text-zinc-500" },
};

export default async function ContentBoardPage() {
  const board = await getContentDraftBoard();
  const total = board.reduce((sum, col) => sum + col.drafts.length, 0);

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Content Drafts</h1>
        <p className="text-xs text-muted">{total} drafts · live from Notion</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {board.map((col) => {
          const meta = STATUS_META[col.status];
          return (
            <section key={col.status} className="w-72 shrink-0">
              <header className="mb-3 flex items-center justify-between border-b border-border pb-2">
                <span className={`text-sm font-medium ${meta.accent}`}>{meta.label}</span>
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                  {col.drafts.length}
                </span>
              </header>
              <div className="flex flex-col gap-2">
                {col.drafts.length === 0 ? (
                  <p className="px-1 text-xs text-muted/60">—</p>
                ) : (
                  col.drafts.slice(0, 60).map((draft) => <Card key={draft.id} draft={draft} />)
                )}
                {col.drafts.length > 60 && (
                  <p className="px-1 text-[11px] text-muted/60">
                    + {col.drafts.length - 60} more
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-6 max-w-2xl text-[11px] leading-relaxed text-muted/80">
        &ldquo;Published&rdquo; reflects the Notion status field — a lagging proxy, not a
        verified-live signal, and it spans every content type. It means &ldquo;marked done,&rdquo;
        not reach.
      </p>
    </div>
  );
}

function Card({ draft }: { draft: ContentDraft }) {
  return (
    <article className="rounded-md border border-border bg-surface p-3">
      <p className="line-clamp-2 text-xs leading-snug text-fg">{draft.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
        {draft.type && <span className="rounded bg-bg px-1.5 py-0.5">{draft.type}</span>}
        {draft.phase && <span className="text-muted/70">{draft.phase}</span>}
      </div>
      {draft.publishedUrl && (
        <a
          href={draft.publishedUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block truncate text-[10px] text-accent hover:underline"
        >
          ↗ {draft.publishedUrl}
        </a>
      )}
    </article>
  );
}
