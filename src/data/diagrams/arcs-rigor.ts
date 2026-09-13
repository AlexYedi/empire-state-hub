// Build-arc figures, Rigor · Surface · Distribution · Craft themes. Keyed by arc id.
// Ground truth: .claude/references/cross-provider-judge.md, /dod-close, hooks/build-session-emit.sh,
// the branch-first arc, the hub's own src/lib read clients, and the voice-mining loop.
import type { DiagramSpec } from "@/components/diagram/types";
import { n } from "./helpers";

export const RIGOR_ARC_FIGURES = {
  "build-rigor-measurement": {
    type: "compare",
    left: {
      title: "Before · rigor in optional docs",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("build", "build", { kind: "pill" }),
          [n("checks", "green checks"), n("docs", "rigor docs", { kind: "ghost", sub: "skippable" })],
          n("ship", "ship", { sub: "no trace" }),
        ],
        edgeLabels: { "build>docs": "optional" },
        dashed: ["docs>ship"],
      },
    },
    right: {
      title: "After · in the execution path",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("build", "build", { kind: "pill" }),
          n("judge", "judge quorum", { sub: "advisory" }),
          n("dod", "DoD gate", { sub: "met or waived + reason" }),
          n("stop", "Stop hook", { accent: true, sub: "build_session row" }),
          n("dash", "Hub /ops/rigor"),
        ],
      },
    },
    caption:
      "The diagnosed failure was structural: rigor lived in documents a memory-less agent could skip, so builds shipped on green checks and left no trace. The fix puts each check in the path every build already runs through.",
  },

  "cross-provider-judge": {
    type: "flow",
    steps: [
      n("artifact", "artifact", { kind: "pill" }),
      n("mech", "mechanized checks", { sub: "dangling refs · skeleton" }),
      [n("claude", "Claude seat", { sub: "Sonnet" }), n("gemini", "Gemini seat", { sub: "Pro" })],
      n("quorum", "Agree?", { kind: "diamond", accent: true }),
      [
        n("auto", "auto pass", { sub: "seats agree" }),
        n("alex", "Alex breaks the tie", { accent: true, sub: "split · interactive" }),
        n("flag", "fail-safe FLAG", { sub: "split · autonomous" }),
      ],
    ],
    groups: [{ label: "same rubric", from: 2, to: 2 }],
    caption:
      "Two model families score every build against one versioned rubric. Agreement passes; a split escalates to Alex, or becomes a non-destructive FLAG when he isn't present — a disputing model never gets to break its own tie.",
  },

  "build-telemetry": {
    type: "flow",
    steps: [
      [
        n("transcript", "session transcript", { sub: "counts only" }),
        n("meta", "build_meta", { kind: "store", sub: "from /dod-close" }),
      ],
      n("stop", "Stop hook", { kind: "pill" }),
      n("record", "build_session record", { kind: "store", accent: true, sub: "repo-owned" }),
      n("posthog", "PostHog", { kind: "store", sub: "swappable" }),
      n("dash", "Hub /ops/rigor"),
    ],
    edgeLabels: { "record>posthog": "if key set" },
    dashed: ["record>posthog"],
    caption:
      "The contract is the record the repo owns, written first on every stop; PostHog is a projection of it that can be swapped out. Only counts leave the transcript — never prompt, tool input, or output text.",
  },

  "branch-first-governance": {
    type: "gate",
    pre: [n("commit", "git commit", { kind: "pill" })],
    gate: n("surface", "Build surface on main?"),
    yes: {
      label: "yes",
      steps: [n("blocked", "refused", { accent: true, sub: "pre-commit hook" }), n("pr", "branch → PR → merge")],
    },
    no: { label: "no", steps: [n("main", "lands on main", { sub: "telemetry · content" })] },
    caption:
      "The hook decides by what changed, not by who is committing: skills, commands, and schemas can't be committed straight to main, while telemetry and content churn still land directly so the guardrail doesn't tax small work.",
  },

  "empire-state-hub": {
    type: "layers",
    layers: [
      {
        label: "Systems of record",
        items: [
          n("supabase", "MI graph", { kind: "store", sub: "Supabase" }),
          n("posthog", "telemetry", { kind: "store", sub: "PostHog" }),
          n("notion", "content drafts", { kind: "store", sub: "Notion" }),
          n("linear", "backlog", { kind: "store", sub: "Linear" }),
          n("json", "generated JSON", { kind: "store", sub: "journal · toolbox" }),
        ],
      },
      {
        label: "Server-only read layer",
        accent: true,
        items: [n("clients", "typed clients", { sub: "secrets stay server-side" })],
      },
      {
        label: "Two audiences",
        items: [
          n("ops", "/ops cockpit", { sub: "password gate" }),
          n("public", "public portfolio", { sub: "editorial ⇄ technical" }),
        ],
      },
    ],
    between: ["read-only", "PII designed out of public"],
    caption:
      "The hub never writes. It reads its systems of record through server-only clients and serves one set of content two ways: a password-gated cockpit, and a public portfolio with contact data designed out.",
  },

  "three-layer-program": {
    type: "graph",
    aspect: 0.42,
    nodes: [
      { ...n("empire", "Empire State", { accent: true, sub: "proves a primitive" }), x: 0, y: 88 },
      { ...n("pr", "governed PR", { sub: "+ Linear issue" }), x: 0, y: 14 },
      { ...n("plugin", "user-scope plugin", { kind: "store", accent: true, sub: "skills · agents · commands" }), x: 58, y: 14 },
      { ...n("invariants", "cross-project invariants", { sub: "Linear-as-truth · branch-first" }), x: 50, y: 88 },
      { ...n("next", "every new project", { kind: "ghost" }), x: 100, y: 50 },
    ],
    edges: [
      { from: "empire", to: "pr", label: "validated locally" },
      { from: "pr", to: "plugin", label: "promote", accent: true },
      { from: "plugin", to: "next", label: "inherited at open" },
      { from: "invariants", to: "next" },
    ],
    caption:
      "A primitive is proven inside one project first, then promoted to the user-scope plugin through a PR with an issue behind it. Every project opened afterward inherits it instead of re-learning it.",
  },

  "content-voice-engine": {
    type: "loop",
    steps: [
      n("steer", "Steer", { sub: "per-event context" }),
      n("generate", "Generate", { sub: "on-voice drafts" }),
      n("comment", "Comment", { sub: "inline in Notion" }),
      n("mine", "Mine", { accent: true, sub: "voice-mining skill" }),
      n("guides", "Style guides", { kind: "store", accent: true, sub: "every file at once" }),
    ],
    edgeLabels: ["", "", "corrections", "rules"],
    center: "one edit reaches\nevery surface",
    caption:
      "Voice is a loop rather than a frozen prompt: Alex's inline corrections are mined back into the style guides, so a rule earned on one post applies to every future draft instead of being re-litigated.",
  },
} satisfies Record<string, DiagramSpec>;
