// Journal-only figures, part B. Ground truth: event-research SKILL.md Step 1.7 (cost guard, YED-132),
// ADR-4 (expand-contract), hooks/build-journal-refresh.sh, build-arcs.ts header, the judge calibration
// gate, the command skeleton, and /ingest-doc + /ask-library (YED-118).
import type { DiagramSpec } from "@/components/diagram/types";
import { n } from "./helpers";

export const JOURNAL_FIGURES_B = {
  "prior-context": {
    type: "flow",
    vertical: true,
    steps: [
      n("triage", "triage plan", { kind: "pill" }),
      n("filter", "drop entities with no prior record", { sub: "researched fresh instead" }),
      n("rank", "rank by fixed priority", { sub: "series brief first" }),
      n("cap", "pull the top 8", { accent: true, sub: "the rest: on demand" }),
      n("audit", "audit line", { sub: "missing = cap never ran" }),
      n("condition", "knowledge-conditioning", { sub: "KNOWN · STALE · UNVERIFIED" }),
      n("pack", "Prior-Context Pack", { kind: "store", accent: true, sub: "feeds the fan-out" }),
    ],
    caption:
      "Research compounds instead of restarting from web search. Before the fan-out the run pulls what the pipeline already knows — only for entities with a prior record, ranked by fixed priority and capped at eight, with an audit line that proves the cap ran. Each fact is tagged known, stale, or unverified, and nothing stale reaches the brief as fact.",
  },

  "expand-contract": {
    type: "gate",
    pre: [
      n("v2", "build canonical_v2", { kind: "store", accent: true, sub: "public stays read-only" }),
      n("validate", "invariants + reference implementation"),
    ],
    gate: n("rehearsed", "Proven on a test DB, incl. rollback?"),
    yes: { label: "yes", steps: [n("swap", "atomic swap", { accent: true, sub: "hubs + pipeline repoint" })] },
    no: { label: "no", steps: [n("wait", "nothing touches prod")] },
    caption:
      "The graph consolidation never changes data in place. The new model is built in a parallel schema while the live one stays read-only, validated against invariants and a fresh reference implementation, and cut over by an atomic swap — and nothing runs on production until the whole sequence, rollback included, has passed on a test copy.",
  },

  "journal-generator": {
    type: "flow",
    steps: [
      [
        n("git", "git history", { kind: "store" }),
        n("telemetry", "build telemetry", { kind: "store" }),
        n("prose", "prose sidecar", { kind: "store", sub: "human-owned" }),
      ],
      n("gen", "build_journal.py", { accent: true, sub: "zero tokens" }),
      n("changed", "Entries changed?", { kind: "diamond" }),
      n("json", "build-journal.json", { kind: "store", sub: "committed by a human" }),
    ],
    edgeLabels: { "changed>json": "yes · adopt" },
    caption:
      "The journal assembles itself. On every session stop a script rebuilds each day's facts from git and telemetry and merges in the human-written prose. The hub's file is replaced only when the entries actually changed, and committing it stays a human step.",
  },

  "arcs-canonical": {
    type: "compare",
    left: {
      title: "Before · two hand-edited copies",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("edit", "an edit", { kind: "pill" }),
          [n("page", "hub page copy"), n("artifact", "Artifact copy", { kind: "ghost", sub: "drifts" })],
        ],
      },
    },
    right: {
      title: "After · one canonical file",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("json", "build-arcs.json", { kind: "store", accent: true }),
          [n("page", "/build-arcs page"), n("artifact", "Artifact", { sub: "regenerated" })],
        ],
      },
    },
    caption:
      "Build-arc copy lived in two hand-edited places that drifted apart. One JSON file now feeds both the hub page and the shareable Artifact, so an edit lands in both or neither.",
  },

  "judge-calibration": {
    type: "gate",
    pre: [
      n("run", "judge scores a build", { kind: "pill" }),
      n("ack", "Alex agrees or disagrees", { sub: "one ack per run" }),
    ],
    gate: n("threshold", "≥20 runs at ≥80% agreement?"),
    yes: { label: "yes", steps: [n("trusted", "provisional-trusted", { accent: true, sub: "gates independent builds" })] },
    no: { label: "not yet", steps: [n("advisory", "stays advisory")] },
    caption:
      "The judge had to earn trust against a human anchor before its verdict could gate anything: at least 20 runs agreeing with Alex 80% of the time or better. Even then it stays advisory on work it helped produce, and never hard-blocks. The same pass wired the writer that stopped DoD telemetry fields coming back null.",
  },

  "command-skeleton": {
    type: "compare",
    left: {
      title: "Declarative · failed the bar",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("cmd", "command file", { kind: "pill" }),
          n("list", "lists its agents"),
          n("nothing", "no dispatch, no output", { kind: "ghost" }),
        ],
      },
    },
    right: {
      title: "Required skeleton",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("intake", "intake", { kind: "pill" }),
          n("dispatch", "dispatch"),
          n("collect", "collect"),
          n("synth", "synthesize"),
          n("output", "named output", { accent: true }),
        ],
      },
    },
    caption:
      "A command that only named its agents did nothing when it ran. Every command now follows one skeleton — intake, dispatch, collect, synthesize, and a named output — and the judge checks for it mechanically.",
  },

  "kb-retrieval": {
    type: "graph",
    width: 860,
    aspect: 0.4,
    nodes: [
      { ...n("doc", "document", { kind: "pill", sub: "epub · PDF" }), x: 0, y: 8 },
      { ...n("ingest", "chunk + embed locally", { sub: "sha256 dedup" }), x: 33, y: 8 },
      { ...n("store", "pgvector + R2", { kind: "store", accent: true }), x: 66, y: 8 },
      { ...n("harness", "eval set v2", { sub: "3-arm harness" }), x: 100, y: 8 },
      { ...n("q", "question", { kind: "pill" }), x: 0, y: 92 },
      { ...n("retrieve", "top-k retrieval", { sub: "k = 8" }), x: 33, y: 92 },
      { ...n("rerank", "local reranker", { accent: true }), x: 66, y: 92 },
      { ...n("answer", "cited answer", { sub: "title — page" }), x: 100, y: 92 },
    ],
    edges: [
      { from: "doc", to: "ingest" },
      { from: "ingest", to: "store", label: "writes" },
      { from: "q", to: "retrieve" },
      { from: "store", to: "retrieve", label: "passages" },
      { from: "retrieve", to: "rerank" },
      { from: "rerank", to: "answer" },
      { from: "harness", to: "rerank", label: "measures", dashed: true },
    ],
    caption:
      "Books and papers are chunked and embedded locally into pgvector, deduplicated by content hash. A question pulls the top passages, a local reranker reorders them, and the answer cites every claim to a title and page. An evaluation set and a three-arm harness measure whether each retrieval change actually helps.",
  },
} satisfies Record<string, DiagramSpec>;
