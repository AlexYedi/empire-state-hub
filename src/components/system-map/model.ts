// Pure data helpers for the map: the shapes React Flow renders, derived from the generated JSON.
// No layout here (that is layout.ts) and no React.
import type { BuildItem, FilesGraph, LinearState, MapComponent, MapEdge, Status, SystemMap } from "@/lib/system-map/schema";

export type ComponentNodeData = { kind: "component"; c: MapComponent; dim?: boolean };
export type PlannedNodeData = { kind: "planned"; item: BuildItem; linear: LinearState | null };
export type FileNodeData = { kind: "file"; f: FilesGraph["nodes"][number] };
export type NeighborNodeData = { kind: "neighbor"; c: MapComponent; refs: number };
export type ZoneNodeData = { kind: "zone"; id: string; name: string; count: number };
export type AnyNodeData = ComponentNodeData | PlannedNodeData | FileNodeData | NeighborNodeData | ZoneNodeData;

export type MapEdgeData = { kind: MapEdge["kind"] | "extends" | "references"; summary: string; status: Status; line?: number | null };

/** What is selected: a component, an edge, a planned item, or a file (in focus mode). */
export type Selection =
  | { type: "node"; id: string }
  | { type: "edge"; id: string }
  | { type: "planned"; id: string }
  | { type: "file"; id: string }
  | null;

export const STATUS_LABEL: Record<Status, string> = {
  live: "live",
  stale: "stale",
  scaffolded: "scaffolded",
  parked: "parked",
  planned: "planned",
};

export const KIND_GLYPH: Record<MapComponent["kind"], string> = {
  command: "/cmd",
  skill: "skill",
  agent: "agent",
  hook: "hook",
  script: "script",
  reference: "ref",
  policy: "policy",
  external: "ext",
  surface: "site",
};

export const EDGE_VERB: Record<MapEdgeData["kind"], string> = {
  reads: "reads",
  writes: "writes to",
  dispatches: "dispatches",
  gates: "gates",
  produces: "produces",
  consumes: "consumes",
  "depends-on": "depends on",
  extends: "extends",
  references: "references",
};

export function componentById(map: SystemMap, id: string) {
  return map.components.find((c) => c.id === id) ?? null;
}

/** Edges touching a component, with the "other" side resolved, for the panel's Interactions list. */
export function interactionsOf(map: SystemMap, id: string) {
  return map.edges
    .filter((e) => e.source === id || e.target === id)
    .map((e) => ({ edge: e, outgoing: e.source === id, other: componentById(map, e.source === id ? e.target : e.source)! }));
}

export function plannedFor(map: SystemMap, id: string) {
  return map.buildPath.items.filter((it) => it.extends.includes(id));
}

/**
 * Layer 2 for one component: its files, the references among them, and the other components those
 * files reach (aggregated, so a 40-file component doesn't fan out into 300 foreign files).
 */
export function fileSubgraph(files: FilesGraph, map: SystemMap, componentId: string) {
  const own = files.nodes.filter((n) => n.component === componentId);
  const ownIds = new Set(own.map((n) => n.id));
  const byId = new Map(files.nodes.map((n) => [n.id, n]));
  const internal: { src: string; dst: string; line: number | null }[] = [];
  const neighborRefs = new Map<string, number>(); // component id → reference count
  for (const e of files.edges) {
    const s = ownIds.has(e.src);
    const d = ownIds.has(e.dst);
    if (s && d) internal.push(e);
    else if (s || d) {
      const foreign = byId.get(s ? e.dst : e.src);
      const owner = foreign?.component ?? "unmapped";
      if (owner === componentId) continue;
      neighborRefs.set(owner, (neighborRefs.get(owner) ?? 0) + 1);
    }
  }
  const neighbors = [...neighborRefs.entries()]
    .map(([id, refs]) => ({ c: componentById(map, id), id, refs }))
    .sort((a, b) => b.refs - a.refs);
  return { own, internal, neighbors };
}

/** Files nobody has claimed — rendered as a visible bucket, never dropped (PRD §7). */
export function unmappedFiles(files: FilesGraph) {
  return files.nodes.filter((n) => !n.component);
}
