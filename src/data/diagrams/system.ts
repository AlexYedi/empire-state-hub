// System-level figures (the fan-out constraint, cited from the changelog).
// Ground truth: the "Why fan-out runs in the parent thread" note in the pipeline repo.
import type { DiagramSpec } from "@/components/diagram/types";
import { n } from "./helpers";


export const SYSTEM_FIGURES = {
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
