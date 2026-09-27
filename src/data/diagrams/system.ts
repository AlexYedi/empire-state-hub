// Figures for the system-level page: /architecture.
// Ground truth: pipeline repo .claude/commands/{check-new-events,event-deep-research,post-event-content,
// weekly-recap,voice-pass}.md and the "Why fan-out runs in the parent thread" note.
import type { DiagramSpec } from "@/components/diagram/types";
import { n } from "./helpers";


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
} satisfies Record<string, DiagramSpec>;
