"use client";

import { useLens } from "@/components/lens-provider";
import { CHANGELOG } from "@/data/changelog";
import { changelogFigure } from "@/data/diagrams";
import { Figure } from "@/components/diagram/figure";

export default function ChangelogPage() {
  const { lens } = useLens();
  const ed = lens === "editorial";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        {ed ? "How it got here" : "changelog"}
      </p>
      <h1
        className={
          ed
            ? "mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
            : "mt-4 font-mono text-3xl font-semibold tracking-tight sm:text-4xl"
        }
      >
        {ed ? "Two months, one reset." : "Build log."}
      </h1>
      <p className="mt-3 font-mono text-sm text-muted">
        {CHANGELOG.commits} commits · {CHANGELOG.span}
      </p>

      <ol className="mt-12 space-y-8 border-l border-border pl-6">
        {CHANGELOG.entries.map((entry) => {
          const figure = changelogFigure(entry.date, entry.title);
          return (
          <li key={`${entry.date}-${entry.title}`} className="relative">
            <span className="absolute -left-[27px] top-1.5 h-2 w-2 rounded-full bg-accent" />
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
              {entry.date}
            </div>
            <h2
              className={
                ed ? "mt-1 font-display text-xl tracking-tight" : "mt-1 text-base font-semibold"
              }
            >
              {entry.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{entry.body}</p>
            {figure && <Figure id={figure.id} spec={figure.spec} />}
          </li>
          );
        })}
      </ol>
    </div>
  );
}
