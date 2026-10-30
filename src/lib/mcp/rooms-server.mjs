// Public Rooms MCP tool layer (E-04) — pure functions over the committed rooms.json export.
//
// Plain .mjs on purpose: the node --test contract suite (scripts/fixtures/mcp/) must exercise
// this exact code, and Node 20 cannot import the repo's TS sources. The route handler
// (src/app/api/mcp/route.ts) injects the zod-parsed rooms from src/lib/rooms.ts — this module
// never reads Notion, Linear, or the filesystem itself.
import { z } from "zod";

// ---------------------------------------------------------------------------
// Public allowlist — the only keys any tool output may contain. The contract
// test walks every tool response and fails if any other key appears.
// ---------------------------------------------------------------------------

/** Speaker facts are name · title · company · LinkedIn · roles only (AGENTS.md rule 3). */
export const SPEAKER_FIELDS = ["name", "title", "company", "linkedin", "roles"];

export const MCP_PUBLIC_FIELDS = new Set([
  // list_rooms rows
  "slug",
  "name",
  "date",
  "series",
  "location",
  // get_room room body
  "room",
  "status",
  "what",
  "recapPending",
  "speakers",
  "topics",
  "companies",
  "takeaways",
  "carousel",
  "posts",
  ...SPEAKER_FIELDS,
  // posts
  "kind",
  "url",
  "roundup",
  "firstComment",
  // takeaways
  "quickTake",
  "thesis",
  "insights",
  "tools",
  // carousel
  "pdf",
  "preview",
  // speaker-search room refs
  "roles",
  "rooms",
  // list_series entries
  "count",
]);

// ---------------------------------------------------------------------------
// Output schemas — registered as tool outputSchema AND used by the tests.
// MCP structuredContent must be an object, so array results are wrapped.
// ---------------------------------------------------------------------------

const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const RoomSummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  date: DateStr,
  series: z.string().nullable(),
  location: z.string().nullable(),
});

export const RoomPublicSchema = z.object({
  slug: z.string(),
  name: z.string(),
  date: DateStr,
  location: z.string().nullable(),
  status: z.string().nullable(),
  series: z.string().nullable(),
  what: z.string().nullable(),
  recapPending: z.boolean(),
  speakers: z.array(
    z.object({
      name: z.string(),
      title: z.string().nullable(),
      company: z.string().nullable(),
      linkedin: z.string().nullable(),
      roles: z.array(z.string()).min(1),
    }),
  ),
  topics: z.array(z.string()),
  companies: z.array(z.string()),
  takeaways: z
    .object({
      quickTake: z.array(z.string()),
      thesis: z.array(z.string()),
      insights: z.array(z.string()),
      tools: z.array(z.string()),
    })
    .nullable(),
  carousel: z.object({ pdf: z.string(), preview: z.string().nullable() }).nullable(),
  posts: z.array(
    z.object({
      kind: z.string(),
      url: z.string(),
      roundup: z.boolean(),
      firstComment: z.array(z.string()).nullable(),
      carousel: z.object({ pdf: z.string(), preview: z.string().nullable() }).nullable(),
    }),
  ),
});

export const SpeakerSearchResultSchema = z.object({
  name: z.string(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  linkedin: z.string().nullable(),
  rooms: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      date: DateStr,
      roles: z.array(z.string()).min(1),
    }),
  ),
});

export const SeriesEntrySchema = z.object({ name: z.string(), count: z.number().int().min(1) });

// ---------------------------------------------------------------------------
// Pure projections
// ---------------------------------------------------------------------------

const byDateAsc = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.slug.localeCompare(b.slug));

/** list_rooms — chronological, optionally filtered by series and a from/to date window (ISO). */
export function listRooms(rooms, { series, from, to } = {}) {
  return rooms
    .filter((r) => (!series || r.series === series) && (!from || r.date >= from) && (!to || r.date <= to))
    .sort(byDateAsc)
    .map((r) => ({ slug: r.slug, name: r.name, date: r.date, series: r.series, location: r.location }));
}

/**
 * get_room — the full room projected onto the public allowlist. rooms.json already
 * restricts speakers to the public four + roles; the projection makes that a
 * structural guarantee here instead of trusting the source shape.
 */
export function getRoomPublic(rooms, slug) {
  const room = rooms.find((r) => r.slug === slug);
  if (!room) return undefined;
  return {
    slug: room.slug,
    name: room.name,
    date: room.date,
    location: room.location,
    status: room.status,
    series: room.series,
    what: room.what,
    recapPending: room.recapPending,
    speakers: room.speakers.map((s) => ({
      name: s.name,
      title: s.title,
      company: s.company,
      linkedin: s.linkedin,
      roles: [...s.roles],
    })),
    topics: [...room.topics],
    companies: [...room.companies],
    takeaways:
      room.takeaways && {
        quickTake: [...room.takeaways.quickTake],
        thesis: [...room.takeaways.thesis],
        insights: [...room.takeaways.insights],
        tools: [...room.takeaways.tools],
      },
    carousel: room.carousel && { pdf: room.carousel.pdf, preview: room.carousel.preview },
    posts: room.posts.map((p) => ({
      kind: p.kind,
      url: p.url,
      roundup: p.roundup,
      firstComment: p.firstComment && [...p.firstComment],
      carousel: p.carousel && { pdf: p.carousel.pdf, preview: p.carousel.preview },
    })),
  };
}

