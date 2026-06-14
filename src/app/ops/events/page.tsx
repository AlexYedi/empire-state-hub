import { getEvents, getEventWindows, type EventRow } from "@/lib/events";

export const dynamic = "force-dynamic";

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function EventsPage() {
  const [events, windows] = await Promise.all([getEvents(), getEventWindows()]);

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Events</h1>
        <p className="text-xs text-muted">
          {windows.total} total · {windows.last7.length} in 7d · {windows.last30.length} in 30d ·{" "}
          {windows.upcoming.length} upcoming
        </p>
      </div>

      {windows.upcoming.length > 0 && (
        <Section title="Upcoming" rows={windows.upcoming} />
      )}
      <Section title="All events" rows={events} />
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: EventRow[] }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">{title}</h2>
      <div className="overflow-hidden rounded-lg border border-border">
        {rows.map((e, i) => (
          <div
            key={e.id}
            className={`flex items-center gap-4 px-4 py-2.5 text-sm ${i % 2 ? "bg-surface" : "bg-bg"}`}
          >
            <span className="w-28 shrink-0 text-xs text-muted tabular-nums">{fmtDate(e.date)}</span>
            <span className="flex-1 truncate">{e.name}</span>
            {e.status && (
              <span className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted sm:inline">
                {e.status}
              </span>
            )}
            <span className="hidden shrink-0 text-[10px] text-muted/70 md:inline">
              {e.peopleCount}p · {e.companiesCount}c · {e.topicsCount}t · {e.contentCount} drafts
            </span>
          </div>
        ))}
        {rows.length === 0 && <p className="px-4 py-3 text-xs text-muted/60">No events.</p>}
      </div>
    </section>
  );
}
