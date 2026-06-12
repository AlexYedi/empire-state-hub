import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { queryAllRows } from "./notion/client";
import { DB } from "./notion/databases";
import { numberValue, selectName, titleText } from "./notion/property";

export const ProjectIdeaSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().nullable(),
  proposalType: z.string().nullable(),
  complexity: z.string().nullable(),
  composite: z.number().nullable(),
});
export type ProjectIdea = z.infer<typeof ProjectIdeaSchema>;

async function fetchProjectIdeas(): Promise<ProjectIdea[]> {
  const rows = await queryAllRows(DB.projectIdeas);
  return rows
    .map((row) => {
      const p = row.properties;
      return ProjectIdeaSchema.parse({
        id: row.id,
        name: titleText(p["Project Name"]) || "(untitled)",
        status: selectName(p["Status"]),
        proposalType: selectName(p["Proposal Type"]),
        complexity: selectName(p["Complexity Band"]),
        composite: numberValue(p["Composite Score"]),
      });
    })
    .sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0));
}

export const getProjectIdeas = unstable_cache(fetchProjectIdeas, ["project-ideas"], {
  revalidate: 300,
  tags: ["project-ideas"],
});
