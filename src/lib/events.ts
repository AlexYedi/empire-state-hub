import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { queryAllRows } from "./notion/client";
import { DB } from "./notion/databases";
import { dateStart, relationCount, selectName, titleText } from "./notion/property";

export const EventSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string().nullable(),
  status: z.string().nullable(),
  peopleCount: z.number(),
  companiesCount: z.number(),
  topicsCount: z.number(),
  contentCount: z.number(),
});
export type EventRow = z.infer<typeof EventSchema>;

async function fetchEvents(): Promise<EventRow[]> {
  const rows = await queryAllRows(DB.events);
  return rows
    .map((row) => {
      const p = row.properties;
      return EventSchema.parse({
        id: row.id,
        name: titleText(p["Event Name"]) || "(untitled)",
        date: dateStart(p["Event Date"]),
        status: selectName(p["Event Status"]),
        peopleCount: relationCount(p["People"]),
        companiesCount: relationCount(p["Companies"]),
        topicsCount: relationCount(p["Topics"]),
        contentCount: relationCount(p["Content Drafts"]),
      });
    })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export const getEvents = unstable_cache(fetchEvents, ["events"], {
  revalidate: 300,
  tags: ["events"],
});

export type EventWindows = {
  last7: EventRow[];
  last30: EventRow[];
  upcoming: EventRow[];
  total: number;
};

/** Window math runs per-request (uses the current clock), over the cached event list. */
export async function getEventWindows(): Promise<EventWindows> {
  const events = await getEvents();
  const now = Date.now();
  const day = 86_400_000;
  const past = (d: string | null, days: number) => {
    if (!d) return false;
    const diff = new Date(d).getTime() - now;
    return diff <= 0 && diff >= -days * day;
  };
  return {
    last7: events.filter((e) => past(e.date, 7)),
    last30: events.filter((e) => past(e.date, 30)),
    upcoming: events.filter((e) => e.date && new Date(e.date).getTime() > now),
    total: events.length,
  };
}
