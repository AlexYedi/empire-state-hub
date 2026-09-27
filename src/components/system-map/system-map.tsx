"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Background, MarkerType, ReactFlow, ReactFlowProvider, useNodesInitialized, useReactFlow, type Edge, type Node } from "@xyflow/react";
import type { FilesGraph, LinearState, SystemMap } from "@/lib/system-map/schema";
import { FilesSchema } from "@/lib/system-map/schema";
import type { Lens } from "@/lib/lens";
import { SIZES, applyPositions, gridLayout, layout } from "./layout";
import { NODE_TYPES, type MapNode } from "./nodes";
import { Panel } from "./panel";
import { fileSubgraph, type MapEdgeData, type Selection } from "./model";

type Props = { map: SystemMap; linear: LinearState[] | null; lens: Lens };


/** Edge styling: kind → stroke. Colour is reserved for status; kinds differ by weight and dash. */
function edgeStyle(kind: MapEdgeData["kind"], status: string, active: boolean) {
  const base: React.CSSProperties = { strokeWidth: active ? 2.5 : 1.25, stroke: active ? "var(--accent)" : "var(--muted)", opacity: active ? 1 : 0.55 };
  if (kind === "depends-on" || kind === "references") base.strokeDasharray = "2 4";
  if (kind === "gates") base.strokeDasharray = "6 3";
  if (kind === "extends" || status === "planned") base.strokeDasharray = "4 4";
  if (status === "stale") base.stroke = active ? "var(--accent)" : "#d97706";
  return base;
}

