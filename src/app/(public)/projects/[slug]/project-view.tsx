"use client";

import Link from "next/link";
import { useLens } from "@/components/lens-provider";
import type { Milestone, Project } from "@/lib/projects";
import { cn } from "@/lib/cn";
import { HealthPill, KIND, Pill, ProgressBar, fmtDate } from "../ui";

const TREND: Record<NonNullable<Project["trend"]>, { glyph: string; label: string }> = {
  improving: { glyph: "↗", label: "improving" },
  steady: { glyph: "→", label: "steady" },
  worsening: { glyph: "↘", label: "worsening" },
};

const CERTAINTY: Record<NonNullable<Milestone["certainty"]>, string> = {
  "figuring-out": "still figuring out",
  executing: "known, executing",
};

const CHANGE: Record<"done" | "changed" | "slipped" | "learned", { label: string; cls: string }> = {
  done: { label: "Done", cls: "text-accent" },
  changed: { label: "Changed", cls: "text-fg" },
  slipped: { label: "Slipped", cls: "text-amber-500" },
  learned: { label: "Learned", cls: "text-muted" },
};

const MILESTONE_MARK: Record<Milestone["status"], { mark: string; label: string; cls: string }> = {
  done: { mark: "●", label: "Done", cls: "text-accent" },
  active: { mark: "◐", label: "Now", cls: "text-fg" },
  next: { mark: "○", label: "Next", cls: "text-muted" },
  later: { mark: "·", label: "Later", cls: "text-muted" },
};

