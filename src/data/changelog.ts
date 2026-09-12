// Curated build milestones — the system's real evolution (dated from the project
// history), plus the raw commit cadence. More readable than raw commit messages.

export const CHANGELOG = {
  commits: 414,
  span: "Apr 9 – Sep 12, 2026",
  entries: [
    { date: "2026-09-12", title: "Reconciliation as a role", body: "A reconciliation-terminal charter and the git conventions now live in the repo: one live session per worktree, the main checkout never on a feature branch, shared namespaces single-writer, and a stop point to open the PR the same hour. It answers sessions colliding on one checkout, not branches failing to merge." },
    { date: "2026-09-12", title: "Sessions, not branches", body: "Three Claude sessions sharing one working checkout, caught from the inside: a reconciliation pass stashed a sibling session's uncommitted work, watched a branch tip move three times between two commands, and found the main checkout sitting on another session's feature branch. The failure was never branches refusing to merge — it was sessions colliding on one checkout, and that diagnosis is what made the reconciliation rules necessary." },
    { date: "2026-09-12", title: "Telemetry that cannot conflict", body: "The build-session Stop hook writes one shard per session instead of appending every worktree to a single tracked ledger — the one file guaranteed to conflict, and fourteen churn commits a month. The legacy ledger is frozen history; readers read both." },
    { date: "2026-09-12", title: "ADR correction + extractor self-test", body: "The build-quality judge caught ADR-8 Increment 1 claiming a scope it had never held. The fix struck the false claim in place rather than rewriting the record, dropped the unconsumed graph edges, and added a self-test so the extractor cannot regress silently — rebuild fell from about five seconds to a fifth of one." },
    { date: "2026-07-31", title: "Toolbox generator", body: "A drift-proof generator scans the live skill, agent, and command set — the counts on this site regenerate from source instead of being hand-typed." },
    { date: "2026-07-30", title: "Live operator dashboards", body: "A dedicated telemetry project now backs the /ops surfaces: build-rigor on /ops/rigor and the market-intelligence feed on /ops/market-intel." },
    { date: "2026-07-17", title: "Cross-provider judge", body: "The build-quality judge became a two-provider quorum — a Claude seat plus an independent Gemini seat — so it can't just prefer its own family's work." },
    { date: "2026-06-25", title: "Build-rigor + measurement layer", body: "A definition-of-done gate and build-session telemetry: every non-trivial build leaves a durable trace instead of shipping on green checks." },
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
