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

// Hill-chart stage (Shape Up): "uphill" = still figuring out the approach, unknowns open;
// "downhill" = approach settled, executing. Only meaningful for work not yet done.
export const HillStage = z.enum(["uphill", "downhill"]);

const Milestone = z
  .object({
    title: Text,
    status: MilestoneStatus,
    date: IsoDate.optional(),
    note: Text.optional(),
    hill: HillStage.optional(),
  })
  .strict()
  .refine((m) => !m.hill || m.status === "active" || m.status === "next", {
    message: "hill stage applies only to active or next milestones",
  });

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
// An open item is an ask when it carries a needed-by date: what is needed, from whom, by when,
// what it unblocks, and the recommended answer (a report without a framed ask is just a log).
const OpenQuestion = z
  .object({
    question: Text,
    owner: Text,
    needBy: IsoDate.optional(),
    unblocks: Text.optional(),
    recommendation: Text.optional(),
  })
  .strict();
const Risk = z.object({ risk: Text, mitigation: Text }).strict();
// RAID's "A": an assumption the plan rests on, and how it gets tested.
const Assumption = z.object({ assumption: Text, test: Text }).strict();
// Owner — action — date: one named owner per step, never a team.
const NextStep = z.object({ action: Text, owner: Text, due: IsoDate }).strict();
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
    phase: Text,
    owner: Text,
    started: IsoDate,
    target: IsoDate.optional(),
    completed: IsoDate.optional(),
    updated: IsoDate,
    // Bottom line up front: the status in a few sentences, and why the health is what it is.
    bottomLine: Text.max(480).optional(),
    healthReason: Text.max(280).optional(),
    pathToGreen: Text.max(280).optional(),
    why: Text,
    mission: Text,
    destination: Text,
    showcase: z.array(Text).min(1).max(5),
    milestones: z.array(Milestone).min(1),
    metrics: z.array(Metric).default([]),
    decisions: z.array(Decision).default([]),
    open: z.array(OpenQuestion).default([]),
    risks: z.array(Risk).default([]),
    assumptions: z.array(Assumption).default([]),
    nextSteps: z.array(NextStep).max(6, "next steps are the next few moves, not a backlog").default([]),
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
    if (p.pathToGreen && p.health === "on-track") {
      throw new Error(`projects/${file}: pathToGreen is for at-risk or off-track projects`);
    }
    if (p.updated < p.started) throw new Error(`projects/${file}: updated is before started`);
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