export function ProjectView({
  project: p,
  parent,
  subprojects,
}: {
  project: Project;
  parent?: Project;
  subprojects: Project[];
}) {
  const { lens } = useLens();
  const ed = lens === "editorial";
  const h2 = ed ? "font-display text-2xl tracking-tight" : "font-mono text-lg font-semibold tracking-tight";
  // Context (why, what, where, showcase). With a bottom line it moves below the plan, status-report
  // style; pages without one keep it at the top so they still open with their framing.
  const context = (
    <>
      <section className={cn("mt-12 grid gap-8 sm:grid-cols-3", p.summary && "border-t border-border pt-12")}>
        <Block title={ed ? "Why it exists" : "problem"} body={p.why} />
        <Block title={ed ? "What we're building" : "build"} body={p.mission} />
        <Block title={ed ? "Where it's going" : "definition of done"} body={p.destination} />
      </section>

      <section className="mt-12 rounded-lg border border-border bg-surface p-6">
        <h2 className={h2}>{ed ? "What this shows" : "Capabilities exercised"}</h2>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed">
          {p.showcase.map((s) => (
            <li key={s} className="flex gap-3">
              <span className="text-accent" aria-hidden>
                →
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );

  return (
    <article className="mx-auto w-full max-w-5xl px-6 py-16">
      <Link href="/projects" className="font-mono text-xs text-muted transition-colors hover:text-fg">
        ← {ed ? "In flight" : "projects"}
      </Link>

      <header className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          <Pill>{KIND[p.kind]}</Pill>
          <HealthPill project={p} />
          {p.trend && (
            <Pill>
              <span aria-hidden>{TREND[p.trend].glyph}</span> {TREND[p.trend].label}
            </Pill>
          )}
          {p.confidence && <Pill>confidence {p.confidence}</Pill>}
          {parent && (
            <Link href={`/projects/${parent.slug}`} className="font-mono text-[11px] text-muted hover:text-fg">
              part of {parent.title} →
            </Link>
          )}
        </div>
        <h1
          className={
            ed
              ? "mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
              : "mt-4 font-mono text-3xl font-semibold tracking-tight sm:text-4xl"
          }
        >
          {p.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{p.tagline}</p>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-border py-4 sm:grid-cols-4">
          <Meta label="Phase" value={p.phase} />
          <Meta label="Owner" value={p.owner} />
          <Meta label="Started" value={fmtDate(p.started)} />
          {p.completed ? (
            <Meta label="Completed" value={fmtDate(p.completed)} />
          ) : (
            <Meta label="Target" value={p.target ? fmtDate(p.target) : "Open-ended"} />
          )}
        </dl>
        <p className="mt-2 font-mono text-[11px] text-muted">updated {fmtDate(p.updated)}</p>
        {!p.summary && p.healthWhy && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">Health call: {p.healthWhy}</p>
        )}
      </header>

      {!p.summary && context}

      {/* Status-report order: bottom line, then what's needed, then what changed. Context comes last. */}
      {p.summary && (
        <section className="mt-12 rounded-lg border border-accent/40 bg-surface p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
            {ed ? "Bottom line" : "bluf"}
          </h2>
          <p className="mt-3 text-base leading-relaxed">{p.summary}</p>
          {p.healthWhy && (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              <span className="font-mono text-[11px] uppercase tracking-widest">Health call: </span>
              {p.healthWhy}
            </p>
          )}
        </section>
      )}

      {p.asks.length > 0 && (
        <section className="mt-12">
          <h2 className={h2}>{ed ? "Decisions needed" : "decisions needed"}</h2>
          <ol className="mt-4 list-decimal space-y-4 pl-5 marker:font-mono marker:text-xs marker:text-muted">
            {p.asks.map((a, i) => (
              <li key={`${i}-${a.decision}`} className="rounded-lg border border-border p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{a.decision}</p>
                  <span className="font-mono text-[11px] text-muted">
                    {a.owner}
                    {a.due && <> · by {fmtDate(a.due)}</>} · {a.reversible ? "reversible" : "hard to reverse"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-accent">Recommend: </span>
                  {a.recommendation}
                </p>
                {a.options.length > 0 && (
                  <p className="mt-2 text-sm leading-relaxed text-muted">Other options: {a.options.join(" · ")}</p>
                )}
                <p className="mt-2 text-sm leading-relaxed text-muted">If it waits: {a.costOfDelay}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {p.sinceLast && (
        <section className="mt-12">
          <h2 className={h2}>
            {ed ? "Since the last update" : "delta"}
            <span className="ml-3 font-mono text-[11px] font-normal text-muted">since {fmtDate(p.sinceLast.since)}</span>
          </h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed">
            {p.sinceLast.changes.map((c, i) => (
              <li key={`${i}-${c.text}`} className="grid gap-1 sm:grid-cols-[6rem_1fr]">
                <span className={cn("font-mono text-[11px] uppercase tracking-widest", CHANGE[c.kind].cls)}>
                  {CHANGE[c.kind].label}
                </span>
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <section>
          <h2 className={h2}>{ed ? "Milestones" : "milestones"}</h2>
          <div className="mt-4 max-w-xs">
            <ProgressBar milestones={p.milestones} />
          </div>
          <ol className="mt-6 space-y-4">
            {p.milestones.map((m, i) => {
              const s = MILESTONE_MARK[m.status];
              return (
                <li key={i} className="flex gap-3">
                  <span className={cn("mt-0.5 w-4 shrink-0 text-center", s.cls)} aria-hidden>
                    {s.mark}
                  </span>
                  <div>
                    <p className={cn("text-sm", m.status === "active" && "font-semibold")}>
                      {m.title}
                      <span className="ml-2 font-mono text-[11px] text-muted">
                        {s.label}
                        {m.date && <> · {fmtDate(m.date)}</>}
                        {!m.date && m.target && <> · target {fmtDate(m.target)}</>}
                        {m.status !== "done" && m.certainty && <> · {CERTAINTY[m.certainty]}</>}
                      </span>
                    </p>
                    {m.note && <p className="mt-1 text-sm leading-relaxed text-muted">{m.note}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section>
          <h2 className={h2}>{ed ? "The numbers" : "metrics (baseline → now)"}</h2>
          {p.metrics.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              No metric yet. A number goes here only with its do-nothing baseline beside it.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {p.metrics.map((m) => (
                <div key={m.label} className="rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold">{m.label}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Figure label="Baseline" value={m.baseline} />
                    <Figure label="Now" value={m.current} strong />
                    <Figure label="Target" value={m.target ?? "—"} />
                  </div>
                  {m.note && <p className="mt-3 text-sm leading-relaxed text-muted">{m.note}</p>}
                  <p className="mt-3 font-mono text-[11px] text-muted">
                    as of {fmtDate(m.asOf)} · source:{" "}
                    {m.source.url ? (
                      <a
                        href={m.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-border underline-offset-4 hover:text-fg"
                      >
                        {m.source.label} ↗
                      </a>
                    ) : (
                      m.source.label
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {(p.issues.length > 0 || p.dependencies.length > 0) && (
        <div className="mt-12 grid gap-12 sm:grid-cols-2">
          {p.issues.length > 0 && (
            <section>
              <h2 className={h2}>{ed ? "Problems right now" : "issues"}</h2>
              <ul className="mt-4 space-y-4 text-sm leading-relaxed">
                {p.issues.map((x, i) => (
                  <li key={`${i}-${x.issue}`}>
                    <p>{x.issue}</p>
                    <p className="mt-1 text-muted">Impact: {x.impact}</p>
                    <p className="mt-1 text-muted">
                      Action: {x.action}
                      <span className="ml-2 font-mono text-[11px]">owner: {x.owner}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {p.dependencies.length > 0 && (
            <section>
              <h2 className={h2}>{ed ? "Waiting on" : "dependencies"}</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed">
                {p.dependencies.map((d, i) => (
                  <li key={`${i}-${d.on}`}>
                    <span className="font-semibold">{d.on}</span>: {d.need}
                    <span className="ml-2 font-mono text-[11px] text-muted">{d.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {(p.open.length > 0 || p.risks.length > 0) && (
        <div className="mt-12 grid gap-12 sm:grid-cols-2">
          {p.open.length > 0 && (
            <section>
              <h2 className={h2}>{ed ? "Decisions still open" : "open decisions"}</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed">
                {p.open.map((o) => (
                  <li key={o.question}>
                    {o.question}
                    <span className="ml-2 font-mono text-[11px] text-muted">owner: {o.owner}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {p.risks.length > 0 && (
            <section>
              <h2 className={h2}>{ed ? "Risks and blockers" : "risks"}</h2>
              <ul className="mt-4 space-y-4 text-sm leading-relaxed">
                {p.risks.map((r) => (
                  <li key={r.risk}>
                    <p>
                      {r.risk}
                      {(r.likelihood || r.impact) && (
                        <span className="ml-2 font-mono text-[11px] text-muted">
                          {r.likelihood && <>likelihood {r.likelihood}</>}
                          {r.likelihood && r.impact && " · "}
                          {r.impact && <>impact {r.impact}</>}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-muted">Mitigation: {r.mitigation}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {p.decisions.length > 0 && (
        <section className="mt-12">
          <h2 className={h2}>{ed ? "Decisions made" : "decision log"}</h2>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {p.decisions.map((d) => (
              <li key={d.date + d.decision} className="grid gap-1 py-4 sm:grid-cols-[7rem_1fr]">
                <span className="font-mono text-[11px] text-muted">{fmtDate(d.date)}</span>
                <div className="text-sm leading-relaxed">
                  <p>{d.decision}</p>
                  <p className="mt-1 text-muted">Why: {d.why}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.summary && context}

      {subprojects.length > 0 && (
        <section className="mt-12">
          <h2 className={h2}>{ed ? "Sub-projects" : "children"}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {subprojects.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/projects/${c.slug}`}
                  className="block rounded-lg border border-border p-4 transition-colors hover:border-accent"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{c.title}</span>
                    <HealthPill project={c} />
                  </div>
                  <p className="mt-1 text-sm text-muted">{c.phase}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.log.length > 0 && (
        <section className="mt-12">
          <h2 className={h2}>{ed ? "Recent updates" : "log"}</h2>
          <ol className="mt-4 space-y-3">
            {p.log.map((l) => (
              <li key={l.date + l.text} className="grid gap-1 text-sm leading-relaxed sm:grid-cols-[7rem_1fr]">
                <span className="font-mono text-[11px] text-muted">{fmtDate(l.date)}</span>
                <span>{l.text}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {(p.links.length > 0 || p.stack.length > 0 || p.tracking.length > 0) && (
        <footer className="mt-12 border-t border-border pt-6">
          {p.links.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {p.links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-border underline-offset-4 transition-colors hover:text-accent"
                >
                  {l.label} ↗
                </a>
              ))}
            </div>
          )}
          {p.stack.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {p.stack.map((s) => (
                <Pill key={s}>{s}</Pill>
              ))}
            </div>
          )}
          {p.tracking.length > 0 && (
            <p className="mt-4 font-mono text-[11px] text-muted">tracked as {p.tracking.join(" · ")}</p>
          )}
        </footer>
      )}
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-widest text-muted">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-muted">{title}</p>
      <p className="mt-3 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <p className={cn("mt-1 text-sm", strong && "font-semibold text-accent")}>{value}</p>
    </div>
  );
}
