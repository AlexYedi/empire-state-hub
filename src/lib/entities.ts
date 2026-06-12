import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { queryAllRows } from "./notion/client";
import { DB } from "./notion/databases";
import { titleText } from "./notion/property";

// PII discipline: People are COUNTED only — no names, emails, phones, or LinkedIn surfaced.
// Companies and Topics are public entities, so their names are safe to list.
export const EntityCountsSchema = z.object({
  people: z.number(),
  companies: z.number(),
  topics: z.number(),
  companyNames: z.array(z.string()),
  topicNames: z.array(z.string()),
});
export type EntityCounts = z.infer<typeof EntityCountsSchema>;

async function fetchEntityCounts(): Promise<EntityCounts> {
  const [people, companies, topics] = await Promise.all([
    queryAllRows(DB.people),
    queryAllRows(DB.companies),
    queryAllRows(DB.topics),
  ]);
  return EntityCountsSchema.parse({
    people: people.length,
    companies: companies.length,
    topics: topics.length,
    companyNames: companies
      .map((r) => titleText(r.properties["Company Name"]))
      .filter(Boolean)
      .sort(),
    topicNames: topics
      .map((r) => titleText(r.properties["Topic"]))
      .filter(Boolean)
      .sort(),
  });
}

export const getEntityCounts = unstable_cache(fetchEntityCounts, ["entity-counts"], {
  revalidate: 300,
  tags: ["entity-counts"],
});
