// RSS 2.0 feed (E-03) — one item per room, one per build-journal entry,
// newest first, capped at 50. Reads only the committed, public data files;
// no Notion import here by design. Statically generated at build time.
import { z } from "zod";
import { getRooms } from "@/lib/rooms";
import JOURNAL from "@/data/build-journal.json";

// Next 16: GET route handlers are dynamic by default; this feed is fully
// static data, so opt back into static generation (route segment config).
export const dynamic = "force-static";

const JournalEntrySchema = z.object({
  date: z.string(),
  headline: z.string(),
  summary: z.string(),
});

const JournalFileSchema = z.object({
  entries: z.array(JournalEntrySchema),
});

type FeedItem = {
  title: string;
  link: string;
  date: string; // YYYY-MM-DD; items without one sort last
  description?: string;
};

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// RFC 822 pubDate, as RSS 2.0 expects.
function rfc822(date: string): string {
  return new Date(date + "T00:00:00Z").toUTCString();
}

function collectFeedItems(): FeedItem[] {
  const roomItems: FeedItem[] = getRooms().map((room) => ({
    title: room.name,
    link: `/rooms/${room.slug}`,
    date: room.date,
    description: room.what ?? undefined,
  }));

  const journalItems: FeedItem[] = JournalFileSchema.parse(JOURNAL).entries.map(
    (entry) => ({
      title: entry.headline,
      link: "/journal",
      date: entry.date,
      description: entry.summary,
    }),
  );

  return [...roomItems, ...journalItems]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 50);
}

function renderRss(items: FeedItem[]): string {
  const itemXml = items
    .map(
      (item) => [
        "    <item>",
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(item.link)}</link>`,
        `      <guid>${escapeXml(item.link)}</guid>`,
        `      <pubDate>${rfc822(item.date)}</pubDate>`,
        item.description
          ? `      <description>${escapeXml(item.description)}</description>`
          : null,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0">`,
    `  <channel>`,
    `    <title>Empire State</title>`,
    `    <link>/</link>`,
    `    <description>New York AI rooms and the build log behind them — rooms as they happened, and the pipeline that turned each one into research and content.</description>`,
    `    <language>en-us</language>`,
    items[0] ? `    <lastBuildDate>${rfc822(items[0].date)}</lastBuildDate>` : null,
    itemXml,
    `  </channel>`,
    `</rss>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function GET(): Response {
  return new Response(renderRss(collectFeedItems()), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
