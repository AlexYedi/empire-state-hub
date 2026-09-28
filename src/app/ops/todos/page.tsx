import Link from "next/link";
import { getCarryOvers, type CarryOver } from "@/lib/linear/carry-overs";
import {
  GROUPS,
  groupFor,
  nyDate,
  onTimeRate,
  relativeDue,
  type Group,
} from "@/lib/linear/carry-over-template";

export const dynamic = "force-dynamic";

// Carry-over to-dos: a read-only view over Linear (label `carry-over`). Edits happen in Linear —
// every row links there. Filters are URL params rendered server-side: ?who= ?state= ?priority= ?group=

type Filters = { who?: string; state?: string; priority?: string; group?: string };
const FILTER_KEYS = ["who", "state", "priority", "group"] as const;

const GROUP_ACCENT: Record<Group, string> = {
  overdue: "text-rose-400",
  today: "text-amber-400",
  week: "text-sky-400",
  later: "text-muted",
  none: "text-zinc-500",
};

const PRIORITY_ACCENT: Record<number, string> = {
  1: "text-rose-400",
  2: "text-amber-400",
  3: "text-sky-400",
  4: "text-muted",
  0: "text-zinc-500",
};

function hrefWith(current: Filters, key: keyof Filters, value: string | undefined) {
  const params = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = k === key ? value : current[k];
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/ops/todos?${qs}` : "/ops/todos";
}

export default async function TodosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const filters: Filters = {};
  for (const k of FILTER_KEYS) {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (s) filters[k] = s;
  }

  const data = await getCarryOvers();

  if (!data) {
    return (
      <div>
        <h1 className="text-lg font-semibold">To-dos</h1>
        <p className="mt-4 text-xs text-muted">
          Linear not configured or unreachable (LINEAR_API_KEY) — carry-overs can&rsquo;t be shown.
          Linear itself is unaffected.
        </p>
      </div>
    );
  }

  const today = nyDate(new Date());
  const rows = data.open.map((issue) => ({ issue, group: groupFor(issue.dueDate, today) }));

  // Tiles are computed on the unfiltered set; filters only change the list.
  const overdue = rows.filter((r) => r.group === "overdue").length;
  const dueToday = rows.filter((r) => r.group === "today").length;
  const rate = onTimeRate(data.completed);

  const whoOf = (i: CarryOver) => i.assignee ?? "Unassigned";
  const options = {
    who: uniq(data.open.map(whoOf)),
    state: uniq(data.open.map((i) => i.state)),
    priority: uniq(
      [...data.open].sort((a, b) => prioRank(a.priority) - prioRank(b.priority)).map((i) => i.priorityLabel),
    ),
  };

  const visible = rows.filter(
    ({ issue, group }) =>
      (!filters.who || whoOf(issue) === filters.who) &&
      (!filters.state || issue.state === filters.state) &&
      (!filters.priority || issue.priorityLabel === filters.priority) &&
      (!filters.group || group === filters.group),
  );

  const tiles = [
    { label: "open", value: String(data.open.length), sub: "carry-over, not done" },
    { label: "overdue", value: String(overdue), sub: "due before today (NY)", href: hrefWith({}, "group", "overdue") },
    { label: "due today", value: String(dueToday), sub: today, href: hrefWith({}, "group", "today") },
    {
      label: "on-time · 14d",
      value: rate.pct === null ? "—" : `${rate.pct}%`,
      sub: rate.pct === null ? `n=${rate.n} (needs ≥5)` : `${rate.onTime}/${rate.n} done by due`,
    },
  ];

  const anyFilter = FILTER_KEYS.some((k) => filters[k]);

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold">To-dos</h1>
        <p className="text-xs text-muted">
          label <code>carry-over</code> · live from Linear · edit in Linear
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {tiles.map((tile) => {
          const body = (
            <>
              <div className="text-2xl font-semibold tabular-nums">{tile.value}</div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-muted">{tile.label}</div>
              <div className="mt-1 text-[11px] text-muted/70">{tile.sub}</div>
            </>
          );
          return tile.href ? (
            <Link key={tile.label} href={tile.href} className="bg-surface px-4 py-5 transition-colors hover:bg-bg">
              {body}
            </Link>
          ) : (
            <div key={tile.label} className="bg-surface px-4 py-5">
              {body}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted/70">
        Baseline: 0 tracked, 0 overdue. On-time % = carry-overs completed on or before their due date ÷
        those completed with a due date, last 14 days; uninformative until ≥2 weeks of filing.
      </p>

      <div className="mt-6 flex flex-col gap-2 text-[11px]">
        <FilterRow label="group" current={filters} k="group" options={GROUPS.map((g) => [g.key, g.label])} />
        <FilterRow label="who" current={filters} k="who" options={options.who.map((v) => [v, v])} />
        <FilterRow label="state" current={filters} k="state" options={options.state.map((v) => [v, v])} />
        <FilterRow label="priority" current={filters} k="priority" options={options.priority.map((v) => [v, v])} />
        {anyFilter && (
          <Link href="/ops/todos" className="self-start text-accent hover:underline">
            clear filters ({visible.length} of {rows.length} shown)
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-8">
        {GROUPS.filter((g) => !filters.group || g.key === filters.group).map((g) => {
          const items = visible
            .filter((r) => r.group === g.key)
            .map((r) => r.issue)
            .sort(
              (a, b) =>
                (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
                prioRank(a.priority) - prioRank(b.priority),
            );
          return (
            <section key={g.key}>
              <header className="mb-3 flex items-center justify-between border-b border-border pb-2">
                <span className={`text-sm font-medium ${GROUP_ACCENT[g.key]}`}>{g.label}</span>
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                  {items.length}
                </span>
              </header>
              {items.length === 0 ? (
                <p className="px-1 text-xs text-muted/60">—</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map((issue) => (
                    <Row key={issue.identifier} issue={issue} today={today} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-8 text-[11px] text-muted/60">
        Fetched {new Date(data.fetchedAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET ·
        cached 60s · &ldquo;This week&rdquo; = the next 6 days.
      </p>
    </div>
  );
}

function Row({ issue, today }: { issue: CarryOver; today: string }) {
  const rel = relativeDue(issue.dueDate, today);
  return (
    <article className="rounded-md border border-border bg-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <a
          href={issue.url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 text-sm leading-snug text-fg hover:text-accent hover:underline"
        >
          <span className="mr-2 text-[11px] text-muted">{issue.identifier}</span>
          {issue.what}
        </a>
        <div className="flex shrink-0 items-center gap-2 text-[10px]">
          {issue.templateMissing && (
            <span className="rounded border border-amber-400/40 px-1.5 py-0.5 text-amber-400" title="Add Who/What/When/Why/Context to the issue">
              no template
            </span>
          )}
          <span className="rounded bg-bg px-1.5 py-0.5 text-muted">{issue.state}</span>
          <span className={PRIORITY_ACCENT[issue.priority] ?? "text-muted"}>{issue.priorityLabel}</span>
        </div>
      </div>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-[11px] sm:grid-cols-[4rem_1fr]">
        <dt className="text-muted/70">who</dt>
        <dd className="text-muted">{issue.who}</dd>
        <dt className="text-muted/70">when</dt>
        <dd className="text-muted">
          {issue.dueDate ? (
            <>
              {issue.dueDate} <span className="text-muted/70">({rel})</span>
            </>
          ) : (
            "no due date"
          )}
          {issue.when && <span className="text-muted/60"> · {issue.when}</span>}
        </dd>
        {issue.why && (
          <>
            <dt className="text-muted/70">why</dt>
            <dd className="text-muted">{issue.why}</dd>
          </>
        )}
        {issue.links.length > 0 && (
          <>
            <dt className="text-muted/70">context</dt>
            <dd className="flex flex-wrap gap-1.5">
              {issue.links.map((l) =>
                l.href.startsWith("/") ? (
                  <code key={l.href} className="rounded bg-bg px-1.5 py-0.5 text-[10px] text-muted">
                    {l.label}
                  </code>
                ) : (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded bg-bg px-1.5 py-0.5 text-[10px] text-accent hover:underline"
                  >
                    ↗ {l.label}
                  </a>
                ),
              )}
            </dd>
          </>
        )}
      </dl>
      {issue.templateSource === "comment" && (
        <p className="mt-2 text-[10px] text-muted/50">template read from the latest comment</p>
      )}
    </article>
  );
}

function FilterRow({
  label,
  current,
  k,
  options,
}: {
  label: string;
  current: Filters;
  k: keyof Filters;
  options: [string, string][];
}) {
  const chip = (active: boolean) =>
    `rounded px-2 py-0.5 transition-colors ${active ? "bg-surface text-fg" : "text-muted hover:bg-surface hover:text-fg"}`;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="w-16 shrink-0 uppercase tracking-widest text-muted/60">{label}</span>
      <Link href={hrefWith(current, k, undefined)} className={chip(!current[k])}>
        all
      </Link>
      {options.map(([value, text]) => (
        <Link key={value} href={hrefWith(current, k, value)} className={chip(current[k] === value)}>
          {text}
        </Link>
      ))}
    </div>
  );
}

// Linear priority: 1 urgent … 4 low, 0 none (sorts last).
const prioRank = (p: number) => (p === 0 ? 5 : p);
const uniq = (xs: string[]) => [...new Set(xs)];
