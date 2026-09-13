// Figures for the system-level pages: /architecture and the /pipeline replay.
// Ground truth: pipeline repo .claude/commands/{check-new-events,event-deep-research,post-event-content,
// weekly-recap,voice-pass}.md and the "Why fan-out runs in the parent thread" note.
import type { DiagramSpec } from "@/components/diagram/types";
import { REPLAY } from "@/data/replay";
import { n } from "./helpers";

const writes = (db: string) => `×${REPLAY.writes.find((w) => w.db === db)?.count ?? 0}`;

export const SYSTEM_FIGURES = {
  "workflow-chain": {
    type: "flow",
    vertical: true,
    steps: [
      n("invite", "Calendar invite", { kind: "pill", sub: "PIPELINE block" }),
      n("a0", "/check-new-events", { sub: "A·0 · next 14 days" }),
      n("a", "/event-deep-research", { accent: true, sub: "A · research brief" }),
      n("pre", "pre-event-content", { sub: "posts · questions · DMs" }),
      n("room", "The event", { kind: "pill" }),
      n("b", "/post-event-content", { accent: true, sub: "B · post-event brief" }),
      [n("c", "/weekly-recap", { kind: "ghost", sub: "C · scaffold" }), n("d", "/voice-pass", { kind: "ghost", sub: "D · scaffold" })],
    ],
    edgeLabels: {
      "invite>a0": "detected",
      "a0>a": "one event at a time",
      "a>pre": "brief in Notion",
      "room>b": "recording → transcript",
    },
    caption:
      "Two wired workflows carry an event end to end: A researches it beforehand, B turns the recording into a brief and posts afterward. The weekly recap and voice pass are scaffolded but not yet wired (dashed).",
  },

  "fanout-constraint": {
    type: "compare",
    left: {
      title: "Tried · orchestrator subagent",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("parent", "Parent thread", { kind: "pill" }),
          n("orch", "orchestrator subagent"),
          n("specs", "4 specialists", { kind: "ghost" }),
        ],
        edgeLabels: { "parent>orch": "dispatch", "orch>specs": "no Agent tool" },
      },
    },
    right: {
      title: "Built · parent-thread fan-out",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("parent", "Parent thread", { kind: "pill", accent: true }),
          [n("co", "company"), n("pe", "person"), n("to", "topic"), n("si", "signal")],
          n("synth", "synthesizer", { accent: true, sub: "text in, text out" }),
          n("brief", "one brief"),
        ],
      },
    },
    caption:
      "A subagent can't dispatch its own subagents, so an orchestrator agent dead-ends (tested across five agents on 2026-05-07). The parent conversation launches all four specialists in one message and hands their returns to a synthesis-only agent.",
  },

  "replay-fanout": {
    type: "fanout",
    source: n("parent", "Parent thread", { kind: "pill" }),
    branches: REPLAY.fanout.map((f) => n(f.agent, f.agent, { sub: f.scope })),
    branchLabel: "one message · four Agent calls",
    sink: n("synth", "event-research-synthesizer", { accent: true }),
    tail: [n("review", "Scan head", { kind: "pill", sub: "Alex approves" })],
    edgeLabels: { "synth>review": "no writes yet" },
    caption:
      "The four specialists run concurrently from the parent thread. Their returns converge on one synthesizer, and nothing is written anywhere until Alex approves the scan head it produces.",
  },

  "replay-writes": {
    type: "graph",
    aspect: 0.36,
    nodes: [
      { ...n("companies", "Companies", { kind: "store", sub: writes("Companies") }), x: 0, y: 8 },
      { ...n("topics", "Topics", { kind: "store", sub: writes("Topics") }), x: 0, y: 92 },
      { ...n("people", "People", { kind: "store", sub: writes("People") }), x: 38, y: 8 },
      { ...n("event", "Event", { kind: "store", accent: true, sub: writes("Event") }), x: 66, y: 50 },
      { ...n("drafts", "Content Drafts", { kind: "store", sub: writes("Content Drafts") }), x: 100, y: 50 },
    ],
    edges: [
      { from: "companies", to: "people", label: "company URLs" },
      { from: "companies", to: "event" },
      { from: "people", to: "event" },
      { from: "topics", to: "event", label: "topic URLs" },
      { from: "event", to: "drafts", label: "event URL" },
    ],
    caption:
      "Writes run in dependency order because every record links to the ones created before it: Companies and Topics first (in parallel), then People, then the Event that relates to all three, then the drafts that point at the Event.",
  },
} satisfies Record<string, DiagramSpec>;
