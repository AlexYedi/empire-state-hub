"use client";

import { useLens } from "@/components/lens-provider";
import type { LinearState, SystemMap } from "@/lib/system-map/schema";

export function ArchitectureIntro({ map, linear }: { map: SystemMap; linear: LinearState[] | null }) {
  const linearLive = linear !== null;
  const done = new Set((linear ?? []).filter((l) => l.stateType === "completed" || l.stateType === "canceled").map((l) => l.identifier));
  const planned = map.buildPath.items.filter((it) => !done.has(it.issue)).length;
  const { lens } = useLens();
  const stale = map.components.filter((c) => c.status === "stale").length;
  const scaffolded = map.components.filter((c) => c.status === "scaffolded").length;
  const nextAnchor = map.buildPath.anchors.find((a) => a.date >= map.generated_at) ?? map.buildPath.anchors.at(-1);

  if (lens === "editorial") {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 pb-8 pt-16">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">The system</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">A map you can ask questions of.</h1>
        <div className="mt-6 max-w-2xl space-y-4 text-lg leading-relaxed text-muted">
          <p>
            Everything below is the pipeline as it actually is: {map.components.length} parts in six lanes, every one clickable.
            Pick a box and you get what it does, the decision it came out of, when it first shipped, what it talks to, and what is
            being built on top of it next. Pick an arrow and you get what flows along it.
          </p>
          <p>
            It is deliberately unflattering. Status is derived from the code, not from how I&apos;d like it to look: right now{" "}
            {stale === 1 ? "one part is" : `${stale} parts are`} <span className="text-amber-500">stale</span> and {scaffolded} are honest scaffolds.
            The dashed items are the build path — {planned} pieces of planned work, read live from Linear
            {linearLive ? "" : " (offline at the moment, so their state is unknown)"}, the next anchor being{" "}
            <span className="text-fg">{nextAnchor?.label}</span> on {nextAnchor?.date}.
          </p>
          <p className="text-fg">
            Flip to <span className="font-mono text-sm">Technical</span> for tools, files and the reference graph under each part.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-8 pt-16 font-mono">
      <p className="text-xs uppercase tracking-widest text-muted">architecture · system map</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Two layers, generated, honest.</h1>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
        Layer 1: {map.components.length} curated components across {map.zones.length} zones and {map.edges.length} typed edges (reads · writes ·
        dispatches · gates · produces · depends-on). Layer 2: the ADR-8 system graph — {map.source.graph_nodes} artifacts and{" "}
        {map.source.graph_edges} load-bearing references, rebuilt from the repo at every session start, {map.source.unmapped_files} of them not yet
        assigned to a component. Facts (descriptions, dates, tools, files) are generated from the pipeline at {map.source.pipeline_sha};
        the reasoning is a hand-curated overlay where every claim names its source. Build path: roadmap phases{" "}
        {map.buildPath.phases.map((p) => p.id).join(" → ")}, states read from Linear{linearLive ? " (live)" : " (unreachable now — states unknown)"}.
        Generated {map.generated_at}.
      </p>
    </div>
  );
}
