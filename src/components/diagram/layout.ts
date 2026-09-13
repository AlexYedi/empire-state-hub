import type {
  DNode,
  EdgeStyling,
  FanoutSpec,
  FlowSpec,
  GateSpec,
  GraphSpec,
  LayersSpec,
  LeafSpec,
  LoopSpec,
  NodeKind,
  Scene,
  SceneEdge,
  SceneGroup,
  SceneNode,
  ScenePanel,
} from "./types";

// Widths are estimated from character counts rather than measured in the DOM, so layout is
// deterministic: the server and the client compute identical geometry and nothing drifts on hydrate.
export const FONT = 12;
export const LINE = 15;
export const SUB_FONT = 10;
export const SUB_LINE = 13;
export const LABEL_FONT = 10.5;
const CHAR = 6.9; // Geist sans at 12px, erring wide
const SUB_CHAR = 6.1; // Geist mono at 10px
const LABEL_CHAR = 6.4; // Geist mono at 10.5px
const PAD_X = 12;
const PAD_Y = 9;
const MARGIN = 14;
const GAP = 46;
const STACK = 12;
const WRAP = 22;

export function wrapLabel(label: string, max = WRAP): string[] {
  const out: string[] = [];
  for (const para of label.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      if (!line) line = word;
      else if (`${line} ${word}`.length <= max) line = `${line} ${word}`;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

const labelWidth = (label?: string) => (label ? label.length * LABEL_CHAR : 0);
const r1 = (v: number) => Math.round(v * 10) / 10;
const key = (from: string, to: string) => `${from}>${to}`;

type Sized = { node: DNode; lines: string[]; w: number; h: number; kind: NodeKind };

function size(node: DNode): Sized {
  const kind = node.kind ?? "box";
  const lines = wrapLabel(node.label, kind === "note" ? 30 : WRAP);
  const textW = Math.max(...lines.map((l) => l.length * CHAR), node.sub ? node.sub.length * SUB_CHAR : 0);
  let w = textW + PAD_X * 2;
  let h = PAD_Y * 2 + lines.length * LINE + (node.sub ? SUB_LINE : 0);
  if (kind === "pill") w += 10;
  if (kind === "store") h += 6;
  if (kind === "diamond") {
    w = textW * 1.5 + 30;
    h = h * 1.65 + 8;
  }
  return {
    node,
    lines,
    kind,
    w: Math.round(Math.max(w, kind === "diamond" ? 96 : 60)),
    h: Math.round(Math.max(h, 34)),
  };
}

function toScene(s: Sized, x: number, y: number): SceneNode {
  return {
    id: s.node.id,
    x: Math.round(x),
    y: Math.round(y),
    w: s.w,
    h: s.h,
    lines: s.lines,
    sub: s.node.sub,
    kind: s.kind,
    accent: !!s.node.accent,
    muted: !!s.node.muted || s.kind === "ghost",
  };
}

const cx = (n: SceneNode) => n.x + n.w / 2;
const cy = (n: SceneNode) => n.y + n.h / 2;

/** Where the ray from n's centre toward (tx, ty) leaves n's outline, pushed out by `gap`. */
function exitPoint(n: SceneNode, tx: number, ty: number, gap: number): [number, number] {
  const dx = tx - cx(n);
  const dy = ty - cy(n);
  if (dx === 0 && dy === 0) return [cx(n), cy(n)];
  const hw = n.w / 2 + gap;
  const hh = n.h / 2 + gap;
  const t =
    n.kind === "diamond"
      ? 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh)
      : Math.min(dx === 0 ? Infinity : Math.abs(hw / dx), dy === 0 ? Infinity : Math.abs(hh / dy));
  return [cx(n) + dx * t, cy(n) + dy * t];
}

type EdgeOpts = { label?: string; dashed?: boolean; accent?: boolean };

/** Right-middle of a to left-middle of b; S-curved when they sit on different rows. */
function horizontal(a: SceneNode, b: SceneNode, o: EdgeOpts): SceneEdge {
  const x1 = a.x + a.w + 2;
  const y1 = cy(a);
  const x2 = b.x - 3;
  const y2 = cy(b);
  const xm = (x1 + x2) / 2;
  const d =
    Math.abs(y1 - y2) < 1
      ? `M${r1(x1)} ${r1(y1)} H${r1(x2)}`
      : `M${r1(x1)} ${r1(y1)} C${r1(xm)} ${r1(y1)} ${r1(xm)} ${r1(y2)} ${r1(x2)} ${r1(y2)}`;
  return { d, accent: !!o.accent, dashed: !!o.dashed, label: o.label, lx: r1(xm), ly: r1((y1 + y2) / 2 - 7), anchor: "middle" };
}

/** Bottom-middle of a to top-middle of b; the label hangs to the right of the arrow. */
function vertical(a: SceneNode, b: SceneNode, o: EdgeOpts): SceneEdge {
  const x1 = cx(a);
  const y1 = a.y + a.h + 2;
  const x2 = cx(b);
  const y2 = b.y - 3;
  const ym = (y1 + y2) / 2;
  const d =
    Math.abs(x1 - x2) < 1
      ? `M${r1(x1)} ${r1(y1)} V${r1(y2)}`
      : `M${r1(x1)} ${r1(y1)} C${r1(x1)} ${r1(ym)} ${r1(x2)} ${r1(ym)} ${r1(x2)} ${r1(y2)}`;
  return { d, accent: !!o.accent, dashed: !!o.dashed, label: o.label, lx: r1((x1 + x2) / 2 + 8), ly: r1(ym + 3.5), anchor: "start" };
}

/** Centre-to-centre edge clipped to both outlines, optionally bowed sideways by `bow` px. */
function direct(a: SceneNode, b: SceneNode, o: EdgeOpts, bow = 0): SceneEdge {
  const ax = cx(a);
  const ay = cy(a);
  const bx = cx(b);
  const by = cy(b);
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const qx = (ax + bx) / 2 + (-(by - ay) / len) * bow;
  const qy = (ay + by) / 2 + ((bx - ax) / len) * bow;
  const [x1, y1] = exitPoint(a, bow ? qx : bx, bow ? qy : by, 2);
  const [x2, y2] = exitPoint(b, bow ? qx : ax, bow ? qy : ay, 3);
  const d = bow
    ? `M${r1(x1)} ${r1(y1)} Q${r1(qx)} ${r1(qy)} ${r1(x2)} ${r1(y2)}`
    : `M${r1(x1)} ${r1(y1)} L${r1(x2)} ${r1(y2)}`;
  const lx = bow ? 0.25 * x1 + 0.5 * qx + 0.25 * x2 : (x1 + x2) / 2;
  const ly = bow ? 0.25 * y1 + 0.5 * qy + 0.25 * y2 : (y1 + y2) / 2;
  return { d, accent: !!o.accent, dashed: !!o.dashed, label: o.label, lx: r1(lx), ly: r1(ly + 3.5), anchor: "middle" };
}

function styling(spec: EdgeStyling) {
  const dashed = new Set(spec.dashed ?? []);
  const accent = new Set(spec.accentEdges ?? []);
  return (a: DNode, b: DNode): EdgeOpts => {
    const k = key(a.id, b.id);
    return {
      label: spec.edgeLabels?.[k],
      dashed: dashed.has(k) || b.kind === "ghost",
      accent: accent.has(k) || (!!a.accent && !!b.accent),
    };
  };
}

function boundsOf(ns: SceneNode[], label: string): SceneGroup {
  const pad = 8;
  const x0 = Math.min(...ns.map((n) => n.x)) - pad;
  const y0 = Math.min(...ns.map((n) => n.y)) - pad;
  const x1 = Math.max(...ns.map((n) => n.x + n.w)) + pad;
  const y1 = Math.max(...ns.map((n) => n.y + n.h)) + pad;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, label };
}

