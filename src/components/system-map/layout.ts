// Deterministic layered layout with elk. Zones are compound nodes so the reader sees swim-lanes,
// and elk decides lane order from the edges (intake feeds pipelines feed the graph and the records).
// No force simulation: the map must look the same on every load (PRD §5 rabbit hole #1).
import type { Edge, Node } from "@xyflow/react";
import type { ElkExtendedEdge, ElkNode } from "elkjs/lib/elk-api";

export const SIZES = {
  component: { w: 208, h: 66 },
  planned: { w: 188, h: 52 },
  file: { w: 250, h: 42 },
  neighbor: { w: 208, h: 56 },
} as const;

type ElkLike = { layout: (g: ElkNode) => Promise<ElkNode> };
let elk: ElkLike | null = null;
async function getElk(): Promise<ElkLike> {
  if (!elk) {
    const mod = await import("elkjs/lib/elk.bundled.js");
    const ELK = (mod.default ?? mod) as unknown as new () => ElkLike;
    elk = new ELK();
  }
  return elk;
}

export type LayoutInput = {
  /** Compound groups (zones). Children are laid out inside; a node's `parent` names its group. */
  groups: { id: string; label: string }[];
  nodes: { id: string; parent: string | null; w: number; h: number }[];
  edges: { id: string; source: string; target: string }[];
  direction?: "RIGHT" | "DOWN";
};

export type Positioned = {
  nodes: Record<string, { x: number; y: number; w: number; h: number }>;
  groups: Record<string, { x: number; y: number; w: number; h: number }>;
};

export async function layout(input: LayoutInput): Promise<Positioned> {
  const engine = await getElk();
  const dir = input.direction ?? "RIGHT";
  const common = {
    "elk.algorithm": "layered",
    "elk.direction": dir,
    "elk.layered.spacing.nodeNodeBetweenLayers": "56",
    "elk.spacing.nodeNode": "22",
    "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    "elk.edgeRouting": "SPLINES",
  };
  const childrenOf = (gid: string | null): ElkNode[] =>
    input.nodes
      .filter((n) => n.parent === gid)
      .map((n) => ({ id: n.id, width: n.w, height: n.h }));

  const graph: ElkNode = {
    id: "root",
    layoutOptions: { ...common, "elk.hierarchyHandling": "INCLUDE_CHILDREN", "elk.spacing.componentComponent": "48", "elk.padding": "[top=8,left=8,bottom=8,right=8]" },
    children: [
      ...input.groups.map((g) => ({
        id: g.id,
        layoutOptions: { ...common, "elk.padding": "[top=44,left=20,bottom=20,right=20]", "elk.spacing.nodeNode": "18" },
        children: childrenOf(g.id),
      })),
      ...childrenOf(null),
    ],
    edges: input.edges.map<ElkExtendedEdge>((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };

  const out = await engine.layout(graph);
  const nodes: Positioned["nodes"] = {};
  const groups: Positioned["groups"] = {};
  for (const top of out.children ?? []) {
    const isGroup = input.groups.some((g) => g.id === top.id);
    if (isGroup) {
      groups[top.id] = { x: top.x ?? 0, y: top.y ?? 0, w: top.width ?? 0, h: top.height ?? 0 };
      for (const ch of top.children ?? []) nodes[ch.id] = { x: ch.x ?? 0, y: ch.y ?? 0, w: ch.width ?? 0, h: ch.height ?? 0 };
    } else {
      nodes[top.id] = { x: top.x ?? 0, y: top.y ?? 0, w: top.width ?? 0, h: top.height ?? 0 };
    }
  }
  return { nodes, groups };
}

/** Apply elk positions to React Flow nodes (children are positioned relative to their parent). */
export function applyPositions<N extends Node>(rfNodes: N[], pos: Positioned): N[] {
  return rfNodes.map((n) => {
    const p = n.type === "zone" ? pos.groups[n.id] : pos.nodes[n.id];
    if (!p) return n;
    return { ...n, position: { x: p.x, y: p.y }, ...(n.type === "zone" ? { style: { ...n.style, width: p.w, height: p.h } } : {}) };
  });
}

export type RfEdge = Edge;

// ---------- overview: a fixed zone grid, packed columns inside each zone ----------
// The lanes read left→right in the order work flows (intake → pipelines → graph → records) with the
// operating layer and surfaces underneath. elk was tried here first and scattered the zones by edge
// count, which made the map illegible at fit-zoom; a fixed grid is the honest choice for six lanes.
export type GridInput = {
  zones: { id: string; row: 0 | 1 }[];
  /** Items in reading order; planned items should directly follow the component they extend. */
  items: { id: string; zone: string; w: number; h: number }[];
};

const ZONE_PAD = { top: 44, side: 18, bottom: 18 };
const GAP = { col: 18, row: 12, zone: 40 };

function columnsFor(n: number) {
  return n <= 4 ? 1 : n <= 9 ? 2 : n <= 15 ? 3 : 4;
}

export function gridLayout(input: GridInput): Positioned {
  const nodes: Positioned["nodes"] = {};
  const groups: Positioned["groups"] = {};
  const zoneSize = new Map<string, { w: number; h: number }>();

  // 1. pack each zone: fill columns top-to-bottom, balanced by count
  for (const z of input.zones) {
    const items = input.items.filter((i) => i.zone === z.id);
    const cols = columnsFor(items.length);
    const perCol = Math.ceil(items.length / cols) || 1;
    const colW = Math.max(...items.map((i) => i.w), 0);
    const colHeights = new Array(cols).fill(ZONE_PAD.top);
    items.forEach((it, idx) => {
      const c = Math.floor(idx / perCol);
      const x = ZONE_PAD.side + c * (colW + GAP.col) + (colW - it.w) / 2;
      const y = colHeights[c];
      nodes[it.id] = { x, y, w: it.w, h: it.h };
      colHeights[c] += it.h + GAP.row;
    });
    const w = ZONE_PAD.side * 2 + cols * colW + (cols - 1) * GAP.col;
    const h = Math.max(...colHeights) - GAP.row + ZONE_PAD.bottom;
    zoneSize.set(z.id, { w: Math.max(w, 220), h: Math.max(h, 90) });
  }

  // 2. place zones: row 0 flows left→right; row 1 sits beneath, spread to the same total width
  const rows: [string[], string[]] = [[], []];
  for (const z of input.zones) rows[z.row].push(z.id);
  let x = 0;
  let row0H = 0;
  for (const id of rows[0]) {
    const s = zoneSize.get(id)!;
    groups[id] = { x, y: 0, w: s.w, h: s.h };
    x += s.w + GAP.zone;
    row0H = Math.max(row0H, s.h);
  }
  const totalW = x - GAP.zone;
  const row1W = rows[1].reduce((a, id) => a + zoneSize.get(id)!.w, 0) + GAP.zone * (rows[1].length - 1);
  let x1 = Math.max(0, (totalW - row1W) / 2);
  for (const id of rows[1]) {
    const s = zoneSize.get(id)!;
    groups[id] = { x: x1, y: row0H + GAP.zone, w: s.w, h: s.h };
    x1 += s.w + GAP.zone;
  }
  // stretch every row-0 zone to the row height so the lanes read as one band
  for (const id of rows[0]) groups[id].h = row0H;
  return { nodes, groups };
}
