// Build-arc figures, Intelligence theme. Keyed by arc id (build-arcs.json is canonical and shared
// with the Artifact generator, so figures attach here rather than as fields on that file).
// Ground truth: .claude/references/market-intel-spine.md, /morning-refresh, /recompute-relevance,
// /scan-trends · /scan-voices · /scan-roles, /interview-prep, ADR-7.
import type { DiagramSpec } from "@/components/diagram/types";
import { n } from "./helpers";

export const INTELLIGENCE_ARC_FIGURES = {
  "market-intelligence-engine": {
    type: "graph",
    width: 900,
    aspect: 0.44,
    nodes: [
      { ...n("producers", "Producers", { kind: "pill", sub: "radars · inbox miner" }), x: 0, y: 50 },
      { ...n("event", "event", { kind: "store", accent: true, sub: "kind · source · confidence" }), x: 40, y: 50 },
      { ...n("hub", "Hub dashboard", { sub: "reads over REST" }), x: 40, y: 2 },
      { ...n("recompute", "relevance recompute", { sub: "pure math" }), x: 40, y: 98 },
      { ...n("join", "event_entity", { kind: "store", sub: "hyperedge join" }), x: 74, y: 50 },
      { ...n("company", "company", { kind: "store" }), x: 100, y: 6 },
      { ...n("person", "person", { kind: "store" }), x: 100, y: 50 },
      { ...n("topic", "topic", { kind: "store" }), x: 100, y: 94 },
    ],
    edges: [
      { from: "producers", to: "event", label: "a signal", accent: true },
      { from: "event", to: "hub", dashed: true },
      { from: "event", to: "join", label: "links N" },
      { from: "join", to: "company" },
      { from: "join", to: "person" },
      { from: "join", to: "topic" },
      { from: "recompute", to: "topic", label: "relevance_score", dashed: true },
    ],
    caption:
      "A signal is an event row with a kind, a cited source, and a confidence. One event links any number of companies, people, and topics through a single join table, so the whole graph is four objects and one hyperedge.",
  },

  "knowledge-graph-hygiene": {
    type: "gate",
    pre: [
      n("notion", "Notion backfill", { kind: "pill", sub: "172 · 153 · 240" }),
      n("norm", "normalize + fuzzy-match"),
      n("dry", "dry run", { sub: "before any write" }),
    ],
    gate: n("match", "Confident match?"),
    yes: { label: "yes", steps: [n("merge", "safe-merge", { accent: true, sub: "signals move over" })] },
    no: { label: "unsure", steps: [n("flag", "flag for Alex"), n("import", "import as new")] },
    edgeLabels: { "flag>import": "his call" },
    caption:
      "Every record is matched before it's created. Confident matches merge and carry their signals with them; uncertain ones are flagged for a human decision instead of being guessed at.",
  },

  "progressive-trend-engine": {
    type: "loop",
    steps: [
      n("pull", "Delta pull", { sub: "only since last run" }),
      n("match", "Normalize + match", { sub: "before create" }),
      n("log", "Append signals", { kind: "store", sub: "never deleted" }),
      n("recompute", "Recompute relevance", { accent: true, sub: "0 tokens" }),
      n("report", "Report", { sub: "Farmed · Added · Cooled" }),
    ],
    edgeLabels: ["", "new only", "", "ranked"],
    center: "manual trigger, daily",
    caption:
      "Each run appends what's new and re-derives every topic's ranking from the full history, with a 14-day half-life. Nothing is wiped: a topic with no new signal is reported as Cooled, not removed.",
  },

  "signal-scanners": {
    type: "flow",
    steps: [
      [
        n("hn", "HackerNews"),
        n("hf", "HuggingFace"),
        n("news", "newsletters"),
        n("li", "LinkedIn", { kind: "ghost", sub: "no legitimate API" }),
      ],
      n("taxonomy", "shared taxonomy", { accent: true, sub: "normalize" }),
      n("score", "decay + corroboration", { sub: "score" }),
      n("graph", "graph", { kind: "store" }),
    ],
    groups: [{ label: "public sources only", from: 0, to: 0 }],
    dashed: ["li>taxonomy"],
    caption:
      "Trend, voice, and role radars read public sources only, so LinkedIn stays a stated gap rather than a scrape. Everything passes through one taxonomy, which is what lets a topic seen on three sources count as corroboration instead of three topics.",
  },

  "topic-intelligence-layer": {
    type: "layers",
    layers: [
      { label: "Raw · producers write", items: [n("signals", "signals", { kind: "store" })] },
      {
        label: "Derived · pg_cron + heartbeat",
        accent: true,
        items: [n("clusters", "cluster taxonomy"), n("series", "trend series"), n("bridges", "topic bridges")],
      },
      { label: "Surface · reads only", muted: true, items: [n("map", "Hub field map", { kind: "ghost", sub: "partial" })] },
    ],
    between: ["materialized on schedule", "precomputed read"],
    caption:
      "Producers only write raw signal. A scheduled layer owns everything derived from it, with a heartbeat so a stale refresh is visible rather than silent, and the Hub reads the precomputed result.",
  },

  "interview-prep-dossier": {
    type: "compare",
    left: {
      title: "Events lens",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("in", "calendar invite", { kind: "pill" }),
          n("sp", "same 4 specialists", { accent: true }),
          n("syn", "event-research-synthesizer"),
          n("out", "research brief", { kind: "store" }),
        ],
      },
    },
    right: {
      title: "Job-search lens",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("in", "company · JD · stage · interviewer", { kind: "pill" }),
          n("sp", "same 4 specialists", { accent: true }),
          n("syn", "dossier-synthesizer"),
          n("judge", "judge gate"),
          n("out", "dossier", { kind: "store", sub: "then Alex reviews" }),
        ],
      },
    },
    caption:
      "The job-search lens reuses the event pipeline's four research specialists unchanged. Only the intake, the synthesizer, and a judge gate before review are new — the proof the engine is lens-agnostic.",
  },
} satisfies Record<string, DiagramSpec>;
