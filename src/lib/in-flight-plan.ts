// The plan above the In Flight cards: why the tracks are the tracks. One committed JSON file,
// src/data/in-flight-plan.json, rewritten only when the track set is re-charted (not per milestone).
// Same contract as projects.ts: parsed at build, a malformed file fails the build.
// Server-only (node:fs). Client components import types from here, never values.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dates are YYYY-MM-DD");
const Text = z.string().trim().min(1);
const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const PlanSchema = z
  .object({
    charted: IsoDate,
    horizon: IsoDate,
    headline: Text.max(140),
    approach: z.array(Text).min(1).max(5),
    principles: z.array(z.object({ title: Text, text: Text }).strict()).max(6).default([]),
    tracks: z.array(z.object({ slug: Slug, role: Text.max(200) }).strict()).min(1).max(6),
    calendar: z.array(z.object({ week: Text, focus: Text, dead: z.boolean().default(false) }).strict()).max(10).default([]),
    parked: z.array(z.object({ item: Text, until: Text }).strict()).max(12).default([]),
  })
  .strict();

export type InFlightPlan = z.infer<typeof PlanSchema>;

const PLACEHOLDER = /\[confirm\]|\bTODO\b|\bTBD\b|lorem ipsum/i;

export function getInFlightPlan(): InFlightPlan | undefined {
  let raw: string;
  try {
    raw = readFileSync(join(process.cwd(), "src/data/in-flight-plan.json"), "utf8");
  } catch {
    return undefined;
  }
  if (PLACEHOLDER.test(raw)) throw new Error("in-flight-plan.json: placeholder marker in public data");
  const parsed = PlanSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`in-flight-plan.json: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  }
  return parsed.data;
}
