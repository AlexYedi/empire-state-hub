"use client";

import Link from "next/link";
import { useLens } from "@/components/lens-provider";
import type { Milestone, Project } from "@/lib/projects";
import { cn } from "@/lib/cn";
import { HealthPill, KIND, Pill, ProgressBar, fmtDate } from "../ui";

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

  return (
    <article className="mx-auto w-full max-w-5xl px-6 py-16">
      <Link href="/projects" className="font-mono text-xs text-muted transition-colors hover:text-fg">
        ← {ed ? "In flight" : "projects"}
      </Link>

      <header className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          <Pill>{KIND[p.kind]}</Pill>
          <HealthPill project={p} />
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
      </header>

      <section className="mt-12 grid gap-8 sm:grid-cols-3">
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

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <section>
          <h2 className={h2}>{ed ? "Milestones" : "milestones"}</h2>
          <div className="mt-4 max-w-xs">
            <ProgressBar milestones={p.milestones} />
          </div>
          <ol className="mt-6 space-y-4">
            {p.milestones.map((m) => {
              const s = MILESTONE_MARK[m.status];
              return (
                <li key={m.title} className="flex gap-3">
                  <span className={cn("mt-0.5 w-4 shrink-0 text-center", s.cls)} aria-hidden>
                    {s.mark}
                  </span>
                  <div>
                    <p className={cn("text-sm", m.status === "active" && "font-semibold")}>
                      {m.title}
                      <span className="ml-2 font-mono text-[11px] text-muted">
                        {s.label}
                        {m.date && <> · {fmtDate(m.date)}</>}
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
                  <div className="mt-3 grid grid-cols-3 gap-3">
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
                    <p>{r.risk}</p>
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
