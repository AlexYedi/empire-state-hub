// Pure helpers for /ops/todos (no server-only, no Next imports) so node --test can run them directly.
// Two jobs: parse the carry-over description template, and bucket issues by due date in New York time.
//
// The template, as filed on carry-over issues:
//   **Who:** …   **What:** …   **When:** …   **Why:** …   **Context:** …
// Bold is optional (`Who:`, `**Who**:`, `- **Who:**` all parse). A field runs until the next field
// marker or a blank line. When the template is absent the caller gets a fallback built from the issue
// itself plus `templateMissing: true`, which the page shows as an amber nudge rather than hiding.

export type TemplateField = "who" | "what" | "when" | "why" | "context";
export const TEMPLATE_FIELDS: TemplateField[] = ["who", "what", "when", "why", "context"];

export type ContextLink = { label: string; href: string };

export type ParsedTemplate = {
  who: string | null;
  what: string | null;
  when: string | null;
  why: string | null;
  context: string | null;
  links: ContextLink[];
  missing: TemplateField[];
};

const MARKER =
  /^\s*(?:[-*+]\s+)?(?:\*\*|__)?\s*(who|what|when|why|context)\s*(?:\*\*|__)?\s*:\s*(?:\*\*|__)?\s*(.*)$/i;

/** Parse the template. Returns null when it isn't there (no What, or fewer than two fields). */
export function parseTemplate(text: string | null | undefined): ParsedTemplate | null {
  if (!text) return null;
  const found: Partial<Record<TemplateField, string[]>> = {};
  let current: TemplateField | null = null;
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const m = MARKER.exec(line);
    if (m) {
      current = m[1].toLowerCase() as TemplateField;
      if (!found[current]) found[current] = [m[2]];
      else current = null; // first occurrence wins; ignore repeats
      continue;
    }
    if (!current) continue;
    if (line.trim() === "") {
      current = null;
      continue;
    }
    found[current]!.push(line.trim());
  }
  const value = (f: TemplateField) => {
    const v = found[f]?.join(" ").trim();
    return v ? v : null;
  };
  const text_ = (f: TemplateField) => {
    const v = value(f);
    return v ? plainText(v) : null;
  };
  const out = {
    who: text_("who"),
    what: text_("what"),
    when: text_("when"),
    why: text_("why"),
    context: value("context"), // kept raw: links are extracted from it
  };
  const present = TEMPLATE_FIELDS.filter((f) => found[f] !== undefined);
  if (!out.what || present.length < 2) return null;
  return {
    ...out,
    links: extractLinks(out.context ?? ""),
    missing: TEMPLATE_FIELDS.filter((f) => out[f] === null),
  };
}

/** Render-safe plain text: markdown links → their text, inline code/bold markers and escapes dropped. */
export function plainText(md: string): string {
  return md
    .replace(/\[([^\]]*)\]\(<?[^)>\s]+>?\)/g, "$1")
    .replace(/(\*\*|__|`)/g, "")
    .replace(/\\([~*_\[\]()#>`-])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pick the most recent comment whose body carries the template. */
export function parseFromComments(
  comments: { body: string; createdAt: string }[],
): ParsedTemplate | null {
  const newestFirst = [...comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const c of newestFirst) {
    const parsed = parseTemplate(c.body);
    if (parsed) return parsed;
  }
  return null;
}

// Markdown links, including Linear's angle-bracket form [x](<https://…>), then bare URLs and /commands.
const MD_LINK = /\[([^\]]*)\]\(<?([^)>\s]+)>?\)/g;
const BARE_URL = /https?:\/\/[^\s)<>\]]+/g;
const SLASH_CMD = /(?:^|[\s(])(\/[a-z][a-z0-9-]+)(?=[\s,.;)]|$)/g;

export function extractLinks(text: string): ContextLink[] {
  const links: ContextLink[] = [];
  const seen = new Set<string>();
  const add = (href: string, text?: string) => {
    const clean = href.replace(/[.,;:]+$/, "");
    if (seen.has(clean)) return;
    seen.add(clean);
    links.push({ href: clean, label: labelFor(clean, text) });
  };
  let rest = text.replace(MD_LINK, (_, label: string, href: string) => {
    add(href, label);
    return " ";
  });
  rest = rest.replace(BARE_URL, (url) => {
    add(url);
    return " ";
  });
  for (const m of rest.matchAll(SLASH_CMD)) {
    const cmd = m[1];
    if (!seen.has(cmd)) {
      seen.add(cmd);
      links.push({ href: cmd, label: cmd });
    }
  }
  return links;
}

function labelFor(href: string, text?: string): string {
  if (href.startsWith("/")) return href;
  let host = "";
  let path = "";
  try {
    const u = new URL(href);
    host = u.hostname.replace(/^www\./, "");
    path = u.pathname;
  } catch {
    return text || href;
  }
  const linearIssue = /^\/[^/]+\/issue\/([A-Z]+-\d+)/.exec(path);
  if (host === "linear.app" && linearIssue) return linearIssue[1];
  if (host.endsWith("notion.so") || host.endsWith("notion.com") || host.endsWith("notion.site"))
    return "Notion";
  const pr = /^\/[^/]+\/[^/]+\/pull\/(\d+)/.exec(path);
  if (host === "github.com" && pr) return `PR #${pr[1]}`;
  if (host === "github.com") return "GitHub";
  if (text && !/^https?:\/\//.test(text)) return text.length > 40 ? text.slice(0, 39) + "…" : text;
  return host + (path && path !== "/" ? path : "");
}

// ---------- dates (America/New_York) ----------

export const TZ = "America/New_York";
export type Group = "overdue" | "today" | "week" | "later" | "none";
export const GROUPS: { key: Group; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "later", label: "Later" },
  { key: "none", label: "No date" },
];

/** YYYY-MM-DD for `now` as a New York wall-clock date. */
export function nyDate(now: Date, tz = TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD calendar dates). */
export function dayDiff(from: string, to: string): number {
  const ms = Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z");
  return Math.round(ms / 86_400_000);
}

/** Linear's dueDate is a plain calendar date. "This week" = the next 6 days after today (rolling). */
export function groupFor(dueDate: string | null | undefined, today: string): Group {
  if (!dueDate) return "none";
  const d = dayDiff(today, dueDate);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 6) return "week";
  return "later";
}

export function relativeDue(dueDate: string | null | undefined, today: string): string {
  if (!dueDate) return "";
  const d = dayDiff(today, dueDate);
  if (d === 0) return "today";
  if (d < 0) return `${-d}d overdue`;
  return `in ${d}d`;
}

/** On time = completed on or before its due date (New York calendar day). */
export function onTimeRate(
  completed: { dueDate: string | null; completedAt: string }[],
  minN = 5,
): { n: number; onTime: number; pct: number | null } {
  const dated = completed.filter((c) => c.dueDate);
  const onTime = dated.filter((c) => nyDate(new Date(c.completedAt)) <= (c.dueDate as string)).length;
  const n = dated.length;
  return { n, onTime, pct: n >= minN ? Math.round((onTime / n) * 100) : null };
}
