// Projects in flight (E-11): mission control for sprints, projects and sub-projects.
// One committed JSON file per project in src/data/projects/<slug>.json, so each working
// session edits only its own file. Parsed at build, same idiom as rooms/themes: a malformed
// or rule-breaking file fails the build instead of rendering something wrong.
//
// The rules the schema enforces are the page's contract, not style:
//   - every metric carries its do-nothing baseline (a number without one is noise);
//   - an archived project carries its completion date; a live one does not;
//   - the log holds milestone-level updates only (max 8), not every PR;
//   - no placeholder markers in public data (AGENTS.md rule 5).
// Server-only (node:fs). Client components import types from here, never values.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const DIR = join(process.cwd(), "src/data/projects");

const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dates are YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, "not a real calendar date");
// The Linear workspace is private: IDs go in `tracking` as plain text, never as links.
const Url = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), "links must be https")
  .refine((u) => !/^https:\/\/([^/]*\.)?linear\.app\//.test(u), "don't link the private Linear workspace");
const Text = z.string().trim().min(1);

const Source = z.object({ label: Text, url: Url.optional() }).strict();

export const MilestoneStatus = z.enum(["done", "active", "next", "later"]);

// Hill-chart certainty (Shape Up): is the approach still being worked out, or known and executing?
// More honest than percent-complete while unknowns remain.
export const Certainty = z.enum(["figuring-out", "executing"]);

const Milestone = z
  .object({
    title: Text,
    status: MilestoneStatus,
    date: IsoDate.optional(),
    // Planned date for unfinished work, so a slip is visible.
    target: IsoDate.optional(),
    certainty: Certainty.optional(),
    note: Text.optional(),
  })
  .strict();

// Null-baseline rule: `baseline` is required. What the number was (or would be) with no build.
const Metric = z
  .object({
    label: Text,
    baseline: Text,
    current: Text,
    target: Text.optional(),
    asOf: IsoDate,
    source: Source,
    note: Text.optional(),
  })
  .strict();

const Decision = z.object({ date: IsoDate, decision: Text, why: Text }).strict();
const OpenQuestion = z.object({ question: Text, owner: Text }).strict();
const Level = z.enum(["low", "medium", "high"]);
const Risk = z
  .object({ risk: Text, mitigation: Text, likelihood: Level.optional(), impact: Level.optional() })
  .strict();

// Status-report layer (best practice: BLUF, decisions needed, RAID, delta since last update).
// All optional so existing pages stay valid; the page renders each block only when present.
export const Trend = z.enum(["improving", "steady", "worsening"]);
// A decision the owner must make, framed DACI-style: a recommendation, an owner and a deadline,
// the cost of waiting, and whether it is a two-way door (reversible) or a one-way door.
const Ask = z
  .object({
    decision: Text,
    recommendation: Text,
    options: z.array(Text).max(3).default([]),
    owner: Text,
    due: IsoDate.optional(),
    costOfDelay: Text,
    reversible: z.boolean(),
  })
  .strict();
const Change = z.object({ kind: z.enum(["done", "changed", "slipped", "learned"]), text: Text }).strict();
// Issues are risks that already happened: they need an action and an owner now.
const Issue = z.object({ issue: Text, impact: Text, action: Text, owner: Text }).strict();
const Dependency = z
  .object({ on: Text, need: Text, status: z.enum(["waiting", "in-progress", "met"]) })
  .strict();
const LogEntry = z.object({ date: IsoDate, text: Text }).strict();
const Link = z.object({ label: Text, url: Url }).strict();

export const ProjectSchema = z
  .object({
    slug: Slug,
    title: Text,
    tagline: Text.max(160),
    kind: z.enum(["project", "sprint", "sub-project"]),
    parent: Slug.optional(),
    status: z.enum(["active", "blocked", "paused", "archived"]),
    health: z.enum(["on-track", "at-risk", "off-track"]),
    // The objective reason for the health call, so the colour can't drift from the facts.
    healthWhy: Text.optional(),
    trend: Trend.optional(),
    // The owner's confidence in hitting the target, e.g. "55%: moderately confident".
    confidence: Text.optional(),
    // Bottom line up front: on track or not, how serious, and what's needed from the reader.
    summary: Text.optional(),
    asks: z.array(Ask).default([]),
    sinceLast: z
      .object({ since: IsoDate, changes: z.array(Change).min(1).max(8) })
      .strict()
      .optional(),
    issues: z.array(Issue).default([]),
    dependencies: z.array(Dependency).default([]),
    phase: Text,
    owner: Text,
    started: IsoDate,
    target: IsoDate.optional(),
    completed: IsoDate.optional(),
    updated: IsoDate,
    why: Text,
    mission: Text,
    destination: Text,
    showcase: z.array(Text).min(1).max(5),
    milestones: z.array(Milestone).min(1),
    metrics: z.array(Metric).default([]),
    decisions: z.array(Decision).default([]),
    open: z.array(OpenQuestion).default([]),
    risks: z.array(Risk).default([]),
    log: z.array(LogEntry).max(8, "the log is milestone-level: keep the latest 8").default([]),
    links: z.array(Link).default([]),
    tracking: z.array(z.string().regex(/^[A-Z]+-\d+$/)).default([]),
    stack: z.array(Text).default([]),
  })
  .strict();

export type Project = z.infer<typeof ProjectSchema>;
export type Milestone = z.infer<typeof Milestone>;
export type Metric = z.infer<typeof Metric>;

const PLACEHOLDER = /\[confirm\]|\bTODO\b|\bTBD\b|lorem ipsum/i;

/** Every string value in the parsed file, so an escaped marker can't slip past the check. */
function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === "object") return Object.values(v).flatMap(strings);
  return [];
}

