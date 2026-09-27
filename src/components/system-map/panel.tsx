"use client";

import type { BuildItem, FilesGraph, LinearState, MapEdge, SystemMap } from "@/lib/system-map/schema";
import type { Lens } from "@/lib/lens";
import { EDGE_VERB, KIND_GLYPH, componentById, interactionsOf, plannedFor, type Selection } from "./model";
import { STATUS_DOT } from "./nodes";

type Props = {
  map: SystemMap;
  files: FilesGraph | null;
  linear: Map<string, LinearState>;
  lens: Lens;
  selection: Selection;
  focus: string | null;
  onSelect: (s: Selection) => void;
  onFocus: (componentId: string | null) => void;
  onClose: () => void;
};

const REPO = "https://github.com/AlexYedi/Empire_State_Events_Pipeline_Take_3/blob/main/";

/** The six-field panel (PRD AC2) for a component, or the kind + summary panel for an edge (AC3). */
export function Panel(p: Props) {
  const { selection } = p;
  if (!selection) return null;
  let body: React.ReactNode = null;
  if (selection.type === "node") body = <ComponentPanel {...p} id={selection.id} />;
  else if (selection.type === "edge") body = <EdgePanel {...p} id={selection.id} />;
  else if (selection.type === "planned") body = <PlannedPanel {...p} id={selection.id} />;
  else if (selection.type === "file") body = <FilePanel {...p} id={selection.id} />;
  if (!body) return null;
  return (
    <aside
      className="absolute inset-x-0 bottom-0 z-20 max-h-[58vh] overflow-y-auto border-t border-border bg-bg/95 backdrop-blur md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[400px] md:border-l md:border-t-0"
      aria-live="polite"
    >
      <button
        onClick={p.onClose}
        className="absolute right-3 top-3 rounded px-2 py-1 font-mono text-[11px] text-muted hover:bg-surface hover:text-fg"
        aria-label="Close panel"
      >
        esc ✕
      </button>
      <div className="px-5 pb-8 pt-5 text-[13px] leading-relaxed">{body}</div>
    </aside>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 font-mono text-[10px] uppercase tracking-widest text-muted">{children}</h3>;
}

function Pill({ children, tone = "" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`inline-block rounded border border-border px-1.5 py-0.5 font-mono text-[10px] ${tone}`}>{children}</span>;
}

function ComponentPanel({ map, linear, lens, id, onSelect, onFocus, focus }: Props & { id: string }) {
  const c = componentById(map, id);
  if (!c) return <p className="text-muted">Unknown component.</p>;
  const zone = map.zones.find((z) => z.id === c.zone);
  const interactions = interactionsOf(map, id);
  const next = plannedFor(map, id).filter((it) => !["completed", "canceled"].includes(linear.get(it.issue)?.stateType ?? ""));
  const technical = lens === "technical";
  return (
    <div>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        <span>{zone?.name}</span>
        <span>·</span>
        <span>{KIND_GLYPH[c.kind]}</span>
      </div>
      <h2 className="mt-1 pr-14 text-lg font-semibold leading-tight text-fg">{c.name}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[c.status]}`} />
          {c.status}
        </span>
        {c.overlayStale && <Pill tone="text-muted">curated notes may lag — files changed after {c.reviewed_at}</Pill>}
      </div>
      {c.statusReason && <p className="mt-2 rounded border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[12px] text-fg">{c.statusReason}</p>}

      <H>What it does</H>
      <p className="text-fg">{c.description || <span className="text-muted">No description in the source file.</span>}</p>

      <H>Why it exists</H>
      <p className="text-fg">{c.why.text}</p>
      <p className="mt-1 font-mono text-[11px] text-muted">source: {c.why.source}</p>

      <H>Build story</H>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
        <dt className="text-muted">first shipped</dt>
        <dd className="tabular-nums">{c.build.firstShipped ?? "—"}</dd>
        <dt className="text-muted">last changed</dt>
        <dd className="tabular-nums">{c.build.lastChanged ?? "—"}</dd>
        {c.build.refs.length > 0 && (
          <>
            <dt className="text-muted">Linear</dt>
            <dd className="flex flex-wrap gap-1">
              {c.build.refs.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-accent hover:underline">
                  {r.id}
                </a>
              ))}
            </dd>
          </>
        )}
        {c.build.adrs.length > 0 && (
          <>
            <dt className="text-muted">decisions</dt>
            <dd className="flex flex-wrap gap-1">
              {c.build.adrs.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-accent hover:underline">
                  {r.id}
                </a>
              ))}
            </dd>
          </>
        )}
      </dl>
      {c.build.note && <p className="mt-2 text-[12px] text-muted">{c.build.note}</p>}

      {(technical || c.tools.length > 0) && (
        <>
          <H>Tools used</H>
          {c.tools.length ? (
            <div className="flex flex-wrap gap-1">
              {c.tools.map((t) => (
                <Pill key={t}>{t}</Pill>
              ))}
            </div>
          ) : (
            <p className="text-muted">None declared.</p>
          )}
        </>
      )}

      <H>Interactions ({interactions.length})</H>
      <ul className="space-y-1">
        {interactions.map(({ edge, outgoing, other }) => (
          <li key={edge.id}>
            <button onClick={() => onSelect({ type: "edge", id: edge.id })} className="group w-full text-left hover:text-accent">
              <span className="font-mono text-[11px] text-muted">{outgoing ? "→" : "←"} </span>
              <span className="font-mono text-[11px] text-muted">{outgoing ? EDGE_VERB[edge.kind] : `is ${passive(edge.kind)}`} </span>
              <span className="text-fg group-hover:text-accent">{other.name}</span>
              {edge.status !== "live" && <Pill tone="ml-1 text-amber-500">{edge.status}</Pill>}
            </button>
          </li>
        ))}
        {interactions.length === 0 && <li className="text-muted">No edges yet — a gap in the overlay, not the system.</li>}
      </ul>

      <H>Files ({c.fileCount})</H>
      {c.id === "hub" ? (
        <ul className="font-mono text-[11px] text-muted">
          {c.files.map((f) => (
            <li key={f}>{f.replace(/^hub:/, "")}</li>
          ))}
        </ul>
      ) : c.fileCount === 0 ? (
        <p className="text-muted">External system — nothing in the repo is this component itself.</p>
      ) : (
        <>
          {technical && (
            <ul className="font-mono text-[11px] text-muted">
              {c.files.slice(0, 6).map((f) => (
                <li key={f} className="truncate">
                  <a href={REPO + f} target="_blank" rel="noreferrer" className="hover:text-accent">
                    {f}
                  </a>
                </li>
              ))}
              {c.fileCount > 6 && <li>… {c.fileCount - 6} more</li>}
            </ul>
          )}
          <button
            onClick={() => onFocus(focus === c.id ? null : c.id)}
            className="mt-2 rounded border border-border px-2.5 py-1 font-mono text-[11px] text-fg hover:border-accent hover:text-accent"
          >
            {focus === c.id ? "← back to the map" : `Explore ${c.fileCount} files ↗`}
          </button>
        </>
      )}

      {next.length > 0 && (
        <>
          <H>What&apos;s next here</H>
          <ul className="space-y-2">
            {next.map((it) => (
              <li key={it.issue}>
                <NextRow item={it} state={linear.get(it.issue) ?? null} onClick={() => onSelect({ type: "planned", id: it.issue })} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function passive(kind: MapEdge["kind"]) {
  return { reads: "read by", writes: "written to by", dispatches: "dispatched by", gates: "gated by", produces: "produced by", consumes: "consumed by", "depends-on": "depended on by" }[kind];
}

function NextRow({ item, state, onClick }: { item: BuildItem; state: LinearState | null; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left hover:text-accent">
      <span className="font-mono text-[11px] text-accent">{item.issue}</span>
      <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-muted">{item.phase === "now" ? "now" : item.phase}</span>
      {state && <span className="ml-2 font-mono text-[10px] text-muted">{state.state}</span>}
      <div className="text-[12px] text-fg">{state?.title ?? item.why}</div>
    </button>
  );
}

function EdgePanel({ map, id, onSelect }: Props & { id: string }) {
  const e = map.edges.find((x) => x.id === id);
  if (!e) return <p className="text-muted">Unknown edge.</p>;
  const s = componentById(map, e.source)!;
  const t = componentById(map, e.target)!;
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">interaction · {e.kind}</div>
      <h2 className="mt-1 pr-14 text-base font-semibold leading-snug text-fg">
        <button onClick={() => onSelect({ type: "node", id: s.id })} className="hover:text-accent">
          {s.name}
        </button>
        <span className="mx-2 font-mono text-[12px] font-normal text-muted">{EDGE_VERB[e.kind]}</span>
        <button onClick={() => onSelect({ type: "node", id: t.id })} className="hover:text-accent">
          {t.name}
        </button>
      </h2>
      {e.status !== "live" && (
        <p className="mt-2">
          <Pill tone="text-amber-500">{e.status}</Pill>
        </p>
      )}
      <H>What flows</H>
      <p className="text-fg">{e.summary}</p>
      <H>Kind</H>
      <p className="text-muted">{KIND_HELP[e.kind]}</p>
    </div>
  );
}

const KIND_HELP: Record<MapEdge["kind"], string> = {
  reads: "The source reads from the target without changing it.",
  writes: "The source creates or updates records in the target.",
  dispatches: "The source launches the target (a sub-workflow or a set of agents) and waits for it.",
  gates: "The source can hold or block the target — a run cannot close green past it.",
  produces: "The source's output is what the target is made of.",
  consumes: "The source takes the target's output as input.",
  "depends-on": "The source relies on the target's rules or code; it does not call it at runtime.",
};

function PlannedPanel({ map, linear, id, onSelect }: Props & { id: string }) {
  const it = map.buildPath.items.find((x) => x.issue === id);
  if (!it) return <p className="text-muted">Unknown item.</p>;
  const state = linear.get(it.issue) ?? null;
  const phase = map.buildPath.phases.find((p) => p.id === it.phase);
  const anchor = phase?.anchor ? map.buildPath.anchors.find((a) => a.id === phase.anchor) : null;
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">planned · {it.phase === "now" ? "in flight now" : phase?.label ?? it.phase}</div>
      <h2 className="mt-1 pr-14 text-base font-semibold leading-snug text-fg">
        <a href={it.url} target="_blank" rel="noreferrer" className="font-mono text-accent hover:underline">
          {it.issue}
        </a>
        <span className="ml-2">{state?.title ?? ""}</span>
      </h2>
      <div className="mt-2 flex flex-wrap gap-1">
        {state ? (
          <>
            <Pill>{state.state}</Pill>
            <Pill>{state.priorityLabel}</Pill>
          </>
        ) : (
          <Pill tone="text-muted">Linear state unknown (not reachable at build)</Pill>
        )}
        {phase && <Pill tone="text-muted">{phase.window}</Pill>}
        {anchor && (
          <Pill tone="text-muted">
            {anchor.id} · {anchor.date}
          </Pill>
        )}
      </div>
      <H>Why</H>
      <p className="text-fg">{it.why}</p>
      {anchor && (
        <>
          <H>Proves</H>
          <p className="text-muted">{anchor.proof}</p>
        </>
      )}
      <H>Extends</H>
      <ul>
        {it.extends.map((x) => (
          <li key={x}>
            <button onClick={() => onSelect({ type: "node", id: x })} className="text-fg hover:text-accent">
              {componentById(map, x)?.name ?? x}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilePanel({ files, map, id, onSelect }: Props & { id: string }) {
  const f = files?.nodes.find((n) => n.id === id);
  if (!f) return <p className="text-muted">Unknown file.</p>;
  const inbound = files!.edges.filter((e) => e.dst === id);
  const outbound = files!.edges.filter((e) => e.src === id);
  const owner = f.component ? componentById(map, f.component) : null;
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
        file · {f.subtype}
        {owner && (
          <>
            {" · "}
            <button onClick={() => onSelect({ type: "node", id: owner.id })} className="hover:text-accent">
              {owner.name}
            </button>
          </>
        )}
      </div>
      <h2 className="mt-1 break-all pr-14 font-mono text-[13px] font-semibold leading-snug text-fg">
        <a href={f.url} target="_blank" rel="noreferrer" className="hover:text-accent">
          {f.id}
        </a>
      </h2>
      <H>What it says it is</H>
      <p className="text-fg">{f.description || <span className="text-muted">No header description.</span>}</p>
      <H>Dates</H>
      <p className="font-mono text-[11px] text-muted">
        first {f.firstShipped ?? "—"} · last {f.lastChanged ?? "—"}
      </p>
      <H>References ({outbound.length} out · {inbound.length} in)</H>
      <ul className="max-h-56 overflow-y-auto font-mono text-[11px] text-muted">
        {outbound.slice(0, 20).map((e) => (
          <li key={"o" + e.dst + e.line} className="truncate">
            <button onClick={() => onSelect({ type: "file", id: e.dst })} className="hover:text-accent">
              → {e.dst}
            </button>
          </li>
        ))}
        {inbound.slice(0, 20).map((e) => (
          <li key={"i" + e.src + e.line} className="truncate">
            <button onClick={() => onSelect({ type: "file", id: e.src })} className="hover:text-accent">
              ← {e.src}
              {e.line ? `:${e.line}` : ""}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