function layoutFlow(spec: FlowSpec): Scene {
  const opts = styling(spec);
  const cols = spec.steps.map((s) => (Array.isArray(s) ? s : [s]).map(size));
  const pairs = (i: number): [Sized, Sized][] => {
    const a = cols[i];
    const b = cols[i + 1];
    if (a.length === b.length && a.length > 1) return a.map((x, j) => [x, b[j]]);
    return a.flatMap((x) => b.map((y): [Sized, Sized] => [x, y]));
  };
  const groupTop = spec.groups?.length ? 22 : 0;
  const nodes: SceneNode[] = [];
  const byId = new Map<string, SceneNode>();
  const colOf = new Map<string, number>();
  const place = (s: Sized, x: number, y: number, col: number) => {
    const n = toScene(s, x, y);
    if (byId.has(n.id)) throw new Error(`diagram: duplicate node id "${n.id}"`);
    nodes.push(n);
    byId.set(n.id, n);
    colOf.set(n.id, col);
  };
  const edgeOf = (a: Sized, b: Sized, f: typeof horizontal) =>
    f(byId.get(a.node.id)!, byId.get(b.node.id)!, opts(a.node, b.node));

  let w: number;
  let h: number;
  let edges: SceneEdge[];

  if (spec.vertical) {
    const rowW = cols.map((c) => c.reduce((t, s) => t + s.w, 0) + STACK * (c.length - 1));
    const rowH = cols.map((c) => Math.max(...c.map((s) => s.h)));
    const inner = Math.max(...rowW);
    const labelRoom = Math.max(
      0,
      ...cols.slice(0, -1).flatMap((_, i) => pairs(i).map(([a, b]) => labelWidth(opts(a.node, b.node).label))),
    );
    let y = MARGIN + groupTop;
    cols.forEach((c, i) => {
      let x = MARGIN + (inner - rowW[i]) / 2;
      for (const s of c) {
        place(s, x, y + (rowH[i] - s.h) / 2, i);
        x += s.w + STACK;
      }
      y += rowH[i] + (i < cols.length - 1 ? 38 : 0);
    });
    edges = cols.slice(0, -1).flatMap((_, i) => pairs(i).map(([a, b]) => edgeOf(a, b, vertical)));
    w = Math.max(MARGIN * 2 + inner, MARGIN + inner / 2 + 10 + labelRoom + MARGIN);
    h = y + MARGIN;
  } else {
    const gaps = cols
      .slice(0, -1)
      .map((_, i) => Math.max(GAP, ...pairs(i).map(([a, b]) => labelWidth(opts(a.node, b.node).label) + 24)));
    const colW = cols.map((c) => Math.max(...c.map((s) => s.w)));
    const colH = cols.map((c) => c.reduce((t, s) => t + s.h, 0) + STACK * (c.length - 1));
    const inner = Math.max(...colH);
    const top = MARGIN + groupTop;
    let x = MARGIN;
    cols.forEach((c, i) => {
      let y = top + (inner - colH[i]) / 2;
      for (const s of c) {
        place(s, x + (colW[i] - s.w) / 2, y, i);
        y += s.h + STACK;
      }
      x += colW[i] + (gaps[i] ?? 0);
    });
    edges = cols.slice(0, -1).flatMap((_, i) => pairs(i).map(([a, b]) => edgeOf(a, b, horizontal)));
    w = x + MARGIN;
    h = top + inner + MARGIN;
  }

  const groups = (spec.groups ?? []).map((g) =>
    boundsOf(
      nodes.filter((n) => {
        const c = colOf.get(n.id)!;
        return c >= g.from && c <= g.to;
      }),
      g.label,
    ),
  );
  return { w: Math.round(w), h: Math.round(h), nodes, edges, groups, panels: [] };
}