export function SystemMapView(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

function Inner({ map, linear, lens }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  const linearById = useMemo(() => new Map((linear ?? []).map((l) => [l.identifier, l])), [linear]);
  const [selection, setSelectionState] = useState<Selection>(() => {
    const n = params.get("node");
    const e = params.get("edge");
    const p = params.get("planned");
    const f = params.get("file");
    return n ? { type: "node", id: n } : e ? { type: "edge", id: e } : p ? { type: "planned", id: p } : f ? { type: "file", id: f } : null;
  });
  const [focus, setFocus] = useState<string | null>(() => params.get("focus"));
  const [showPath, setShowPath] = useState<boolean>(() => params.get("path") !== "0");
  const [hiddenZones, setHiddenZones] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<FilesGraph | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [layoutKey, setLayoutKey] = useState<string>("");

  // Deep links (AC8): the URL mirrors selection + focus so a view can be shared.
  const setSelection = useCallback(
    (s: Selection) => {
      setSelectionState(s);
      const q = new URLSearchParams();
      if (s) q.set(s.type, s.id);
      if (focus) q.set("focus", focus);
      if (!showPath) q.set("path", "0");
      router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [focus, showPath, pathname, router],
  );
  useEffect(() => {
    const q = new URLSearchParams();
    if (selection) q.set(selection.type, selection.id);
    if (focus) q.set("focus", focus);
    if (!showPath) q.set("path", "0");
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
    // selection is handled by setSelection; this syncs focus/path toggles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, showPath]);

  // Layer 2 data loads only when first needed (AC9).
  useEffect(() => {
    if (!focus || files) return;
    import("@/data/system-map.files.json").then((m) => setFiles(FilesSchema.parse(m.default)));
  }, [focus, files]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selection) setSelection(null);
        else if (focus) setFocus(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, focus, setSelection]);

  // ---- build the React Flow graph for the current mode, then lay it out ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const built = focus ? buildFocus(map, files, focus) : buildOverview(map, linearById, showPath, hiddenZones);
      if (!built) return;
      const pos = "grid" in built ? gridLayout(built.grid) : await layout(built.elk);
      if (cancelled) return;
      setNodes(applyPositions(built.nodes, pos));
      setEdges(built.edges);
      setLayoutKey(JSON.stringify([focus, showPath, [...hiddenZones], files !== null]));
      // React Flow measures the new nodes in a ResizeObserver callback; fit after two frames so the
      // bounds are real. The nodesInitialized effect below covers the slow path.
      requestAnimationFrame(() => requestAnimationFrame(() => { if (!cancelled) fitView({ padding: 0.08 }); }));
    })();
    return () => {
      cancelled = true;
    };
  }, [map, linearById, showPath, hiddenZones, focus, files, fitView]);

  // Fit once React Flow has measured the new node set (a fit before that lands on stale bounds).
  useEffect(() => {
    if (nodesInitialized) fitView({ padding: 0.08 });
  }, [nodesInitialized, layoutKey, fitView]);

  // Selection highlighting is applied on top of the laid-out graph so it never triggers a re-layout.
  const shownNodes = useMemo(() => {
    const selId = selection?.type === "node" || selection?.type === "planned" || selection?.type === "file" ? selection.id : null;
    const selEdge = selection?.type === "edge" ? map.edges.find((e) => e.id === selection.id) : null;
    const touched = new Set<string>();
    if (selId && !focus) for (const e of map.edges) if (e.source === selId || e.target === selId) {
        touched.add(e.source);
        touched.add(e.target);
      }
    if (selId && !focus) for (const it of map.buildPath.items) if (it.issue === selId) it.extends.forEach((x) => touched.add(x));
    return nodes.map((n) => {
      const isSel = n.id === selId || (selEdge ? n.id === selEdge.source || n.id === selEdge.target : false);
      const dim = !!selId && !focus && n.type === "component" && !isSel && !touched.has(n.id);
      return { ...n, selected: isSel, data: { ...n.data, dim } };
    });
  }, [nodes, selection, map, focus]);

  const shownEdges = useMemo(() => {
    const selId = selection?.type === "node" || selection?.type === "planned" || selection?.type === "file" ? selection.id : null;
    return edges.map((e) => {
      const d = e.data as MapEdgeData;
      const active = selection?.type === "edge" ? e.id === selection.id : !!selId && (e.source === selId || e.target === selId);
      return {
        ...e,
        selected: selection?.type === "edge" && e.id === selection.id,
        style: edgeStyle(d.kind, d.status, active),
        zIndex: active ? 10 : 0,
        label: active && selection?.type === "edge" ? d.kind : undefined,
        labelStyle: { fill: "var(--fg)", fontSize: 10, fontFamily: "var(--font-mono)" },
        labelBgStyle: { fill: "var(--surface)" },
        markerEnd: { type: MarkerType.ArrowClosed, color: active ? "var(--accent)" : "var(--muted)", width: 14, height: 14 },
      };
    });
  }, [edges, selection]);

  const onNodeClick = useCallback(
    (_: unknown, n: Node) => {
      if (n.type === "zone") return;
      if (n.type === "neighbor") {
        setFocus(n.id.replace(/^nb:/, "") === "unmapped" ? null : n.id.replace(/^nb:/, ""));
        setSelection({ type: "node", id: n.id.replace(/^nb:/, "") });
        return;
      }
      if (n.type === "planned") return setSelection({ type: "planned", id: n.id.replace(/^plan:/, "") });
      if (n.type === "file") return setSelection({ type: "file", id: n.id.replace(/^file:/, "") });
      setSelection({ type: "node", id: n.id });
    },
    [setSelection],
  );
  const onEdgeClick = useCallback(
    (_: unknown, e: Edge) => {
      if ((e.data as MapEdgeData).kind === "references" || (e.data as MapEdgeData).kind === "extends") return;
      setSelection({ type: "edge", id: e.id });
    },
    [setSelection],
  );

  const focused = focus ? map.components.find((c) => c.id === focus) : null;
  const laying = layoutKey !== JSON.stringify([focus, showPath, [...hiddenZones], files !== null]);

  return (
    <div className="relative h-[calc(100vh-4.5rem)] min-h-[720px] w-full overflow-hidden border-y border-border bg-bg">
      <ReactFlow
        nodes={shownNodes}
        edges={shownEdges}
        nodeTypes={NODE_TYPES}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={() => setSelection(null)}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.25}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.08 }}
        className="!bg-bg"
      >
        <Background gap={24} size={1} color="var(--border)" />
      </ReactFlow>

      {/* Controls + legend */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 md:left-5 md:top-5">
        {focused ? (
          <button onClick={() => { setFocus(null); setSelection({ type: "node", id: focused.id }); }} className="pointer-events-auto rounded border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-fg hover:border-accent">
            ← map · files of <span className="text-accent">{focused.name}</span>
            {files === null && <span className="ml-2 text-muted">loading…</span>}
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowPath((v) => !v)}
              className={`pointer-events-auto rounded border px-2.5 py-1 font-mono text-[11px] ${showPath ? "border-accent text-accent" : "border-border text-muted"} bg-surface hover:border-accent`}
            >
              build path {showPath ? "on" : "off"}
            </button>
            {map.zones.map((z) => (
              <button
                key={z.id}
                onClick={() =>
                  setHiddenZones((s) => {
                    const n = new Set(s);
                    if (n.has(z.id)) n.delete(z.id);
                    else n.add(z.id);
                    return n;
                  })
                }
                className={`pointer-events-auto hidden rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-widest sm:inline ${hiddenZones.has(z.id) ? "border-border text-muted/60 line-through" : "border-border text-fg"} bg-surface hover:border-accent`}
                title={z.blurb}
              >
                {z.name}
              </button>
            ))}
          </>
        )}
        <button onClick={() => fitView({ padding: 0.08, duration: 300 })} className="pointer-events-auto rounded border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-muted hover:border-accent hover:text-fg">
          fit
        </button>
      </div>
      <Legend focus={!!focus} lens={lens} laying={laying} />

      <Panel
        map={map}
        files={files}
        linear={linearById}
        lens={lens}
        selection={selection}
        focus={focus}
        onSelect={setSelection}
        onFocus={(id) => {
          setFocus(id);
          if (id) setSelection({ type: "node", id });
        }}
        onClose={() => setSelection(null)}
      />
    </div>
  );
}

