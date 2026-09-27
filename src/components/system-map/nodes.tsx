"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { Status } from "@/lib/system-map/schema";
import { KIND_GLYPH, type AnyNodeData, type ComponentNodeData, type FileNodeData, type NeighborNodeData, type PlannedNodeData, type ZoneNodeData } from "./model";

export type MapNode = Node<AnyNodeData>;

// Status is the one thing colour is allowed to mean on this map. Everything else is ink.
export const STATUS_DOT: Record<Status, string> = {
  live: "bg-emerald-500",
  stale: "bg-amber-500",
  scaffolded: "bg-zinc-400",
  parked: "bg-zinc-500",
  planned: "bg-accent",
};

const ports = (
  <>
    <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-transparent" />
    <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-transparent" />
  </>
);

export function ComponentNode({ data, selected }: NodeProps<Node<ComponentNodeData>>) {
  const { c, dim } = data;
  const dashed = c.status === "scaffolded" || c.status === "parked";
  return (
    <div
      className={[
        "h-full w-full rounded-md border bg-surface px-3 py-2 text-left shadow-sm transition-[opacity,box-shadow]",
        selected ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-fg/40",
        dashed ? "border-dashed" : "",
        dim ? "opacity-35" : "",
      ].join(" ")}
      title={c.name}
    >
      {ports}
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[c.status]}`} aria-label={`status ${c.status}`} />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{KIND_GLYPH[c.kind]}</span>
        {c.status !== "live" && <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-amber-500">{c.status}</span>}
        {c.overlayStale && c.status === "live" && (
          <span className="ml-auto font-mono text-[10px] text-muted" title="Files changed after the curated notes were last reviewed">
            notes lag
          </span>
        )}
      </div>
      <div className="mt-1 truncate text-[13px] font-medium leading-tight text-fg">{c.name}</div>
    </div>
  );
}

export function PlannedNode({ data, selected }: NodeProps<Node<PlannedNodeData>>) {
  const { item, linear } = data;
  return (
    <div
      className={[
        "h-full w-full rounded-md border border-dashed bg-bg px-3 py-1.5 text-left",
        selected ? "border-accent ring-2 ring-accent/30" : "border-accent/60 hover:border-accent",
      ].join(" ")}
      title={linear?.title ?? item.why}
    >
      {ports}
      <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap font-mono text-[10px] uppercase tracking-widest">
        <span className="text-accent">{item.issue}</span>
        <span className="text-muted">{item.phase === "now" ? "now" : item.phase}</span>
        {linear && <span className="ml-auto truncate text-muted">{linear.state}</span>}
      </div>
      <div className="mt-0.5 truncate text-[12px] leading-tight text-fg">{linear?.title ?? item.why}</div>
    </div>
  );
}

export function FileNode({ data, selected }: NodeProps<Node<FileNodeData>>) {
  const { f } = data;
  const short = f.id.replace(/^\.claude\//, "");
  return (
    <div
      className={[
        "h-full w-full rounded border bg-surface px-2.5 py-1.5 text-left",
        selected ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-fg/40",
      ].join(" ")}
      title={f.id}
    >
      {ports}
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted">{f.subtype}</span>
        <span className="truncate font-mono text-[11px] text-fg">{short}</span>
      </div>
    </div>
  );
}

export function NeighborNode({ data, selected }: NodeProps<Node<NeighborNodeData>>) {
  const { c, refs } = data;
  return (
    <div
      className={[
        "h-full w-full rounded-md border border-dotted bg-bg px-3 py-2 text-left",
        selected ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-fg/40",
      ].join(" ")}
      title={`${refs} reference${refs === 1 ? "" : "s"} — click to open`}
    >
      {ports}
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[c.status]}`} />
        <span>{KIND_GLYPH[c.kind]}</span>
        <span className="ml-auto tabular-nums">{refs} refs</span>
      </div>
      <div className="mt-0.5 truncate text-[12px] font-medium text-fg">{c.name}</div>
    </div>
  );
}

export function ZoneNode({ data }: NodeProps<Node<ZoneNodeData>>) {
  return (
    <div className="h-full w-full rounded-lg border border-border/80 bg-surface/40">
      <div className="flex items-baseline gap-2 px-4 pt-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-fg">{data.name}</span>
        <span className="font-mono text-[10px] text-muted tabular-nums">{data.count}</span>
      </div>
    </div>
  );
}

export const NODE_TYPES = {
  component: ComponentNode,
  planned: PlannedNode,
  file: FileNode,
  neighbor: NeighborNode,
  zone: ZoneNode,
} as const;
