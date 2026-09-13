"use client";

import { useLens } from "@/components/lens-provider";
import { SYSTEM } from "@/data/architecture";
import { pageFigure } from "@/data/diagrams";
import { Figure } from "@/components/diagram/figure";

export default function ArchitecturePage() {
  const { lens } = useLens();
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-20">
      {lens === "editorial" ? <EditorialArchitecture /> : <TechnicalArchitecture />}
    </div>
  );
}

function EditorialArchitecture() {
  return (
    <article className="max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">The system</p>
      <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
        A small machine for paying attention.
      </h1>
      <div className="mt-8 space-y-5 text-lg leading-relaxed text-muted">
        <p>
          The premise is simple: New York&apos;s AI scene throws off more signal in a week than any
          one person can hold. The events are ephemeral, the good lines go unrecorded, and the
          people worth knowing are easy to meet once and never again.
        </p>
        <p>
          So I built a pipeline. A calendar invite goes in. Out comes a researched brief on the
          room — who&apos;s speaking, what their companies just shipped, where the live tensions
          are — plus the content and the connection notes to actually show up prepared. After the
          event, the transcript becomes a durable record and the posts that share what happened.
        </p>
        <FigureAt scope="arch-editorial" figure="workflow-chain" />
        <p>
          None of it is one big prompt. It&apos;s {SYSTEM.counts.agents} small specialists, each
          good at one thing, coordinated by a parent that knows the order things have to happen in.
          The interesting engineering is in that coordination — and in being honest about what the
          numbers do and don&apos;t mean.
        </p>
        <p className="text-fg">
          Flip to <span className="font-mono text-sm">Technical</span> to see how it&apos;s wired.
        </p>
      </div>
    </article>
  );
}

function TechnicalArchitecture() {
  const { counts, agentGroups, workflows, constraint, span } = SYSTEM;

  return (
    <div className="font-mono">
      <p className="text-xs uppercase tracking-widest text-muted">architecture</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Multi-agent, MCP-native, read-projected.
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
        Built solo over {span.label} ({span.from} → {span.to}). Claude skills as the engine,
        direct MCP writes to Notion + HubSpot, no middleware.
      </p>

      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {([
          [counts.skills, "skills"],
          [counts.agents, "subagents"],
          [counts.commands, "workflows"],
          [counts.commits, "commits"],
        ] as [number, string][]).map(([value, label]) => (
          <div key={label} className="bg-surface px-4 py-5">
            <dt className="text-2xl font-semibold tabular-nums">{value}</dt>
            <dd className="mt-1 text-[11px] uppercase tracking-widest text-muted">{label}</dd>
          </div>
        ))}
      </dl>

      {/* The credibility beat. */}
      <section className="mt-12 rounded-lg border border-accent/40 bg-surface p-6">
        <h2 className="text-sm font-semibold text-accent">{constraint.title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{constraint.body}</p>
      </section>
      <FigureAt scope="arch-technical" figure="fanout-constraint" />

      <section className="mt-12">
        <h2 className="text-xs uppercase tracking-widest text-muted">Agents ({counts.agents})</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {agentGroups.map((group) => (
            <div key={group.name} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{group.name}</span>
                <span className="text-xs text-muted tabular-nums">{group.count}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{group.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xs uppercase tracking-widest text-muted">Workflows</h2>
        <FigureAt scope="arch-technical" figure="workflow-chain" />
        <div className="mt-3 overflow-hidden rounded-lg border border-border">
          {workflows.map((wf, i) => (
            <div
              key={wf.id}
              className={`flex items-start gap-4 px-4 py-3 text-sm ${i % 2 ? "bg-surface" : "bg-bg"}`}
            >
              <span className="w-8 shrink-0 text-muted">{wf.id}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{wf.name}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase ${
                      wf.status === "wired"
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {wf.status}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{wf.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FigureAt({ scope, figure }: { scope: string; figure: Parameters<typeof pageFigure>[1] }) {
  const placed = pageFigure(scope, figure);
  return <Figure id={placed.id} spec={placed.spec} />;
}
