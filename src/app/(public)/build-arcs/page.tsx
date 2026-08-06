"use client";

import { useLens } from "@/components/lens-provider";
import { BUILD_ARCS, THEMES } from "@/data/build-arcs";

const FACETS = [
  { key: "what", label: "What it is" },
  { key: "why", label: "Why it exists" },
  { key: "value", label: "The value" },
  { key: "bestPractices", label: "Best practices it draws on" },
  { key: "v1Limits", label: "What V1 doesn't do yet" },
  { key: "future", label: "Where it goes" },
  { key: "enterprise", label: "Enterprise tie-in" },
] as const;

export default function BuildArcsPage() {
  const { lens } = useLens();
  const ed = lens === "editorial";

  let arcIndex = 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        {ed ? "The sprints" : "build-arcs"}
      </p>
      <h1
        className={
          ed
            ? "mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
            : "mt-4 font-mono text-3xl font-semibold tracking-tight sm:text-4xl"
        }
      >
        {ed ? "The work, in arcs." : "Build arcs."}
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-muted">{BUILD_ARCS.intro}</p>

      {THEMES.map((theme) => {
        const arcs = BUILD_ARCS.arcs.filter((a) => a.theme === theme.id);
        if (arcs.length === 0) return null;
        return (
          <section key={theme.id} className="mt-16">
            <div className="border-b border-border pb-4">
              <h2
                className={
                  ed
                    ? "font-display text-2xl tracking-tight sm:text-3xl"
                    : "font-mono text-xl font-semibold tracking-tight"
                }
              >
                {theme.label}
              </h2>
              <p className="mt-1.5 text-sm text-muted">{theme.blurb}</p>
            </div>

            <div className="mt-10 space-y-14">
              {arcs.map((arc) => {
                arcIndex += 1;
                return (
                  <article key={arc.id} className="scroll-mt-24" id={arc.id}>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-accent">
                      Arc {String(arcIndex).padStart(2, "0")} · {arc.tagline}
                    </div>
                    <h3
                      className={
                        ed
                          ? "mt-2 font-display text-xl tracking-tight sm:text-2xl"
                          : "mt-2 text-lg font-semibold tracking-tight"
                      }
                    >
                      {arc.name}
                    </h3>

                    <dl className="mt-5 space-y-4 border-l border-border pl-6">
                      {FACETS.map((f) => (
                        <div key={f.key}>
                          <dt className="font-mono text-[11px] uppercase tracking-widest text-muted">
                            {f.label}
                          </dt>
                          <dd className="mt-1.5 text-sm leading-relaxed text-fg/90">
                            {arc[f.key]}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="mt-16 rounded-lg border border-border bg-surface p-6">
        <div className="font-mono text-[11px] uppercase tracking-widest text-accent">
          The through-line
        </div>
        <p className="mt-3 text-base leading-relaxed text-fg/90">{BUILD_ARCS.throughLine}</p>
      </div>
    </div>
  );
}
