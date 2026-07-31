// Single source of truth for the system's shape. COUNTS are imported from toolbox.json, which is
// generated from the live .claude/ frontmatter (run `pnpm gen:toolbox` after adding/removing a tool).
// The narrative below (agent roles, workflows, constraint) is hand-authored.
import toolbox from "./toolbox.json";

const c = toolbox.counts;
const g = toolbox.agentsByGroup as Record<string, number>;

export const SYSTEM = {
  counts: { skills: c.skill, agents: c.agent, commands: c.command, commits: c.commits ?? 0 },
  span: { from: "2026-04-09", to: toolbox.generated_at, label: "solo build" },

  agentGroups: [
    {
      name: "research",
      count: g["research"] ?? 0,
      role: "Per-entity depth — companies, people, topics, competitive signals — fanned out in parallel from the parent thread, then converged by a synthesizer.",
    },
    {
      name: "content",
      count: g["content"] ?? 0,
      role: "Voice, copy, conversion — drafting and editing every output against a codified style guide and anti-pattern list.",
    },
    {
      name: "sales-methodology",
      count: g["sales-methodology"] ?? 0,
      role: "Commercial insight, reframes, and buying-committee mapping — the GTM brain.",
    },
    {
      name: "ops",
      count: g["ops"] ?? 0,
      role: "Dependency-ordered Notion writes and Meadows-style systems-thinking diagnostics.",
    },
  ],

  workflows: [
    { id: "A", name: "event-deep-research", status: "wired", desc: "Parse invite → entity triage → 4 specialists in parallel → synthesizer → Notion + HubSpot." },
    { id: "A·0", name: "check-new-events", status: "wired", desc: "Detect PIPELINE-block events on the calendar; run research + pre-event content per event." },
    { id: "B", name: "post-event-content", status: "wired", desc: "Manual transcript → conditioning → a canonical post-event brief → drafted content + outreach." },
    { id: "C", name: "weekly-recap", status: "scaffold", desc: "Sunday synthesis: the upcoming-week roundup + cross-event pattern post." },
    { id: "D", name: "voice-pass", status: "scaffold", desc: "Polish needs_review drafts against the voice guide before they ship." },
  ],

  constraint: {
    title: "Subagents can't spawn subagents",
    body: "The Anthropic Agent SDK doesn't let a subagent dispatch its own subagents. So the parent thread — the slash-command conversation — owns the fan-out: it launches the four research specialists in parallel, then hands their returns to a synthesizer that converges them into one brief. Synthesis-only agents (text in, text out) work fine as subagents; orchestration has to live in the parent. Designing around that constraint, rather than fighting it, is what makes the pipeline reliable.",
  },
} as const;