function Legend({ focus, lens, laying }: { focus: boolean; lens: Lens; laying: boolean }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden rounded border border-border bg-surface/90 px-3 py-2 font-mono text-[10px] text-muted backdrop-blur md:block">
      {laying ? (
        <span>laying out…</span>
      ) : focus ? (
        <span>files of one component · solid = reference between files · dotted box = another component these files reach · click any to open</span>
      ) : (
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" />live
          <i className="ml-3 mr-1 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" />stale
          <i className="ml-3 mr-1 inline-block h-2 w-2 rounded-full bg-zinc-400 align-middle" />scaffolded
          <span className="ml-3 border border-dashed border-accent px-1 text-accent">planned</span>
          {lens === "technical" && <span className="ml-3">· dashed edge = gate · dotted = depends-on · click a node or an edge</span>}
        </span>
      )}
    </div>
  );
}

// ---------- graph builders ----------

function buildOverview(map: SystemMap, linear: Map<string, LinearState>, showPath: boolean, hidden: Set<string>) {
  const visible = map.components.filter((c) => !hidden.has(c.zone));
  const visibleIds = new Set(visible.map((c) => c.id));
  const zoneCount = new Map<string, number>();
  for (const c of visible) zoneCount.set(c.zone, (zoneCount.get(c.zone) ?? 0) + 1);

  const nodes: MapNode[] = [];
  const items: { id: string; zone: string; w: number; h: number }[] = [];
  for (const z of map.zones) {
    if (hidden.has(z.id)) continue;
    nodes.push({ id: z.id, type: "zone", position: { x: 0, y: 0 }, data: { kind: "zone", id: z.id, name: z.name, count: zoneCount.get(z.id) ?? 0 }, selectable: false, draggable: false, zIndex: -1 });
  }
  const edges: Edge[] = map.edges
    .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
    .map((e) => ({ id: e.id, source: e.source, target: e.target, type: "default", data: { kind: e.kind, summary: e.summary, status: e.status } satisfies MapEdgeData }));

  // planned items sit directly under the first visible component they extend
  const plannedByHome = new Map<string, typeof map.buildPath.items>();
  if (showPath) {
    for (const it of map.buildPath.items) {
      const st = linear.get(it.issue)?.stateType;
      if (st === "completed" || st === "canceled") continue; // shipped since the overlay was written
      const home = it.extends.find((x) => visibleIds.has(x));
      if (!home) continue;
      plannedByHome.set(home, [...(plannedByHome.get(home) ?? []), it]);
    }
  }
  for (const c of visible) {
    nodes.push({ id: c.id, type: "component", position: { x: 0, y: 0 }, parentId: c.zone, extent: "parent", data: { kind: "component", c }, style: { width: SIZES.component.w, height: SIZES.component.h } });
    items.push({ id: c.id, zone: c.zone, w: SIZES.component.w, h: SIZES.component.h });
    for (const it of plannedByHome.get(c.id) ?? []) {
      const id = `plan:${it.issue}`;
      nodes.push({ id, type: "planned", position: { x: 0, y: 0 }, parentId: c.zone, extent: "parent", data: { kind: "planned", item: it, linear: linear.get(it.issue) ?? null }, style: { width: SIZES.planned.w, height: SIZES.planned.h } });
      items.push({ id, zone: c.zone, w: SIZES.planned.w, h: SIZES.planned.h });
      for (const x of it.extends) {
        if (!visibleIds.has(x)) continue;
        edges.push({ id: `${x}--extends--${it.issue}`, source: x, target: id, type: "default", data: { kind: "extends", summary: it.why, status: "planned" } satisfies MapEdgeData });
      }
    }
  }
  const ROW: Record<string, 0 | 1> = { intake: 0, pipelines: 0, graph: 0, records: 0, rigor: 1, surfaces: 1 };
  const zones = map.zones.filter((z) => !hidden.has(z.id)).map((z) => ({ id: z.id, row: ROW[z.id] ?? (1 as const) }));
  return { nodes: nodes as Node[], edges, grid: { zones, items } };
}

