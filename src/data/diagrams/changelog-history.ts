// Figures for the April–July changelog entries that don't already have a build-arc figure.
// Entries that duplicate an arc (judge, rigor layer, the hub, the fan-out pivot) reuse that figure
// through the placement map in ./index.ts.
import type { DiagramSpec } from "@/components/diagram/types";
import { n } from "./helpers";

export const HISTORY_FIGURES = {
  "toolbox-generator": {
    type: "flow",
    steps: [
      n("src", ".claude/ frontmatter", { kind: "store", sub: "skills · agents · commands" }),
      n("gen", "pnpm gen:toolbox"),
      n("json", "toolbox.json", { kind: "store", accent: true, sub: "counts + catalog" }),
      [n("hero", "home page stats"), n("arch", "/architecture counts"), n("ops", "/ops/toolbox")],
    ],
    edgeLabels: { "src>gen": "scans", "gen>json": "writes" },
    caption:
      "The counts on this site aren't typed by hand. A generator scans the live skill, agent, and command files and writes one JSON file that every page reads, so the numbers can't drift from what actually exists.",
  },

  "ops-dashboards": {
    type: "flow",
    steps: [
      [n("hooks", "build hooks", { kind: "pill" }), n("producers", "MI producers", { kind: "pill" })],
      [
        n("posthog", "PostHog project", { kind: "store", accent: true, sub: "build telemetry only" }),
        n("graph", "MI graph", { kind: "store", sub: "Supabase" }),
      ],
      [n("rigor", "/ops/rigor"), n("intel", "/ops/market-intel")],
    ],
    edgeLabels: { "hooks>posthog": "write key", "posthog>rigor": "read key" },
    caption:
      "Build telemetry moved to its own PostHog project so delivery signal never mixes with product analytics, with write and read keys split by scope. Each /ops surface reads exactly one system.",
  },

  "execution-focus": {
    type: "compare",
    left: {
      title: "No-build rule",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("idea", "a build idea", { kind: "pill" }),
          n("rule", "blocked by the rule"),
          n("friction", "publishing friction stays", { kind: "ghost" }),
        ],
      },
    },
    right: {
      title: "Steering bias",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("idea", "a build idea", { kind: "pill" }),
          n("q", "Removes real publishing friction?", { kind: "diamond", accent: true }),
          [n("build", "build it", { accent: true }), n("park", "park it", { kind: "ghost" })],
        ],
        edgeLabels: { "q>build": "yes", "q>park": "no" },
      },
    },
    caption:
      "The no-build rule protected execution until it started blocking the fixes execution needed. It was retired for a steering bias: build only what removes real publishing friction, and park the rest.",
  },

  "voice-stance": {
    type: "gate",
    pre: [n("draft", "a stance in a draft", { kind: "pill" })],
    gate: n("earned", "Earned by space and expertise?"),
    yes: { label: "yes", steps: [n("state", "take the side", { accent: true })] },
    no: { label: "no", steps: [n("report", "report the room instead")] },
    caption:
      "Voice v0.5 made stance something a post has to earn: a draft takes a side only when the space and Alex's expertise support it, and otherwise reports what the room said. The weekly roundup sets the table and takes no side at all.",
  },

  "brief-canonical-store": {
    type: "flow",
    steps: [
      n("run", "post-event run", { kind: "pill" }),
      n("brief", "post-event brief", { kind: "store", accent: true, sub: "one per event" }),
      [n("posts", "posts"), n("outreach", "outreach notes"), n("synthesis", "cross-event synthesis")],
    ],
    edgeLabels: { "run>brief": "produces" },
    caption:
      "Every post-event run produces one browsable brief, and everything downstream references it rather than each piece re-reading the transcript on its own.",
  },

  "source-check": {
    type: "gate",
    pre: [n("claim", "a thesis about a firm or person", { kind: "pill" })],
    gate: n("cited", "Cited source?"),
    yes: { label: "yes", steps: [n("publish", "can go public", { accent: true })] },
    no: { label: "no", steps: [n("verify", "hold and verify")] },
    caption:
      "Any public claim about a named firm or person needs a cited source before it ships; without one the draft holds for verification. The same batch made a visual brief standard alongside every post.",
  },

  "workflow-b-v1": {
    type: "flow",
    steps: [
      n("transcript", "transcript", { kind: "pill", sub: "pasted manually" }),
      n("condition", "conditioning"),
      n("brief", "post-event brief", { kind: "store", accent: true }),
      [n("posts", "drafted posts"), n("outreach", "outreach notes")],
    ],
    caption:
      "Workflow B's first version: a manually pasted transcript is conditioned, synthesized into a post-event brief, and drafted into posts and outreach. Automatic capture was left out because the recording integration wasn't working.",
  },

  "check-new-events": {
    type: "gate",
    pre: [n("cal", "Going to Events calendar", { kind: "pill", sub: "next 14 days" })],
    gate: n("block", "PIPELINE block?"),
    yes: {
      label: "yes",
      steps: [
        n("research", "/event-deep-research", { accent: true, sub: "one event at a time" }),
        n("pre", "pre-event-content"),
      ],
    },
    no: { label: "no", steps: [n("skip", "skipped", { kind: "ghost" })] },
    caption:
      "The calendar invite became the structured intake: accepting an event means adding a PIPELINE block naming the speakers, host, and topics. The command finds those invites, drops any already in Notion, and runs research and pre-event content one event at a time.",
  },

  "systems-harness": {
    type: "flow",
    steps: [
      n("problem", "a recurring failure", { kind: "pill" }),
      n("analyst", "systems-analyst", { accent: true, sub: "8-phase Meadows diagnostic" }),
      [n("archetype", "archetype named"), n("leverage", "leverage points")],
      n("linear", "Linear", { kind: "store", sub: "the one list of what's open" }),
    ],
    dashed: ["archetype>linear", "leverage>linear"],
    caption:
      "Chronic problems go to a diagnostic agent that names the underlying archetype and where intervention has leverage, instead of patching the symptom. Linear became the single source of truth for what's open, so that work is tracked in one place.",
  },

  "multi-agent-rebuild": {
    type: "compare",
    left: {
      title: "Before · one monolithic skill",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("invite", "invite", { kind: "pill" }),
          n("mono", "event-research skill", { sub: "every step, one context" }),
          n("brief", "brief", { kind: "store" }),
        ],
      },
    },
    right: {
      title: "After · parallel specialists",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("invite", "invite", { kind: "pill" }),
          [n("co", "company"), n("pe", "person"), n("to", "topic"), n("si", "signal")],
          n("synth", "synthesizer", { accent: true }),
          n("brief", "brief", { kind: "store" }),
        ],
      },
    },
    caption:
      "/event-deep-research replaced a single skill that did everything with four specialists researching in parallel, each deep on one kind of entity, and a synthesizer that converges what they return.",
  },

  "take-3": {
    type: "compare",
    left: {
      title: "Earlier takes · middleware",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("claude", "Claude", { kind: "pill" }),
          n("n8n", "n8n workflows", { sub: "middleware" }),
          n("notion", "Notion", { kind: "store" }),
        ],
      },
    },
    right: {
      title: "Take 3 · skill-first",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("skills", "Claude skills", { kind: "pill", accent: true }),
          n("mcp", "direct MCP writes", { accent: true }),
          [n("notion", "Notion", { kind: "store" }), n("hubspot", "HubSpot", { kind: "store" })],
        ],
      },
    },
    caption:
      "Take 3 removed the middleware layer: skills write to Notion and HubSpot directly over MCP, so nothing sits between the agent and the systems of record.",
  },
} satisfies Record<string, DiagramSpec>;
