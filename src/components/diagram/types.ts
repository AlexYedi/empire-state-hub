// Declarative diagram specs. Every figure on the public surface is authored as data
// (src/data/diagrams.ts) and drawn by one engine, so the visual language stays uniform and the
// lens tokens (--fg / --muted / --surface / --accent) re-theme every figure at once.

export type NodeKind =
  | "box" // a step or component
  | "pill" // an actor or role
  | "store" // durable data: a table, a log, a file
  | "diamond" // a decision
  | "ghost" // not built yet, disabled, or ruled out
  | "note"; // borderless annotation

export type DNode = {
  id: string;
  label: string; // "\n" forces a break; long labels wrap
  kind?: NodeKind;
  accent?: boolean; // the beat the figure is about
  muted?: boolean;
  sub?: string; // small mono second line: counts, qualifiers
};

export type DEdge = {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  accent?: boolean;
};

/** Edge styling keyed "fromId>toId". */
export type EdgeStyling = {
  edgeLabels?: Record<string, string>;
  dashed?: string[];
  accentEdges?: string[];
};

/** Steps in order; an inner array is a parallel band. Equal-length adjacent bands run as lanes. */
export type FlowSpec = EdgeStyling & {
  type: "flow";
  steps: (DNode | DNode[])[];
  groups?: { label: string; from: number; to: number }[]; // inclusive step indexes
  vertical?: boolean;
};

/** One source fans out to parallel branches that converge on a sink, then an optional tail. */
export type FanoutSpec = EdgeStyling & {
  type: "fanout";
  source: DNode;
  branches: DNode[];
  sink: DNode;
  tail?: DNode[];
  branchLabel?: string;
};

/** Stacked bands with arrows between them. */
export type LayersSpec = {
  type: "layers";
  layers: { label: string; items: DNode[]; accent?: boolean; muted?: boolean }[];
  between?: string[]; // label on the arrow from band i to band i+1
  direction?: "down" | "up";
};

/** A closed cycle, clockwise from the top. */
export type LoopSpec = {
  type: "loop";
  steps: DNode[];
  edgeLabels?: string[]; // [i] labels step i → step i+1
  center?: string;
};

/** A flow that reaches a decision and splits: yes continues right, no drops below. */
export type GateSpec = EdgeStyling & {
  type: "gate";
  pre: DNode[];
  gate: DNode;
  yes: { label: string; steps: DNode[] };
  no: { label: string; steps: DNode[] };
};

/** Hand-placed nodes (x, y in 0–100) with explicit edges. */
export type GraphSpec = {
  type: "graph";
  nodes: (DNode & { x: number; y: number })[];
  edges: DEdge[];
  aspect?: number; // height / width, default 0.5
  width?: number; // drawing width, default 680 — use ~340 inside a compare panel
};

export type LeafSpec = FlowSpec | FanoutSpec | LayersSpec | LoopSpec | GateSpec | GraphSpec;

/** Two panels side by side — draw the difference, not two option boxes. */
export type CompareSpec = {
  type: "compare";
  left: { title: string; spec: LeafSpec };
  right: { title: string; spec: LeafSpec };
};

export type DiagramSpec = (LeafSpec | CompareSpec) & {
  caption: string; // the one claim the figure makes
  alt?: string; // accessible name; defaults to the caption
};

// --- The resolved scene every archetype lays out into. The renderer only knows this. ---

export type SceneNode = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  sub?: string;
  kind: NodeKind;
  accent: boolean;
  muted: boolean;
};

export type SceneEdge = {
  d: string;
  accent: boolean;
  dashed: boolean;
  label?: string;
  lx?: number;
  ly?: number;
  anchor?: "start" | "middle" | "end";
};

export type SceneGroup = { x: number; y: number; w: number; h: number; label: string };

export type ScenePanel = SceneGroup & { accent: boolean; muted: boolean };

export type Scene = {
  w: number;
  h: number;
  nodes: SceneNode[];
  edges: SceneEdge[];
  groups: SceneGroup[];
  panels: ScenePanel[];
};