function buildFocus(map: SystemMap, files: FilesGraph | null, componentId: string) {
  if (!files) return null;
  const c = map.components.find((x) => x.id === componentId);
  if (!c) return null;
  const { own, internal, neighbors } = fileSubgraph(files, map, componentId);
  const gid = `zone:${componentId}`;
  const nodes: MapNode[] = [{ id: gid, type: "zone", position: { x: 0, y: 0 }, data: { kind: "zone", id: gid, name: `${c.name} — files`, count: own.length }, selectable: false, draggable: false, zIndex: -1 }];
  const elkNodes: { id: string; parent: string | null; w: number; h: number }[] = [];
  for (const f of own) {
    const id = `file:${f.id}`;
    nodes.push({ id, type: "file", position: { x: 0, y: 0 }, parentId: gid, extent: "parent", data: { kind: "file", f }, style: { width: SIZES.file.w, height: SIZES.file.h } });
    elkNodes.push({ id, parent: gid, w: SIZES.file.w, h: SIZES.file.h });
  }
  const edges: Edge[] = internal.map((e, i) => ({ id: `ref:${i}`, source: `file:${e.src}`, target: `file:${e.dst}`, type: "default", data: { kind: "references", summary: "", status: "live", line: e.line } satisfies MapEdgeData }));
  const elkEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
  for (const n of neighbors.slice(0, 12)) {
    const id = `nb:${n.id}`;
    const nc = n.c ?? { ...c, id: "unmapped", name: "unmapped files", kind: "reference" as const, status: "live" as const };
    nodes.push({ id, type: "neighbor", position: { x: 0, y: 0 }, data: { kind: "neighbor", c: nc, refs: n.refs }, style: { width: SIZES.neighbor.w, height: SIZES.neighbor.h } });
    elkNodes.push({ id, parent: null, w: SIZES.neighbor.w, h: SIZES.neighbor.h });
    // one aggregated edge from the group to the neighbour keeps the picture readable
    const eid = `nbe:${n.id}`;
    edges.push({ id: eid, source: gid, target: id, type: "default", data: { kind: "references", summary: "", status: "live" } satisfies MapEdgeData });
    elkEdges.push({ id: eid, source: gid, target: id });
  }
  return { nodes: nodes as Node[], edges, elk: { groups: [{ id: gid, label: c.name }], nodes: elkNodes, edges: elkEdges, direction: "RIGHT" as const } };
}
