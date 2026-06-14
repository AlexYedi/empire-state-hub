import { getProjectIdeas } from "@/lib/project-ideas";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const ideas = await getProjectIdeas();
  const active = ideas.filter((i) => i.status === "active").length;
  const shipped = ideas.filter((i) => i.status === "shipped").length;

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Project Ideas</h1>
        <p className="text-xs text-muted">
          {ideas.length} total · {active} active · {shipped} shipped
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {ideas.map((idea, i) => (
          <div
            key={idea.id}
            className={`flex items-center gap-4 px-4 py-2.5 text-sm ${i % 2 ? "bg-surface" : "bg-bg"}`}
          >
            <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-accent">
              {idea.composite ?? "—"}
            </span>
            <span className="flex-1 truncate">{idea.name}</span>
            {idea.complexity && (
              <span className="hidden shrink-0 text-[10px] text-muted/70 md:inline">
                {idea.complexity}
              </span>
            )}
            {idea.proposalType && (
              <span className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted sm:inline">
                {idea.proposalType}
              </span>
            )}
            {idea.status && (
              <span className="w-16 shrink-0 text-right text-[10px] text-muted">{idea.status}</span>
            )}
          </div>
        ))}
        {ideas.length === 0 && <p className="px-4 py-3 text-xs text-muted/60">No ideas yet.</p>}
      </div>
      <p className="mt-4 text-[11px] text-muted/70">Score = composite of 6 dimensions (1–10 each).</p>
    </div>
  );
}