function layoutFanout(spec: FanoutSpec): Scene {
  return layoutFlow({
    type: "flow",
    steps: [spec.source, spec.branches, spec.sink, ...(spec.tail ?? [])],
    groups: spec.branchLabel ? [{ label: spec.branchLabel, from: 1, to: 1 }] : undefined,
    edgeLabels: spec.edgeLabels,
    dashed: spec.dashed,
    accentEdges: spec.accentEdges,
  });
}

function layoutLayers(spec: LayersSpec): Scene {
  const PAD = 14;
  const HEAD = 28;
  const FOOT = 14;
  const VGAP = 38;
  const bands = spec.layers.map((layer) => {
    const items = layer.items.map(size);
    return {
      layer,
      items,
      contentW: items.reduce((t, s) => t + s.w, 0) + STACK * Math.max(0, items.length - 1),
      itemH: Math.max(0, ...items.map((s) => s.h)),
    };
  });
  const labelRoom = Math.max(0, ...(spec.between ?? []).map(labelWidth));
  const bandW = Math.max(...bands.map((b) => Math.max(b.contentW, b.layer.label.length * 6.8)), labelRoom * 2 + 24) + PAD * 2;
  const nodes: SceneNode[] = [];
  const panels: ScenePanel[] = [];
  const edges: SceneEdge[] = [];
  const spans: { top: number; bottom: number }[] = [];
  let y = MARGIN;
  for (const b of bands) {
    const h = HEAD + b.itemH + FOOT;
    panels.push({ x: MARGIN, y, w: bandW, h, label: b.layer.label, accent: !!b.layer.accent, muted: !!b.layer.muted });
    let x = MARGIN + (bandW - b.contentW) / 2;
    for (const s of b.items) {
      nodes.push(toScene(s, x, y + HEAD + (b.itemH - s.h) / 2));
      x += s.w + STACK;
    }
    spans.push({ top: y, bottom: y + h });
    y += h + VGAP;
  }
  const mid = MARGIN + bandW / 2;
  for (let i = 0; i < spans.length - 1; i++) {
    const [y1, y2] =
      spec.direction === "up" ? [spans[i + 1].top - 2, spans[i].bottom + 3] : [spans[i].bottom + 2, spans[i + 1].top - 3];
    edges.push({
      d: `M${r1(mid)} ${r1(y1)} V${r1(y2)}`,
      accent: false,
      dashed: false,
      label: spec.between?.[i],
      lx: r1(mid + 9),
      ly: r1((spans[i].bottom + spans[i + 1].top) / 2 + 3.5),
      anchor: "start",
    });
  }
  return { w: Math.round(bandW + MARGIN * 2), h: Math.round(y - VGAP + MARGIN), nodes, edges, groups: [], panels };
}

