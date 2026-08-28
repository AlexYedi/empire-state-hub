"use client";

import { useLens } from "@/components/lens-provider";
import { BUILD_ARCS, THEMES, type BuildArc } from "@/data/build-arcs";

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

  // Continuous numbering across the arcs built on the foundations — precomputed (no mutation
  // during render) so the numbers stay stable. Order matches the render order (theme order,
  // then BUILD_ARCS.arcs order, non-foundation only).
  const builtOrder = THEMES.flatMap((theme) =>
    BUILD_ARCS.arcs.filter((a) => a.theme === theme.id && !a.foundation).map((a) => a.id),
  );
  const builtNumber = new Map(builtOrder.map((id, i) => [id, i + 1]));

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
        const foundations = arcs.filter((a) => a.foundation);
        const built = arcs.filter((a) => !a.foundation);
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

            {/* foundation anchor(s) */}
            {foundations.map((arc) => (
              <Arc key={arc.id} arc={arc} ed={ed} kicker="◆ Foundation" />
            ))}

            {/* arcs built on the foundation */}
            {built.length > 0 && (
              <div className={foundations.length > 0 ? "mt-12 border-l border-border/60 pl-5" : "mt-2"}>
                {foundations.length > 0 && (
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted">
                    Built on it
                  </p>
                )}
                {built.map((arc) => (
                  <Arc key={arc.id} arc={arc} ed={ed} kicker={`Arc ${String(builtNumber.get(arc.id) ?? 0).padStart(2, "0")}`} />
                ))}
              </div>
            )}
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

function Arc({ arc, ed, kicker }: { arc: BuildArc; ed: boolean; kicker: string }) {
  const isFoundation = kicker.startsWith("◆");
  return (
    <article className="mt-12 scroll-mt-24 first:mt-10" id={arc.id}>
      <div
        className={
          "font-mono text-[11px] uppercase tracking-widest " +
          (isFoundation ? "font-semibold text-accent" : "text-accent")
        }
      >
        {kicker} · {arc.tagline}
      </div>
      <h3
        className={
          ed
            ? "mt-2 font-display tracking-tight " + (isFoundation ? "text-2xl sm:text-[1.7rem]" : "text-xl sm:text-2xl")
            : "mt-2 font-semibold tracking-tight " + (isFoundation ? "text-xl" : "text-lg")
        }
      >
        {arc.name}
      </h3>

      <dl className="mt-5 space-y-4 border-l border-border pl-6">
        {FACETS.map((f) => (
          <div key={f.key}>
            <dt className="font-mono text-[11px] uppercase tracking-widest text-muted">{f.label}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-fg/90">{arc[f.key]}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
