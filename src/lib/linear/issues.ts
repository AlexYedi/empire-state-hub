import "server-only";
import { unstable_cache } from "next/cache";
import { LinearClient } from "@linear/sdk";
import type { LinearState } from "@/lib/system-map/schema";

// Live state for a named set of issues (the system map's build path). Linear stays the source of
// truth for "what's open": the map never restates an issue's state, it reads it. Returns null when
// the key is absent or the API fails, and the page says so instead of guessing.
async function fetchIssues(identifiers: string[]): Promise<LinearState[] | null> {
  if (!process.env.LINEAR_API_KEY) return null;
  try {
    const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
    const teamKey = process.env.LINEAR_TEAM_KEY ?? "YED";
    const numbers = identifiers.map((i) => Number(i.split("-")[1])).filter((n) => Number.isFinite(n));
    const page = await linear.issues({
      first: 100,
      filter: { team: { key: { eq: teamKey } }, number: { in: numbers } },
    });
    const out: LinearState[] = [];
    for (const issue of page.nodes) {
      const state = await issue.state;
      out.push({
        identifier: issue.identifier,
        title: issue.title,
        state: state?.name ?? "—",
        stateType: state?.type ?? "",
        priorityLabel: issue.priorityLabel ?? "No priority",
        url: issue.url,
      });
    }
    return out;
  } catch {
    return null;
  }
}

export const getIssues = (identifiers: string[]) =>
  unstable_cache(() => fetchIssues(identifiers), ["linear-issues", identifiers.join(",")], {
    revalidate: 300,
    tags: ["linear-issues"],
  })();
