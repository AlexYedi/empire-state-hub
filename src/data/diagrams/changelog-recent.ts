// Figures for the September changelog entries. Ground truth: pipeline repo
// .claude/references/reconciliation-terminal-charter.md, hooks/build-session-emit.sh (YED-159 shards),
// ADR-7 (inbox miner), ADR-8 + Amendment 2 (system graph, check-refs defects), ADR-6 + the 09-11 journal.
import type { DiagramSpec } from "@/components/diagram/types";
import { n } from "./helpers";

export const RECENT_FIGURES = {
  "reconciliation-charter": {
    type: "gate",
    pre: [n("inspect", "inspect real state", { sub: "fetch · rev-parse" })],
    gate: n("quiesced", "Others idle?"),
    yes: {
      label: "yes",
      steps: [
        n("stop", "at a stop point"),
        n("merge", "gh pr merge", { accent: true, sub: "server-side" }),
        n("sync", "pull --ff-only"),
      ],
    },
    no: { label: "a tip moved", steps: [n("hold", "hold — don't act", { accent: true })] },
    caption:
      "One terminal owns convergence, and it merges rather than builds. The charter lets it act only once every other session has pushed and gone idle; a branch tip that moves between two checks means someone is still live, so it holds.",
  },

  "sessions-not-branches": {
    type: "compare",
    left: {
      title: "What broke · one shared checkout",
      spec: {
        type: "graph",
        width: 400,
        aspect: 0.7,
        nodes: [
          { ...n("s1", "session 1", { kind: "pill" }), x: 0, y: 0 },
          { ...n("s2", "session 2", { kind: "pill" }), x: 50, y: 0 },
          { ...n("s3", "session 3", { kind: "pill" }), x: 100, y: 0 },
          { ...n("co", "main checkout", { kind: "store", accent: true, sub: "on a feature branch" }), x: 50, y: 100 },
        ],
        edges: [
          { from: "s1", to: "co", label: "stash" },
          { from: "s2", to: "co", label: "checkout" },
          { from: "s3", to: "co", label: "commit" },
        ],
      },
    },
    right: {
      title: "The rule · a worktree per session",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          [n("s1", "session 1", { kind: "pill" }), n("s2", "session 2", { kind: "pill" }), n("s3", "session 3", { kind: "pill" })],
          [n("w1", "worktree", { kind: "store" }), n("w2", "worktree", { kind: "store" }), n("w3", "worktree", { kind: "store" })],
          n("main", "main", { accent: true, sub: "via PR, same hour" }),
        ],
      },
    },
    caption:
      "The failure was never branches refusing to merge; it was three sessions sharing one checkout. A reconciliation pass stashed a sibling's uncommitted work and watched a branch tip move three times between two commands. Now each live session has its own worktree and reaches main only through a PR.",
  },

  "telemetry-shards": {
    type: "compare",
    left: {
      title: "Before · one tracked ledger",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          [n("a", "worktree A", { kind: "pill" }), n("b", "worktree B", { kind: "pill" }), n("c", "worktree C", { kind: "pill" })],
          n("ledger", "build-sessions.jsonl", { kind: "store", accent: true, sub: "every stop appends" }),
          n("conflict", "merge conflict", { sub: "14 churn commits/month" }),
        ],
      },
    },
    right: {
      title: "After · a shard per session",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          [n("a", "worktree A", { kind: "pill" }), n("b", "worktree B", { kind: "pill" }), n("c", "worktree C", { kind: "pill" })],
          [n("sa", "a.jsonl", { kind: "store" }), n("sb", "b.jsonl", { kind: "store" }), n("sc", "c.jsonl", { kind: "store" })],
          n("union", "merge = union of files", { accent: true, sub: "readers read both" }),
        ],
      },
    },
    caption:
      "Every session's Stop hook used to append to one tracked file, which made it the one change guaranteed to conflict. Each session now writes its own file, so merging worktrees is a union that can't collide; the old ledger stays as frozen history and readers read both.",
  },

  "adr8-correction": {
    type: "flow",
    steps: [
      n("inc1", "ADR-8 Increment 1", { kind: "pill", sub: 'claimed "scope held"' }),
      [n("sonnet", "Sonnet seat", { accent: true, sub: "0.55 · flagged" }), n("gemini", "Gemini seat", { sub: "1.0 · passed" })],
      n("split", "Split", { kind: "diamond" }),
      [
        n("strike", "strike the false claim", { accent: true, sub: "in place, still visible" }),
        n("delete", "delete unread edges", { sub: "~5s → 0.2s rebuild" }),
        n("selftest", "add --selftest", { sub: "can't regress silently" }),
      ],
    ],
    caption:
      "The judge's seats split on ADR-8's first increment, and the flagging seat was right: the graph stored edge types nothing read. The fix deleted them, struck the false claim where the record still shows it rather than rewriting history, and added a self-test.",
  },

  "graph-watches": {
    type: "compare",
    left: {
      title: "Before · invoked",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("mv", "a file is renamed", { kind: "pill" }),
          [n("ran", "someone runs the check"), n("nobody", "nobody does", { kind: "ghost" })],
          [n("found", "broken refs found"), n("unseen", "drift goes unseen", { kind: "ghost" })],
        ],
      },
    },
    right: {
      title: "After · triggered",
      spec: {
        type: "flow",
        vertical: true,
        steps: [
          n("mv", "a file is renamed", { kind: "pill" }),
          n("hook", "SessionStart hook", { accent: true, sub: "no one invokes it" }),
          n("rebuild", "rebuild system graph", { sub: "stdlib · zero tokens" }),
          n("findings", "≤5 findings", { kind: "store" }),
          n("context", "in the next session's context", { accent: true }),
        ],
      },
    },
    caption:
      "Every rigor control used to be a command someone had to remember. The system graph now rebuilds on session start and stop, so an ordinary rename surfaced at the next session start naming all three files that still cited the old path, with nobody running anything.",
  },

  "ref-check-templates": {
    type: "gate",
    pre: [n("line", "a line with references", { kind: "pill" })],
    gate: n("template", "Path template?"),
    yes: {
      label: "{slug}",
      steps: [n("skip", "skip that token only"), n("rest", "keep checking the line", { accent: true })],
    },
    no: { label: "real path", steps: [n("exists", "file exists?"), n("report", "report if missing")] },
    caption:
      "The first bug reported templates like evolution-log-{slug}.md as missing files, capping the judge's score over references that were never broken. The first fix over-corrected and skipped whole lines, hiding real breaks beside a template. Now only the template token is skipped, and a self-test holds the checker and the graph extractor to the same rule.",
  },

  "inbox-miner": {
    type: "flow",
    vertical: true,
    steps: [
      n("a", "Stage A · one-time discovery", { kind: "pill", sub: "sender · subject · frequency — no bodies" }),
      n("allow", "allowlist", { kind: "store", accent: true, sub: "Alex curates" }),
      n("b", "Stage B · allowlisted bodies only"),
      n("filter", "signal filter", { sub: "drops marketing · transactional · personal" }),
      n("extract", "structured extraction", { sub: "no write tools" }),
      n("dedup", "dedup on the resolved URL", { accent: true, sub: "after following redirects" }),
      n("approve", "approve before write", { kind: "pill" }),
      n("graph", "event rows", { kind: "store", sub: "launch · market · funding · exec_move" }),
    ],
    caption:
      "The miner doesn't read mail bodies by default: a metadata-only pass bootstraps an allowlist, and only allowlisted senders are read. Signals are deduplicated on the article's real URL after following tracking redirects, so one story cited by four newsletters lands once — and every write waits for approval.",
  },

  "event-post-arc": {
    type: "graph",
    aspect: 0.4,
    nodes: [
      { ...n("brief", "research brief", { kind: "store", sub: "one Content Draft" }), x: 0, y: 50 },
      { ...n("pre", "pre-event post", { sub: "macro → micro → implications" }), x: 34, y: 6 },
      { ...n("event", "the event", { kind: "pill" }), x: 67, y: 6 },
      { ...n("post", "post-event post", { accent: true, sub: "resolves the setup" }), x: 100, y: 50 },
    ],
    edges: [
      { from: "brief", to: "pre", label: "sets the table" },
      { from: "pre", to: "event" },
      { from: "event", to: "post", label: "what was said" },
      { from: "brief", to: "post", label: "Pre→Post gap", dashed: true },
    ],
    caption:
      "The two per-event posts became one deliberate arc. The pre-event post frames the topic without resolving it; the post-event post cashes that setup against what was actually said and argued, mining the gap the brief recorded between expectation and the room.",
  },
} satisfies Record<string, DiagramSpec>;