function load(): Project[] {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
  const projects = files.map((file) => {
    const json: unknown = JSON.parse(readFileSync(join(DIR, file), "utf8"));
    if (strings(json).some((s) => PLACEHOLDER.test(s))) {
      throw new Error(`projects/${file}: placeholder marker in public data`);
    }
    const parsed = ProjectSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`projects/${file}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    }
    const p = parsed.data;
    if (`${p.slug}.json` !== file) throw new Error(`projects/${file}: slug "${p.slug}" must match the file name`);
    if (p.status === "archived" && !p.completed) throw new Error(`projects/${file}: archived needs a completed date`);
    if (p.status !== "archived" && p.completed) throw new Error(`projects/${file}: only archived projects carry completed`);
    if (p.updated < p.started) throw new Error(`projects/${file}: updated is before started`);
    if (p.sinceLast && p.sinceLast.since > p.updated) {
      throw new Error(`projects/${file}: sinceLast.since is after updated`);
    }
    // Anti-watermelon: a live project that isn't on track says why, in objective terms.
    if (p.status === "active" && p.health !== "on-track" && p.summary && !p.healthWhy) {
      throw new Error(`projects/${file}: a ${p.health} project with a summary needs healthWhy`);
    }
    if (p.completed && p.completed < p.started) throw new Error(`projects/${file}: completed is before started`);
    if ((p.kind === "sub-project") !== Boolean(p.parent)) {
      throw new Error(`projects/${file}: a sub-project names its parent, and only a sub-project does`);
    }
    return p;
  });

  const bySlug = new Map(projects.map((p) => [p.slug, p]));
  for (const p of projects) {
    if (!p.parent) continue;
    const parent = bySlug.get(p.parent);
    // Sub-projects are one level deep, so there are no chains and no cycles.
    if (!parent || parent.slug === p.slug || parent.parent) {
      throw new Error(`projects/${p.slug}.json: parent "${p.parent}" must be an existing top-level project`);
    }
  }
  return projects.map((p) => ({ ...p, log: [...p.log].sort((a, b) => b.date.localeCompare(a.date)) }));
}

const PROJECTS = load();

const STATUS_ORDER = { active: 0, blocked: 1, paused: 2, archived: 3 } as const;

/** Live work first (active, blocked, paused), most recently updated first; then the archive. */
export function getProjects(): Project[] {
  return [...PROJECTS].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (b.completed ?? b.updated).localeCompare(a.completed ?? a.updated),
  );
}

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

export function getChildren(slug: string): Project[] {
  return getProjects().filter((p) => p.parent === slug);
}
