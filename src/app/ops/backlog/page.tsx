import { getBacklog, type BacklogIssue } from "@/lib/linear/backlog";

export const dynamic = "force-dynamic";

const PRIORITY: Record<number, { label: string; tone: string }> = {
  1: { label: "Urgent", tone: "text-red-400" },
  2: { label: "High", tone: "text-amber-400" },
  3: { label: "Medium", tone: "text-sky-400" },
  4: { label: "Low", tone: "text-zinc-500" },
  0: { label: "—", tone: "text-zinc-600" },
};

export default async function BacklogPage() {
  const issues = await getBacklog();

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Backlog</h1>
        <p className="text-xs text-muted">{issues.length} open · Linear (YED)</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {issues.map((issue, i) => (
          <a
            key={issue.id}
            href={issue.url}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-bg ${
              i % 2 ? "bg-surface" : "bg-bg"
            }`}
          >
            <span className={`w-14 shrink-0 text-[10px] uppercase ${prio(issue).tone}`}>
              {prio(issue).label}
            </span>
            <span className="w-16 shrink-0 text-xs text-muted tabular-nums">{issue.identifier}</span>
            <span className="flex-1 truncate">{issue.title}</span>
            {issue.project && (
              <span className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted md:inline">
                {issue.project}
              </span>
            )}
            <span className="w-20 shrink-0 text-right text-[10px] text-muted">{issue.state}</span>
          </a>
        ))}
        {issues.length === 0 && <p className="px-4 py-3 text-xs text-muted/60">No open issues.</p>}
      </div>
    </div>
  );
}

function prio(issue: BacklogIssue) {
  return PRIORITY[issue.priority] ?? PRIORITY[0];
}
