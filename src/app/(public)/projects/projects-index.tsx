"use client";

import Link from "next/link";
import { useLens } from "@/components/lens-provider";
import type { InFlightPlan } from "@/lib/in-flight-plan";
import type { Project } from "@/lib/projects";
import { HealthPill, KIND, ProgressBar, fmtDate, nowMilestone } from "./ui";

export function ProjectsIndex({ projects, plan }: { projects: Project[]; plan?: InFlightPlan }) {
  const { lens } = useLens();
  const ed = lens === "editorial";
  const live = projects.filter((p) => p.status !== "archived");
  const archived = projects.filter((p) => p.status === "archived");
  const byslug = new Map(projects.map((p) => [p.slug, p]));
  const latest = projects.map((p) => p.updated).sort().at(-1);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        {ed ? "In flight" : "projects // mission control"}
      </p>
      <h1
        className={
          ed
            ? "mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
            : "mt-4 font-mono text-3xl font-semibold tracking-tight sm:text-4xl"
        }
      >
        {ed ? "What's being built right now." : "Active builds, with their numbers."}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
        {ed
          ? "Each project here says why it exists, where it's going and what's left. It's updated when a milestone moves, not on every commit, and archived when it's done."
          : "One file per project, schema-checked at build. Every metric carries its do-nothing baseline; the log is milestone-level; finished work moves to the archive."}
      </p>
      <p className="mt-1 font-mono text-[11px] text-muted">
        {live.length} in flight · {archived.length} archived
        {latest && <> · last update {fmtDate(latest)}</>}
      </p>

      {plan && <PlanBlock plan={plan} byslug={byslug} ed={ed} />}

      <section className="mt-10">
        {live.length === 0 ? (
          <p className="text-sm italic text-muted">Nothing in flight right now.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {live.map((p) => (
              <ProjectCard key={p.slug} project={p} parent={p.parent ? byslug.get(p.parent) : undefined} ed={ed} />
            ))}
          </div>
        )}
      </section>

      {archived.length > 0 && (
        <section className="mt-16 border-t border-border pt-10">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">{ed ? "Archive" : "archived"}</p>
          <h2
            className={
              ed
                ? "mt-3 font-display text-2xl tracking-tight"
                : "mt-3 font-mono text-xl font-semibold tracking-tight"
            }
          >
            {ed ? "Finished, and what they left behind." : "Closed projects."}
          </h2>
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {archived.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/projects/${p.slug}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-4 transition-colors hover:text-accent"
                >
                  <span className={ed ? "font-display text-lg tracking-tight" : "font-mono text-base"}>{p.title}</span>
                  <span className="font-mono text-[11px] text-muted">
                    {fmtDate(p.started)} → {fmtDate(p.completed!)}
                  </span>
                  <span className="w-full text-sm text-muted">{p.tagline}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProjectCard({ project: p, parent, ed }: { project: Project; parent?: Project; ed: boolean }) {
  const now = nowMilestone(p.milestones);
  return (
    <Link
      href={`/projects/${p.slug}`}
      className="group flex flex-col rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
          {KIND[p.kind]}
          {parent && <> · {parent.title}</>}
        </span>
        <HealthPill project={p} />
      </div>
      <h2
        className={
          ed
            ? "mt-3 font-display text-xl tracking-tight group-hover:text-accent"
            : "mt-3 font-mono text-lg font-semibold tracking-tight group-hover:text-accent"
        }
      >
        {p.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{p.tagline}</p>

      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="w-14 shrink-0 font-mono text-[11px] uppercase tracking-widest text-muted">Phase</dt>
          <dd>{p.phase}</dd>
        </div>
        {now && (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 font-mono text-[11px] uppercase tracking-widest text-muted">
              {now.status === "active" ? "Now" : "Next"}
            </dt>
            <dd>{now.title}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto pt-5">
        <ProgressBar milestones={p.milestones} />
        <p className="mt-1 font-mono text-[11px] text-muted">
          updated {fmtDate(p.updated)}
          {p.target && <> · target {fmtDate(p.target)}</>}
        </p>
      </div>
    </Link>
  );
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

function PlanBlock({ plan, byslug, ed }: { plan: InFlightPlan; byslug: Map<string, Project>; ed: boolean }) {
  const left = daysBetween(plan.charted, plan.horizon);
  return (
    <section className="mt-10 rounded-lg border border-border bg-surface p-6">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
        {ed ? "The plan" : "plan // re-charted"} · {fmtDate(plan.charted)} · {left} days to {fmtDate(plan.horizon)}
      </p>
      <h2 className={ed ? "mt-3 font-display text-2xl tracking-tight" : "mt-3 font-mono text-xl font-semibold tracking-tight"}>
        {plan.headline}
      </h2>
      <div className="mt-4 space-y-3 text-base leading-relaxed">
        {plan.approach.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {plan.principles.length > 0 && (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {plan.principles.map((pr) => (
            <li key={pr.title} className="rounded-md border border-border p-3 text-sm">
              <span className="font-medium">{pr.title}.</span> <span className="text-muted">{pr.text}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 font-mono text-[11px] uppercase tracking-widest text-muted">{ed ? "The tracks" : "tracks"}</p>
      <ol className="mt-3 space-y-2 text-sm">
        {plan.tracks.map((t, i) => {
          const p = byslug.get(t.slug);
          return (
            <li key={t.slug} className="flex gap-3">
              <span className="font-mono text-muted">{i + 1}</span>
              <span>
                {p ? (
                  <Link href={`/projects/${p.slug}`} className="font-medium hover:text-accent">
                    {p.title}
                  </Link>
                ) : (
                  <span className="font-medium">{t.slug}</span>
                )}{" "}
                <span className="text-muted">— {t.role}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {plan.calendar.length > 0 && (
        <>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-widest text-muted">{ed ? "Week by week" : "calendar"}</p>
          <ul className="mt-3 divide-y divide-border border-y border-border text-sm">
            {plan.calendar.map((w) => (
              <li key={w.week} className={`flex flex-col gap-1 py-2 sm:flex-row sm:gap-4 ${w.dead ? "text-muted" : ""}`}>
                <span className="w-40 shrink-0 font-mono text-[11px] uppercase tracking-widest">
                  {w.week}
                  {w.dead && " · slow week"}
                </span>
                <span>{w.focus}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {plan.parked.length > 0 && (
        <>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-widest text-muted">{ed ? "Parked on purpose" : "frozen"}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {plan.parked.map((x) => (
              <li key={x.item}>
                <span>{x.item}</span> <span className="text-muted">— until {x.until}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