function layoutLoop(spec: LoopSpec): Scene {
  const items = spec.steps.map(size);
  const n = items.length;
  if (n < 3) throw new Error("diagram: a loop needs at least three steps");
  const maxW = Math.max(...items.map((s) => s.w));
  const maxH = Math.max(...items.map((s) => s.h));
  const r = (maxW + 36) / (2 * Math.sin(Math.PI / n));
  const rx = Math.max(r * 1.35, maxW * 0.9 + 70);
  const ry = Math.max(r * 0.8, maxH + 44);
  const ox = MARGIN + maxW / 2 + rx;
  const oy = MARGIN + maxH / 2 + ry;
  const nodes = items.map((s, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return toScene(s, ox + rx * Math.cos(angle) - s.w / 2, oy + ry * Math.sin(angle) - s.h / 2);
  });
  const edges = nodes.map((a, i) => {
    const b = nodes[(i + 1) % n];
    // bow each edge away from the centre so the cycle reads as a ring
    const perp = -(cy(b) - cy(a)) * ((cx(a) + cx(b)) / 2 - ox) + (cx(b) - cx(a)) * ((cy(a) + cy(b)) / 2 - oy);
    const accent = !!(spec.steps[i].accent && spec.steps[(i + 1) % n].accent);
    return direct(a, b, { label: spec.edgeLabels?.[i], accent }, perp >= 0 ? 22 : -22);
  });
  if (spec.center) {
    const c = size({ id: "__center", label: spec.center, kind: "note" });
    nodes.push(toScene(c, ox - c.w / 2, oy - c.h / 2));
  }
  return {
    w: Math.round(ox + rx + maxW / 2 + MARGIN),
    h: Math.round(oy + ry + maxH / 2 + MARGIN),
    nodes,
    edges,
    groups: [],
    panels: [],
  };
}

