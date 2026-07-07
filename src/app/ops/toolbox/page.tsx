import manifest from "@/data/toolbox.json";

export const dynamic = "force-dynamic";

type Item = { type: string; name: string; description: string; args: string; group: string; tier: string };

// Snapshot of the pipeline's .claude/{commands,skills,agents} frontmatter. The live `/toolbox`
// command in Claude Code is always-current; this page is the browsable surface (regenerate the
// manifest when tools change — see the pipeline's /toolbox generator).
const GROUP_ORDER = [
  "Event research & prep",
  "Content",
  "Job search & market-intel",
  "Signal scanners",
  "Measurement & rigor",
  "Research & strategy",
  "Meta",
  "Other",
  "Agents (invoked by workflows)",
];

export default function ToolboxPage() {
  const items = manifest.items as Item[];
  const c = manifest.counts as { command: number; skill: number; agent: number };
  const groups = GROUP_ORDER.map((g) => ({ group: g, items: items.filter((i) => i.group === g) })).filter(
    (g) => g.items.length,
  );

  return (
    <div>
      <h1 className="text-lg font-semibold">Toolbox</h1>
      <p className="mt-1 text-xs text-muted">
        Every Empire State command, skill, and agent — {c.command} commands · {c.skill} skills · {c.agent} agents.
        Tiers: <span className="text-emerald-500">T1</span> auto-fires ·{" "}
        <span className="text-amber-500">T2</span> auto-starts then gates ·{" "}
        <span className="text-rose-500">T3</span> manual. In Claude Code, the live{" "}
        <code className="rounded bg-border/40 px-1 font-mono">/toolbox</code> is always current.
      </p>

      <div className="mt-6 space-y-8">
        {groups.map((g) => (
          <section key={g.group}>
            <h2 className="mb-3 text-xs uppercase tracking-widest text-muted">
              {g.group} ({g.items.length})
            </h2>
            <ul className="space-y-1.5">
              {g.items.map((i) => (
                <li key={i.type + i.name} className="rounded-md border border-border bg-surface p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-fg">{i.name}</span>
                    <TierTag tier={i.tier} />
                    <span className="ml-auto text-[10px] uppercase tracking-widest text-muted/50">{i.type}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{i.description || "—"}</p>
                  {i.args && <p className="mt-0.5 font-mono text-[11px] text-muted/60">{i.args}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function TierTag({ tier }: { tier: string }) {
  if (!tier || tier === "—") return null;
  const color = tier === "T1" ? "text-emerald-500" : tier === "T2" ? "text-amber-500" : "text-rose-500";
  return <span className={`rounded border border-border px-1 py-0.5 text-[10px] ${color}`}>{tier}</span>;
}
