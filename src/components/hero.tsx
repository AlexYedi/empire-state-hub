"use client";

import Link from "next/link";
import { useLens } from "./lens-provider";
import { SYSTEM } from "@/data/architecture";

/** The thesis in the hero itself: the same project, told two ways. */
export function Hero() {
  const { lens } = useLens();

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-24 sm:py-32">
      {lens === "editorial" ? <EditorialHero /> : <TechnicalHero />}
    </section>
  );
}

function EditorialHero() {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        Field notes · New York
      </p>
      <h1 className="mt-6 font-display text-5xl leading-[1.04] tracking-tight sm:text-6xl">
        Five rooms, one quiet argument.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-muted">
        Most of what happens in New York&apos;s AI rooms never leaves them. This is a running
        account of the ones worth remembering — the panels, the demos, the off-hand lines that
        turn out to matter — and the system I built to turn each night into something that lasts.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-5 text-sm">
        <Link
          href="/pipeline"
          className="rounded-full bg-accent px-5 py-2.5 font-medium text-bg transition-opacity hover:opacity-90"
        >
          Read the story
        </Link>
        <span className="text-muted">
          or flip to <span className="text-fg">Technical</span> to read it as engineering →
        </span>
      </div>
    </div>
  );
}

function TechnicalHero() {
  const { counts } = SYSTEM;
  const stats: [number, string][] = [
    [counts.skills, "skills"],
    [counts.agents, "subagents"],
    [counts.commands, "workflows"],
  ];

  return (
    <div className="max-w-3xl font-mono">
      <p className="text-xs uppercase tracking-widest text-muted">~/empire-state-events</p>
      <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
        A multi-agent pipeline that turns events into content.
      </h1>
      <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
        Calendar invite in. Parallel research fan-out, a synthesizer, dependency-ordered writes
        out — built on Claude skills + MCP. This site is a read-only projection; the agent layer
        is the system of record.
      </p>
      <dl className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {stats.map(([value, label]) => (
          <div key={label} className="bg-surface px-4 py-5 text-center">
            <dt className="text-2xl font-semibold text-fg tabular-nums">{value}</dt>
            <dd className="mt-1 text-[11px] uppercase tracking-widest text-muted">{label}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-10 flex flex-wrap items-center gap-5 text-sm">
        <Link
          href="/pipeline"
          className="rounded bg-accent px-5 py-2.5 font-medium text-bg transition-opacity hover:opacity-90"
        >
          See it run →
        </Link>
        <span className="text-muted">
          or flip to <span className="text-fg">Editorial</span> for the story →
        </span>
      </div>
    </div>
  );
}