/**
 * search_speakers — speakers whose name or company matches the query
 * (case-insensitive substring), grouped across rooms. Title/company come from
 * the most recent room where that fact is present, since both change over time.
 */
export function searchSpeakers(rooms, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const byName = new Map();
  for (const room of [...rooms].sort(byDateAsc)) {
    for (const s of room.speakers) {
      const haystack = `${s.name} ${s.company ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) continue;
      const existing = byName.get(s.name);
      const ref = { slug: room.slug, name: room.name, date: room.date, roles: [...s.roles] };
      if (!existing) {
        byName.set(s.name, { name: s.name, title: s.title, company: s.company, linkedin: s.linkedin, rooms: [ref] });
      } else {
        existing.rooms.push(ref);
        existing.title = s.title ?? existing.title;
        existing.company = s.company ?? existing.company;
        existing.linkedin = s.linkedin ?? existing.linkedin;
      }
    }
  }
  return [...byName.values()].sort((a, b) => b.rooms.length - a.rooms.length || a.name.localeCompare(b.name));
}

/** list_series — distinct named series with room counts, busiest first. */
export function listSeries(rooms) {
  const counts = new Map();
  for (const r of rooms) {
    if (!r.series) continue;
    counts.set(r.series, (counts.get(r.series) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// MCP server factory — SDK wiring only; all logic lives in the functions above.
// ---------------------------------------------------------------------------

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const text = (value) => [{ type: "text", text: JSON.stringify(value, null, 2) }];

/**
 * The public Rooms MCP server. Read-only tools over committed rooms.json — no auth
 * (the data is public), no env vars, no writes. Stateless: the route creates a fresh
 * server per request, so no state survives between calls.
 */
export function createRoomsServer({ rooms, name = "empire-rooms", version = "0.1.0" }) {
  const server = new McpServer({ name, version });
  const readOnly = { readOnlyHint: true };

  server.registerTool(
    "list_rooms",
    {
      title: "List rooms",
      description:
        "List NYC AI rooms (events) in the public archive, oldest first. Optionally filter by exact series name and/or an inclusive from/to date window (YYYY-MM-DD).",
      inputSchema: {
        series: z.string().optional().describe("Exact series name, e.g. 'The Shortlist'"),
        from: DateStr.optional().describe("Inclusive start date, YYYY-MM-DD"),
        to: DateStr.optional().describe("Inclusive end date, YYYY-MM-DD"),
      },
      outputSchema: { rooms: z.array(RoomSummarySchema), count: z.number().int().min(0) },
      annotations: readOnly,
    },
    ({ series, from, to } = {}) => {
      const list = listRooms(rooms, { series, from, to });
      return { content: text({ rooms: list, count: list.length }), structuredContent: { rooms: list, count: list.length } };
    },
  );

  server.registerTool(
    "get_room",
    {
      title: "Get a room",
      description:
        "Get one room by slug (as in rooms.json): speakers with name/title/company/LinkedIn/roles, topics, companies, takeaways, and published post links. Use list_rooms to find slugs.",
      inputSchema: { slug: z.string().describe("Room slug, e.g. '2026-09-28-shortlist-september-founder-showcase'") },
      outputSchema: { room: RoomPublicSchema },
      annotations: readOnly,
    },
    ({ slug }) => {
      const room = getRoomPublic(rooms, slug);
      // Structured MCP error, never a thrown exception — an unknown slug must not 500.
      if (!room) {
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown room slug: ${slug}. Use list_rooms to find valid slugs.` }],
        };
      }
      return { content: text({ room }), structuredContent: { room } };
    },
  );

  server.registerTool(
    "search_speakers",
    {
      title: "Search speakers",
      description:
        "Search speakers across all rooms by name or company (case-insensitive substring). Each hit lists every room the person appeared in.",
      inputSchema: { query: z.string().describe("Name or company substring, e.g. 'Amperos'") },
      outputSchema: { speakers: z.array(SpeakerSearchResultSchema), count: z.number().int().min(0) },
      annotations: readOnly,
    },
    ({ query }) => {
      const speakers = searchSpeakers(rooms, query);
      return {
        content: text({ speakers, count: speakers.length }),
        structuredContent: { speakers, count: speakers.length },
      };
    },
  );

  server.registerTool(
    "list_series",
    {
      title: "List series",
      description: "List the distinct event series in the archive, each with its room count, busiest first.",
      outputSchema: { series: z.array(SeriesEntrySchema) },
      annotations: readOnly,
    },
    () => {
      const series = listSeries(rooms);
      return { content: text({ series }), structuredContent: { series } };
    },
  );

  return server;
}

