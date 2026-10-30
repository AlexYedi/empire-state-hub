// Builds — the public /builds portfolio. Parsed at import, so a malformed export
// fails the build instead of rendering something wrong. No Notion import here by
// design: public pages read only the committed, reviewed JSON.
import { z } from "zod";
import data from "@/data/builds.json";

export const BuildSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
    .optional(),
  event: z.string().optional(),
  oneLine: z.string().optional(),
  repoUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
  stack: z.array(z.string()),
});

export type Build = z.infer<typeof BuildSchema>;

const BuildsFileSchema = z.object({ builds: z.array(BuildSchema) });

const FILE = BuildsFileSchema.parse(data);

// Newest first; a build with no date yet sorts last rather than inventing one.
function byDateDesc(a: Build, b: Build): number {
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return b.date.localeCompare(a.date);
}

export const BUILDS: Build[] = [...FILE.builds].sort(byDateDesc);
