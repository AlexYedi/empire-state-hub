// Curated build milestones — the system's real evolution (dated from the project
// history), plus the raw commit cadence. More readable than raw commit messages.

export const CHANGELOG = {
  commits: 160,
  span: "Apr 9 – Jun 11, 2026",
  entries: [
    { date: "2026-06-12", title: "Empire State Hub", body: "This site — a dual-lens portfolio and live operator cockpit, built on the pipeline's own data." },
    { date: "2026-06-11", title: "Execution-focus window closed", body: "Retired the no-build rule once it inverted, and replaced it with a steering bias: build only what removes real publishing friction." },
    { date: "2026-05-30", title: "Voice system v0.5", body: "Stance must be earned by space and expertise; decenter the self; the weekly roundup sets the table, it doesn't take a side." },
    { date: "2026-05-28", title: "Post-event brief as canonical store", body: "Every post-event run now produces one browsable brief that all downstream content references." },
    { date: "2026-05-26", title: "Visual briefs + source discipline", body: "Gamma as the default infographic generator; any firm- or person-level thesis claim needs a cited source before it goes public." },
    { date: "2026-05-21", title: "/post-event-content", body: "Manual transcript → conditioning → a brief → drafted content and outreach." },
    { date: "2026-05-20", title: "/check-new-events", body: "The calendar invite becomes the structured intake — a PIPELINE block added at acceptance time." },
    { date: "2026-05-13", title: "Systems-thinking harness", body: "A Meadows-grounded diagnostic agent, and Linear as the single source of truth for what's open." },
    { date: "2026-05-07", title: "Orchestrator → synthesizer pivot", body: "Resolved the SDK constraint: parent-thread fan-out plus a synthesis-only subagent." },
    { date: "2026-05-04", title: "Multi-agent rebuild", body: "/event-deep-research — parallel research specialists replacing the monolithic skill." },
    { date: "2026-04-09", title: "Pipeline, take 3", body: "Skill-first architecture with direct MCP writes — no n8n, no middleware. The reset that worked." },
  ],
} as const;