function layoutGate(spec: GateSpec): Scene {
  const opts = styling(spec);
  const gate = size({ ...spec.gate, kind: "diamond" });
  const row = [...spec.pre.map(size), gate, ...spec.yes.steps.map(size)];
  const no = spec.no.steps.map(size);
  const rowH = Math.max(...row.map((s) => s.h));
  const midY = MARGIN + rowH / 2;
  const labelAfter = (i: number) =>
    row[i] === gate ? spec.yes.label : row[i + 1] ? opts(row[i].node, row[i + 1].node).label : undefined;

  const top: SceneNode[] = [];
  let x = MARGIN;
  row.forEach((s, i) => {
    top.push(toScene(s, x, midY - s.h / 2));
    if (row[i + 1]) x += s.w + Math.max(GAP, labelWidth(labelAfter(i)) + 24);
  });
  const edges: SceneEdge[] = [];
  for (let i = 0; i < top.length - 1; i++) {
    const o = opts(row[i].node, row[i + 1].node);
    edges.push(horizontal(top[i], top[i + 1], row[i] === gate ? { ...o, label: spec.yes.label } : o));
  }

  const g = top[spec.pre.length];
  const noTop = MARGIN + rowH + 46;
  const noH = Math.max(0, ...no.map((s) => s.h));
  const bottom: SceneNode[] = [];
  let nx = Math.max(MARGIN, cx(g) - (no[0]?.w ?? 0) / 2);
  no.forEach((s, i) => {
    bottom.push(toScene(s, nx, noTop + (noH - s.h) / 2));
    if (no[i + 1]) nx += s.w + Math.max(GAP, labelWidth(opts(s.node, no[i + 1].node).label) + 24);
  });
  if (bottom[0]) edges.push(vertical(g, bottom[0], { ...opts(spec.gate, no[0].node), label: spec.no.label }));
  for (let i = 0; i < bottom.length - 1; i++) edges.push(horizontal(bottom[i], bottom[i + 1], opts(no[i].node, no[i + 1].node)));

  const all = [...top, ...bottom];
  return {
    w: Math.round(Math.max(...all.map((n) => n.x + n.w)) + MARGIN),
    h: Math.round((bottom.length ? noTop + noH : MARGIN + rowH) + MARGIN),
    nodes: all,
    edges,
    groups: [],
    panels: [],
  };
}

function layoutGraph(spec: GraphSpec): Scene {
  const W = spec.width ?? 680;
  const H = Math.round(W * (spec.aspect ?? 0.5));
  const sized = spec.nodes.map((n) => ({ s: size(n), x: n.x, y: n.y }));
  const mw = Math.max(...sized.map((z) => z.s.w));
  const mh = Math.max(...sized.map((z) => z.s.h));
  const nodes = sized.map(({ s, x, y }) =>
    toScene(
      s,
      MARGIN + mw / 2 + (x / 100) * (W - 2 * MARGIN - mw) - s.w / 2,
      MARGIN + mh / 2 + (y / 100) * (H - 2 * MARGIN - mh) - s.h / 2,
    ),
  );
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const present = new Set(spec.edges.map((e) => key(e.from, e.to)));
  const edges = spec.edges.map((e) => {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) throw new Error(`diagram: edge ${key(e.from, e.to)} names an unknown node`);
    const twoWay = present.has(key(e.to, e.from));
    return direct(a, b, { label: e.label, dashed: e.dashed || b.kind === "ghost", accent: e.accent }, twoWay ? 16 : 0);
  });
  return { w: W, h: H, nodes, edges, groups: [], panels: [] };
}

export function layout(spec: LeafSpec): Scene {
  switch (spec.type) {
    case "flow":
      return layoutFlow(spec);
    case "fanout":
      return layoutFanout(spec);
    case "layers":
      return layoutLayers(spec);
    case "loop":
      return layoutLoop(spec);
    case "gate":
      return layoutGate(spec);
    case "graph":
      return layoutGraph(spec);
  }
}
