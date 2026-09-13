// Journal-only figures, part A: mechanisms the build journal describes that no changelog entry or
// build arc covers. Ground truth: hooks/deep-read-{ledger,gate}.sh, event-deep-research Steps 2.5–4.5,
// check-new-events Step 6a.0 + post-event-content Step 3.9 (Aim / Sharpen), /scan-roles, the journal prose.
import type { DiagramSpec } from "@/components/diagram/types";
import { n } from "./helpers";

export const JOURNAL_FIGURES_A = {
  "deep-read-gate": {
    type: "gate",
    pre: [
      n("ledger", "ledger row: pending", { kind: "store", sub: "set at Scan-head commit" }),
      n("render", "Deep Read render", { sub: "success → rendered" }),
    ],
    gate: n("stop", "Pending at Stop?"),
    yes: { label: "yes", steps: [n("block", "block close", { accent: true, sub: "re-run or waive" })] },
    no: { label: "none", steps: [n("green", "run closes green")] },
    caption:
      "A thin brief can no longer close green. Each touched event gets a ledger row marked pending when its Scan head commits, and only a successful render flips it. At stop, any pending or unreadable row blocks the close; if it still can't be resolved, a durable FAILED row is written — the invisibility that let 38 thin briefs through on Aug 24.",
  },

  "brief-two-layers": {
    type: "graph",
    aspect: 0.42,
    nodes: [
      { ...n("synth", "synthesizer", { kind: "pill" }), x: 0, y: 50 },
      { ...n("scan", "Scan head", { sub: "phone-glanceable" }), x: 34, y: 8 },
      { ...n("evidence", "Evidence Set", { kind: "store", sub: "URLs per section" }), x: 34, y: 92 },
      { ...n("renderer", "field-guide-renderer", { accent: true, sub: "Opus · per section → stitch" }), x: 68, y: 92 },
      { ...n("notion", "Content Draft", { kind: "store", sub: "Notion" }), x: 100, y: 8 },
      { ...n("deep", "Deep Read", { accent: true, sub: "cited prose" }), x: 100, y: 92 },
    ],
    edges: [
      { from: "synth", to: "scan" },
      { from: "synth", to: "evidence" },
      { from: "scan", to: "notion", label: "commits first" },
      { from: "evidence", to: "renderer" },
      { from: "renderer", to: "deep", accent: true },
      { from: "deep", to: "notion", label: "appended later", dashed: true },
    ],
    caption:
      "The brief became one artifact in two layers. The Scan head commits to Notion immediately; the Evidence Set feeds an Opus renderer that writes the cited Deep Read section by section and appends it afterward, so a failed render never blocks the pipeline.",
  },

  "steering-v2": {
    type: "compare",
    left: {
      title: "Before · one up-front interview",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("interview", "steering interview", { kind: "pill", sub: "generic prompts" }),
          n("research", "research"),
          n("brief", "brief", { kind: "store" }),
          n("draft", "drafting"),
        ],
      },
    },
    right: {
      title: "After · two touches",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("aim", "Aim", { kind: "pill", sub: "light · skippable" }),
          n("research", "research"),
          n("brief", "brief", { kind: "store" }),
          n("sharpen", "Sharpen gate", { accent: true, sub: "≤3 forks it surfaced" }),
          n("draft", "drafting"),
        ],
      },
    },
    caption:
      "Real co-creation needs choices that only exist after the research, so the single up-front interview was split in two. A light Aim points the research; a Sharpen gate after the brief puts at most three genuine forks to Alex before anything is drafted.",
  },

  "table-set": {
    type: "compare",
    left: {
      title: "The draft that shipped",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("insight", "the insight", { kind: "pill" }),
          n("value", "the value"),
          n("lost", "what was this event?", { kind: "ghost" }),
        ],
      },
    },
    right: {
      title: "TABLE-SET rule",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("context", "context", { kind: "pill", accent: true, sub: "what · format · who presented" }),
          n("why", "why it matters"),
          n("value", "the value"),
        ],
      },
    },
    caption:
      "A shipped post opened on its insight and never said what the event was. The correction became a rule the generator enforces on every event post: say what it was, what format, and who presented — then why it matters, then the value.",
  },

  "role-radar": {
    type: "flow",
    vertical: true,
    steps: [
      [
        n("ats", "ATS boards", { sub: "Greenhouse · Lever · Ashby" }),
        n("rss", "RSS saved searches"),
        n("apollo", "Apollo at targets", { sub: "credit-gated" }),
      ],
      n("dedupe", "dedupe on ATS job ID"),
      n("ic", "IC vs manager gate", { sub: "does the seat carry a book?" }),
      n("score", "score the role's mechanism", { accent: true, sub: "from the JD, not the title" }),
      n("approve", "ranked for approval", { kind: "pill" }),
      n("db", "Notion Roles DB", { kind: "store" }),
    ],
    caption:
      "Role radar stopped being generic browsing. Roles from legitimate sources are deduplicated on their ATS job ID, screened for whether the seat carries its own book, and scored on what the job description says the role does rather than its title — then held for approval before anything is written.",
  },

  "signal-stream": {
    type: "layers",
    layers: [
      {
        label: "Layer 1 · ask the stream",
        items: [n("nl", "natural-language query"), n("topic", "live Kafka topic", { kind: "store" })],
      },
      {
        label: "Layer 2 · classify against the ICP",
        accent: true,
        items: [n("flink", "Flink ML_PREDICT", { sub: "flagged unverified" }), n("notion", "Notion", { kind: "store" })],
      },
      {
        label: "Layer 3 · situation room (stretch)",
        muted: true,
        items: [n("room", "multi-agent room", { kind: "ghost" })],
      },
    ],
    between: ["builds on", "builds on"],
    caption:
      "A real-time GTM signal agent built on Confluent's own stack as prep for its AI Day, in three layers that each demo on their own. Only the producer and sink were tested against live data; the fast-moving Flink AI SQL is flagged as unverified rather than claimed working.",
  },

  "batch-tiering": {
    type: "flow",
    steps: [
      n("week", "9 events next week", { kind: "pill", sub: "40–70 searches each" }),
      n("fits", "Fits one ~200-search session?", { kind: "diamond", sub: "no → tier it" }),
      [
        n("now", "run now", { accent: true, sub: "4 in-person + 1 panel" }),
        n("next", "next session", { sub: "2 vendor livestreams" }),
        n("roundup", "roundup only", { sub: "2 webinars" }),
      ],
      n("hold", "held at the gate", { kind: "pill", sub: "awaiting Alex's go" }),
    ],
    caption:
      "Nine full briefs don't fit one session when each research fan-out spends 40–70 of a ~200-search cap. The pipeline proposed a tier split and held at its approval gate with nothing written to Notion — the constraint doing the prioritization the calendar never does.",
  },
} satisfies Record<string, DiagramSpec>;
