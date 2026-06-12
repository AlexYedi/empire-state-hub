import "server-only";
import { unstable_cache } from "next/cache";
import { LinearClient } from "@linear/sdk";

export type BacklogIssue = {
  id: string;
  identifier: string;
  title: string;
  state: string;
  stateType: string;
  priority: number;
  priorityLabel: string;
  project: string | null;
  url: string;
};

async function fetchBacklog(): Promise<BacklogIssue[]> {
  const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
  const teamKey = process.env.LINEAR_TEAM_KEY ?? "YED";

  const page = await linear.issues({
    first: 100,
    filter: { team: { key: { eq: teamKey } } },
  });

  const issues: BacklogIssue[] = [];
  for (const issue of page.nodes) {
    const [state, project] = await Promise.all([issue.state, issue.project]);
    const stateType = state?.type ?? "";
    if (stateType === "completed" || stateType === "canceled") continue;
    issues.push({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      state: state?.name ?? "—",
      stateType,
      priority: issue.priority ?? 0,
      priorityLabel: issue.priorityLabel ?? "No priority",
      project: project?.name ?? null,
      url: issue.url,
    });
  }

  // Urgent (1) first; "No priority" (0) sinks to the bottom.
  return issues.sort((a, b) => {
    const rank = (n: number) => (n === 0 ? 99 : n);
    return rank(a.priority) - rank(b.priority);
  });
}

export const getBacklog = unstable_cache(fetchBacklog, ["linear-backlog"], {
  revalidate: 180,
  tags: ["linear-backlog"],
});
