import { FONT, LABEL_FONT, LINE, SUB_FONT, SUB_LINE, layout } from "./layout";
import type { DiagramSpec, Scene, SceneNode } from "./types";

// Colour comes only from the lens tokens, so every figure re-themes with the Editorial / Technical
// toggle. Accent marks the beat a figure is about and always travels with a heavier stroke, so the
// emphasis never rests on hue alone.
const INK = "var(--fg)";
const MUTED = "var(--muted)";
const ACCENT = "var(--accent)";
const SURFACE = "var(--surface)";
const TINT = "color-mix(in srgb, var(--accent) 10%, var(--surface))";

/** One figure, one claim. `id` must be unique on the page — it scopes the arrowhead markers. */
export function Figure({ id, spec }: { id: string; spec: DiagramSpec }) {
  const alt = spec.alt ?? spec.caption;
  return (
    <figure id={id} className="my-6 scroll-mt-24 rounded-lg border border-border bg-surface p-4 sm:p-5">
      {spec.type === "compare" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {[spec.left, spec.right].map((side, i) => (
            <div key={side.title} className={i ? "sm:border-l sm:border-border sm:pl-5" : undefined}>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">{side.title}</div>
              <SceneSvg id={`${id}-${i}`} scene={layout(side.spec)} label={`${side.title}. ${alt}`} />
            </div>
          ))}
        </div>
      ) : (
        <SceneSvg id={id} scene={layout(spec)} label={alt} />
      )}
      <figcaption className="mt-3 text-[13px] leading-relaxed text-muted">{spec.caption}</figcaption>
    </figure>
  );
}

function SceneSvg({ id, scene, label }: { id: string; scene: Scene; label: string }) {
  const arrow = `${id}-arrow`;
  const arrowAccent = `${id}-arrow-accent`;
  return (
    // Wide figures keep a legible minimum size and scroll inside their own box on phones.
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${scene.w} ${scene.h}`}
        role="img"
        aria-label={label}
        className="mx-auto block h-auto w-full"
        style={{ maxWidth: Math.round(scene.w * 1.08), minWidth: Math.round(scene.w * 0.72) }}
        fontFamily="var(--font-body)"
      >
        <defs>
          {(
            [
              [arrow, MUTED],
              [arrowAccent, ACCENT],
            ] as const
          ).map(([markerId, fill]) => (
            <marker
              key={markerId}
              id={markerId}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0L10 5L0 10z" style={{ fill }} />
            </marker>
          ))}
        </defs>

        {scene.panels.map((p, i) => (
          <g key={`panel-${i}`}>
            <rect
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              rx={8}
              style={{
                fill: p.accent ? TINT : "none",
                stroke: p.accent ? ACCENT : MUTED,
                strokeOpacity: p.accent ? 0.9 : 0.35,
                strokeDasharray: p.muted ? "4 3" : undefined,
              }}
            />
            <text
              x={p.x + 14}
              y={p.y + 18}
              fontFamily="var(--font-mono)"
              fontSize={10}
              letterSpacing="0.08em"
              style={{ fill: p.accent ? ACCENT : MUTED }}
            >
              {p.label.toUpperCase()}
            </text>
          </g>
        ))}

        {scene.groups.map((g, i) => (
          <g key={`group-${i}`}>
            <rect
              x={g.x}
              y={g.y}
              width={g.w}
              height={g.h}
              rx={10}
              style={{ fill: "none", stroke: MUTED, strokeOpacity: 0.4, strokeDasharray: "3 4" }}
            />
            <text
              x={g.x + 2}
              y={g.y - 6}
              fontFamily="var(--font-mono)"
              fontSize={10}
              letterSpacing="0.08em"
              style={{ fill: MUTED }}
            >
              {g.label.toUpperCase()}
            </text>
          </g>
        ))}

        {scene.edges.map((e, i) => (
          <path
            key={`edge-${i}`}
            d={e.d}
            fill="none"
            markerEnd={`url(#${e.accent ? arrowAccent : arrow})`}
            style={{
              stroke: e.accent ? ACCENT : MUTED,
              strokeOpacity: e.accent ? 1 : 0.7,
              strokeWidth: e.accent ? 1.75 : 1.2,
              strokeDasharray: e.dashed ? "4 3" : undefined,
            }}
          />
        ))}

        {scene.nodes.map((n) => (
          <Node key={n.id} n={n} />
        ))}

        {/* Edge labels paint last, haloed in the surface colour so they stay legible over any line. */}
        {scene.edges.map((e, i) =>
          e.label ? (
            <text
              key={`label-${i}`}
              x={e.lx}
              y={e.ly}
              textAnchor={e.anchor ?? "middle"}
              fontFamily="var(--font-mono)"
              fontSize={LABEL_FONT}
              style={{
                fill: e.accent ? ACCENT : MUTED,
                stroke: SURFACE,
                strokeWidth: 4,
                strokeLinejoin: "round",
                paintOrder: "stroke",
              }}
            >
              {e.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

function Node({ n }: { n: SceneNode }) {
  const note = n.kind === "note";
  const shape = {
    fill: note ? "none" : n.accent ? TINT : SURFACE,
    stroke: note ? "none" : n.accent ? ACCENT : MUTED,
    strokeOpacity: n.accent ? 1 : n.muted ? 0.45 : 0.6,
    strokeWidth: n.accent ? 1.75 : 1,
    strokeDasharray: n.kind === "ghost" ? "4 3" : undefined,
  };
  const block = n.lines.length * LINE + (n.sub ? SUB_LINE : 0);
  const top = n.y + n.h / 2 - block / 2 + (n.kind === "store" ? 3 : 0);
  const x = n.x + n.w / 2;
  return (
    <g>
      {n.kind === "diamond" ? (
        <polygon
          points={`${x},${n.y} ${n.x + n.w},${n.y + n.h / 2} ${x},${n.y + n.h} ${n.x},${n.y + n.h / 2}`}
          style={shape}
        />
      ) : note ? null : (
        <rect
          x={n.x}
          y={n.y}
          width={n.w}
          height={n.h}
          rx={n.kind === "pill" ? n.h / 2 : n.kind === "store" ? 3 : 6}
          style={shape}
        />
      )}
      {n.kind === "store" && (
        <line
          x1={n.x}
          x2={n.x + n.w}
          y1={n.y + 6}
          y2={n.y + 6}
          style={{ stroke: shape.stroke, strokeOpacity: shape.strokeOpacity, strokeWidth: shape.strokeWidth }}
        />
      )}
      <text
        textAnchor="middle"
        fontSize={FONT}
        fontWeight={n.accent ? 600 : 450}
        style={{ fill: n.muted || note ? MUTED : INK }}
      >
        {n.lines.map((line, i) => (
          <tspan key={i} x={x} y={top + LINE * (i + 1) - 4}>
            {line}
          </tspan>
        ))}
      </text>
      {n.sub && (
        <text
          x={x}
          y={top + n.lines.length * LINE + SUB_LINE - 3}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={SUB_FONT}
          style={{ fill: MUTED }}
        >
          {n.sub}
        </text>
      )}
    </g>
  );
}
