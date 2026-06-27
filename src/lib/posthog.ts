import "server-only";
import { unstable_cache } from "next/cache";

// Read-only PostHog client for the /ops rigor dashboard (US-6 / YED-92).
// Queries build_session telemetry (emitted by Take-3's build-session-emit.sh hook) via the
// HogQL query API. Uses the personal (phx_) key — query/read only; never reaches the browser.
const HOST = process.env.POSTHOG_HOST ?? "https://us.posthog.com";
const PROJECT = process.env.POSTHOG_PROJECT_ID;
const KEY = process.env.POSTHOG_API_KEY; // phx_ personal key (query API)

export type BuildTelemetry = {
  available: boolean; // false if unconfigured or the query failed — render a graceful placeholder
  sessions: number; // build_session events, last 30d
  buildSessions: number; // those that touched .claude/{skills,agents,commands,hooks}
  avgUserPrompts: number | null; // friction proxy (feedback rounds / session)
  avgToolUses: number | null;
  totalOutputTokens: number | null;
  lastSeen: string | null;
};

const EMPTY: BuildTelemetry = {
  available: false,
  sessions: 0,
  buildSessions: 0,
  avgUserPrompts: null,
  avgToolUses: null,
  totalOutputTokens: null,
  lastSeen: null,
};

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

async function fetchBuildTelemetry(): Promise<BuildTelemetry> {
  if (!PROJECT || !KEY) return EMPTY;
  // HogQL: aggregate build_session events. Property access is `properties.<name>`.
  const query = `
    SELECT
      count() AS sessions,
      countIf(properties.build_dir_touched = true) AS build_sessions,
      round(avg(toFloat(properties.user_prompts))) AS avg_user_prompts,
      round(avg(toFloat(properties.tool_uses))) AS avg_tool_uses,
      sum(toFloat(properties.output_tokens)) AS total_output_tokens,
      max(timestamp) AS last_seen
    FROM events
    WHERE event = 'build_session' AND timestamp > now() - INTERVAL 30 DAY`;
  try {
    const res = await fetch(`${HOST}/api/projects/${PROJECT}/query/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    });
    if (!res.ok) return EMPTY;
    const data = (await res.json()) as { results?: unknown[][] };
    const row = data.results?.[0];
    if (!row) return { ...EMPTY, available: true };
    return {
      available: true,
      sessions: Number(row[0] ?? 0),
      buildSessions: Number(row[1] ?? 0),
      avgUserPrompts: num(row[2]),
      avgToolUses: num(row[3]),
      totalOutputTokens: num(row[4]),
      lastSeen: (row[5] as string) ?? null,
    };
  } catch {
    return EMPTY;
  }
}

/** Cached 60s — keeps the PostHog query API off the per-request path. */
export const getBuildTelemetry = unstable_cache(fetchBuildTelemetry, ["build-telemetry"], {
  revalidate: 60,
  tags: ["build-telemetry"],
});

// --- Build-quality judge runs (projected from Take-3's .claude/evals/logs via emit-judge-runs.sh) ---
export type JudgeQuality = {
  available: boolean;
  runs: number;
  avgScore: number | null;
  passRate: number | null; // 0..1
  lastScore: number | null;
  lastVerdict: string | null;
  acked: number; // how many runs Alex has acked (calibration sample size)
  ackAgreement: number | null; // agreements / acked — judge is advisory until >=0.8 over ~20
};

const EMPTY_JUDGE: JudgeQuality = {
  available: false,
  runs: 0,
  avgScore: null,
  passRate: null,
  lastScore: null,
  lastVerdict: null,
  acked: 0,
  ackAgreement: null,
};

async function fetchJudgeQuality(): Promise<JudgeQuality> {
  if (!PROJECT || !KEY) return EMPTY_JUDGE;
  const query = `
    SELECT
      count() AS runs,
      round(avg(toFloat(properties.weighted_score)), 3) AS avg_score,
      countIf(properties.verdict = 'pass') AS passes,
      argMax(toFloat(properties.weighted_score), timestamp) AS last_score,
      argMax(properties.verdict, timestamp) AS last_verdict,
      countIf(properties.acked = true) AS acked,
      countIf(properties.ack_agree = true) AS ack_agree
    FROM events
    WHERE event = 'judge_run' AND timestamp > now() - INTERVAL 180 DAY`;
  try {
    const res = await fetch(`${HOST}/api/projects/${PROJECT}/query/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    });
    if (!res.ok) return EMPTY_JUDGE;
    const data = (await res.json()) as { results?: unknown[][] };
    const row = data.results?.[0];
    if (!row) return { ...EMPTY_JUDGE, available: true };
    const runs = Number(row[0] ?? 0);
    const passes = Number(row[2] ?? 0);
    const acked = Number(row[5] ?? 0);
    const ackAgree = Number(row[6] ?? 0);
    return {
      available: true,
      runs,
      avgScore: num(row[1]),
      passRate: runs > 0 ? passes / runs : null,
      lastScore: num(row[3]),
      lastVerdict: (row[4] as string) ?? null,
      acked,
      ackAgreement: acked > 0 ? ackAgree / acked : null,
    };
  } catch {
    return EMPTY_JUDGE;
  }
}

/** Cached 60s. */
export const getJudgeQuality = unstable_cache(fetchJudgeQuality, ["judge-quality"], {
  revalidate: 60,
  tags: ["judge-quality"],
});
