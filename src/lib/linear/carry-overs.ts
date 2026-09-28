import "server-only";
import { unstable_cache } from "next/cache";
import { LinearClient } from "@linear/sdk";
import {
  parseFromComments,
  parseTemplate,
  plainText,
  type ContextLink,
  type TemplateField,
} from "./carry-over-template";

// Carry-over to-dos (label `carry-over`, team LINEAR_TEAM_KEY). Linear is the single store; this is a
// read-only view fetched per request (60s cache) and never written to src/data or git. Returns null
// when the key is absent or the API fails, and the page says so instead of guessing.

export type CarryOver = {
  identifier: string;
  title: string;
  url: string;
  dueDate: string | null;
  priority: number;
  priorityLabel: string;
  state: string;
  stateType: string;
  assignee: string | null;
  updatedAt: string;
  who: string;
  what: string;
  when: string | null;
  why: string | null;
  links: ContextLink[];
  missing: TemplateField[];
  templateMissing: boolean;
  templateSource: "description" | "comment" | null;
};

export type CarryOverData = {
  open: CarryOver[];
  completed: { identifier: string; dueDate: string | null; completedAt: string }[];
  fetchedAt: string;
};

const LABEL = "carry-over";

const OPEN_QUERY = /* GraphQL */ `
  query CarryOvers($team: String!, $label: String!) {
    issues(
      first: 100
      filter: {
        team: { key: { eq: $team } }
        labels: { name: { eq: $label } }
        state: { type: { nin: ["completed", "canceled"] } }
      }
    ) {
      nodes {
        id
        identifier
        title
        description
        dueDate
        priority
        priorityLabel
        url
        updatedAt
        state { name type }
        assignee { name displayName }
      }
    }
  }
`;

const COMMENTS_QUERY = /* GraphQL */ `
  query CarryOverComments($ids: [ID!]) {
    issues(first: 100, filter: { id: { in: $ids } }) {
      nodes {
        id
        comments(first: 5, orderBy: createdAt) { nodes { body createdAt } }
      }
    }
  }
`;

const COMPLETED_QUERY = /* GraphQL */ `
  query CarryOversDone($team: String!, $label: String!, $since: DateTimeOrDuration!) {
    issues(
      first: 100
      filter: {
        team: { key: { eq: $team } }
        labels: { name: { eq: $label } }
        completedAt: { gte: $since }
      }
    ) {
      nodes { identifier dueDate completedAt }
    }
  }
`;

type RawIssue = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: number;
  priorityLabel: string;
  url: string;
  updatedAt: string;
  state: { name: string; type: string } | null;
  assignee: { name: string; displayName: string } | null;
};

async function fetchCarryOvers(): Promise<CarryOverData | null> {
  if (!process.env.LINEAR_API_KEY) return null;
  try {
    const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
    const team = process.env.LINEAR_TEAM_KEY || "YED";
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString();

    const [openRes, doneRes] = await Promise.all([
      linear.client.rawRequest<{ issues: { nodes: RawIssue[] } }, Record<string, unknown>>(
        OPEN_QUERY,
        { team, label: LABEL },
      ),
      linear.client.rawRequest<
        { issues: { nodes: { identifier: string; dueDate: string | null; completedAt: string }[] } },
        Record<string, unknown>
      >(COMPLETED_QUERY, { team, label: LABEL, since }),
    ]);
    const raw = openRes.data?.issues.nodes ?? [];

    // Comments only for issues whose description lacks the template (e.g. filed as a comment).
    const parsedDesc = new Map(raw.map((i) => [i.id, parseTemplate(i.description)]));
    const needComments = raw.filter((i) => !parsedDesc.get(i.id)).map((i) => i.id);
    const fromComments = new Map<string, ReturnType<typeof parseFromComments>>();
    if (needComments.length) {
      const res = await linear.client.rawRequest<
        { issues: { nodes: { id: string; comments: { nodes: { body: string; createdAt: string }[] } }[] } },
        Record<string, unknown>
      >(COMMENTS_QUERY, { ids: needComments });
      for (const n of res.data?.issues.nodes ?? []) fromComments.set(n.id, parseFromComments(n.comments.nodes));
    }

    const open: CarryOver[] = raw.map((i) => {
      const assignee = i.assignee?.name || i.assignee?.displayName || null;
      const desc = parsedDesc.get(i.id) ?? null;
      const tpl = desc ?? fromComments.get(i.id) ?? null;
      const base = {
        identifier: i.identifier,
        title: i.title,
        url: i.url,
        dueDate: i.dueDate ?? null,
        priority: i.priority ?? 0,
        priorityLabel: i.priorityLabel || "No priority",
        state: i.state?.name ?? "—",
        stateType: i.state?.type ?? "",
        assignee,
        updatedAt: i.updatedAt,
      };
      if (tpl) {
        return {
          ...base,
          who: tpl.who ?? assignee ?? "—",
          what: tpl.what ?? i.title,
          when: tpl.when,
          why: tpl.why,
          links: tpl.links,
          missing: tpl.missing,
          templateMissing: false,
          templateSource: desc ? "description" : "comment",
        };
      }
      const plain = plainText(i.description ?? "");
      return {
        ...base,
        who: assignee ?? "—",
        what: i.title,
        when: null,
        why: plain ? (plain.length > 200 ? plain.slice(0, 199) + "…" : plain) : null,
        links: [],
        missing: [],
        templateMissing: true,
        templateSource: null,
      };
    });

    return {
      open,
      completed: (doneRes.data?.issues.nodes ?? []).filter((c) => c.completedAt),
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export const getCarryOvers = unstable_cache(fetchCarryOvers, ["linear-carry-overs"], {
  revalidate: 60,
  tags: ["linear-carry-overs"],
});
