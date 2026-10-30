"use client";

import { useLens } from "@/components/lens-provider";
import type { Build } from "@/lib/builds";

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export function BuildsIndex({ builds }: { builds: Build[] }) {
  const { lens } = useLens();
  const ed = lens === "editorial";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        {ed ? "The things built along the way" : "builds"}
      </p>
      <h1
        className={
          ed
            ? "mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
            : "mt-4 font-mono text-3xl font-semibold tracking-tight sm:text-4xl"
        }
      >
        {ed ? "Built, not just planned." : "Builds."}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
        {ed
          ? "The pipeline, this site, and the tools in between — each with what it is and where its code lives."
          : "Committed, public builds only. Fields render empty until there is something real to show."}
      </p>

      {builds.length === 0 ? (
        <p className="mt-12 text-muted">
          Nothing published yet — builds appear here once their entries land in the
          committed data.
        </p>
      ) : (
        <ul className="mt-12 divide-y divide-border border-y border-border">
          {builds.map((build) => (
            <li key={build.slug} className="py-8">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-mono text-lg font-semibold tracking-tight">
                  {build.name}
                </h2>
                <span className="font-mono text-xs text-muted">
                  {build.date ? fmtDate(build.date) : "date TBC"}
                </span>
              </div>

              {build.event ? (
                <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted">
                  {build.event}
                </p>
              ) : null}

              {build.oneLine ? (
                <p className="mt-3 leading-relaxed text-muted">{build.oneLine}</p>
              ) : (
                <p className="mt-3 text-muted italic">
                  No public description yet.
                </p>
              )}

              {build.stack.length > 0 && (
                <p className="mt-3 flex flex-wrap gap-2 font-mono text-[11px] text-muted">
                  {build.stack.map((item) => (
                    <span
                      key={item}
                      className="rounded border border-border px-2 py-0.5"
                    >
                      {item}
                    </span>
                  ))}
                </p>
              )}

              {(build.repoUrl || build.demoUrl) && (
                <p className="mt-4 flex gap-4 text-sm">
                  {build.repoUrl && (
                    <a
                      href={build.repoUrl}
                      className="underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-fg"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {ed ? "See the code" : "repo"}
                    </a>
                  )}
                  {build.demoUrl && (
                    <a
                      href={build.demoUrl}
                      className="underline decoration-accent decoration-2 underline-offset-4 transition-colors hover:text-fg"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {ed ? "Try it" : "demo"}
                    </a>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
