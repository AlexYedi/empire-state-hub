// Rooms — the public event archive. The contract between scripts/gen-rooms.mjs and /rooms.
// Parsed at import, so a malformed export fails the build instead of rendering something wrong.
// No Notion import here by design: public pages read only the committed, reviewed JSON (SPEC §4.4).
import { z } from "zod";
import ROOMS_JSON from "@/data/rooms.json";

/**
 * src/data/rooms.curated.json — the hand-owned overlay, one entry per room (an array).
 *
 *   slug            required · `YYYY-MM-DD-<kebab-name>`; fixed once a post links to it (renames never break a link)
 *   notion_page_id  optional · the event's Notion page. Needed when the slug can't resolve by date + name
 *                   (a rename, several events that day) or the event page lives outside the Events DB
 *                   (legacy: NYC AI Demos #10 is a Content Drafts page)
 *   name            optional · display-name override
 *   series          optional · series pill + filter, e.g. "The Shortlist", "Daytona AI Builders"
 *   what            optional · 1–2 curated sentences; replaces the (never exported) Event Description
 *   location        optional · "Venue, City" override; wins over the (reduced) Notion Location. Never a street
 *                   address — the exporter rejects anything address-like
 *   speaker_overrides optional · { "<Name>": { "title": null, "company": null, "linkedin": null } } — may only
 *                   REMOVE a published fact (null), never add or change one (e.g. an unresolved employer)
 *   carousel        optional · room-level carousel, a pipeline path like `Event Content/<dir>/carousel.pdf`
 *                   (legacy `content-drafts/<dir>/carousel.pdf` still resolves through the pipeline's move map);
 *                   ONLY for a carousel already posted publicly (normally a carousel attaches through its
 *                   published post). Must be committed in the pipeline repo or it is ignored
 *   extra_post_ids  optional · Content Drafts page ids to attach when a published post has no Event relation
 *                   (still must be `published` with a Published URL)
 *   takeaways       optional · `true` exports this room's post_event_brief takeaways. Off by default: briefs are
 *                   private working notes, so a human reads the room's lines before opting it in
 *   publish         optional · `false` holds the room out of rooms.json entirely
 */
export const RoomOverlaySchema = z.object({
  slug: z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/),
  notion_page_id: z.string().optional(),
  name: z.string().optional(),
  series: z.string().optional(),
  what: z.string().optional(),
  location: z.string().optional(),
  speaker_overrides: z
    .record(z.string(), z.object({ title: z.null(), company: z.null(), linkedin: z.null() }).partial().strict())
    .optional(),
  carousel: z.string().optional(),
  extra_post_ids: z.array(z.string()).optional(),
  takeaways: z.boolean().optional(),
  publish: z.boolean().optional(),
});
export type RoomOverlay = z.infer<typeof RoomOverlaySchema>;

const Carousel = z.object({ pdf: z.string(), preview: z.string().nullable() });

// Public-safe by construction: name · title · company · LinkedIn only (no contact fields exist).
const Speaker = z.object({
  name: z.string(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  linkedin: z.string().nullable(),
  roles: z.array(z.enum(["speaker", "host", "organizer"])).min(1),
});

export const POST_KIND_LABEL = {
  preview: "Pre-event",
  recap: "Recap",
  synthesis: "Synthesis",
} as const;

const Post = z.object({
  kind: z.enum(["preview", "recap", "synthesis"]),
  url: z.string().url(),
  roundup: z.boolean(),
  firstComment: z.array(z.string()).nullable(),
  carousel: Carousel.nullable(),
});

const Takeaways = z.object({
  quickTake: z.array(z.string()),
  thesis: z.array(z.string()),
  insights: z.array(z.string()),
  tools: z.array(z.string()),
});

export const RoomSchema = z.object({
  slug: z.string(),
  name: z.string(),
  date: z.string(),
  location: z.string().nullable(),
  status: z.string().nullable(),
  series: z.string().nullable(),
  what: z.string().nullable(),
  recapPending: z.boolean(),
  speakers: z.array(Speaker),
  topics: z.array(z.string()),
  companies: z.array(z.string()),
  takeaways: Takeaways.nullable(),
  carousel: Carousel.nullable(),
  posts: z.array(Post),
});
export type Room = z.infer<typeof RoomSchema>;
export type RoomPost = z.infer<typeof Post>;

export const RoomsFileSchema = z.object({
  generated_at: z.string().nullable(),
  rooms: z.array(RoomSchema),
});

const FILE = RoomsFileSchema.parse(ROOMS_JSON);

export const roomsGeneratedAt = FILE.generated_at;

export function getRooms(): Room[] {
  return FILE.rooms;
}

export function getRoom(slug: string): Room | undefined {
  return FILE.rooms.find((r) => r.slug === slug);
}

/** A room's carousels: its own, then each post's, de-duplicated by PDF. */
export function roomCarousels(room: Room) {
  const all = [room.carousel, ...room.posts.map((p) => p.carousel)].filter((c) => c !== null);
  return all.filter((c, i) => all.findIndex((x) => x.pdf === c.pdf) === i);
}

export type RoomFilters = { series?: string; topic?: string; company?: string };

export function filterRooms(rooms: Room[], f: RoomFilters): Room[] {
  return rooms.filter(
    (r) =>
      (!f.series || r.series === f.series) &&
      (!f.topic || r.topics.includes(f.topic)) &&
      (!f.company || r.companies.includes(f.company)),
  );
}

const tally = (xs: string[]) => {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value, count]) => ({ value, count }));
};

/** Filter options with counts, most common first. */
export function roomFacets(rooms: Room[]) {
  return {
    series: tally(rooms.flatMap((r) => (r.series ? [r.series] : []))),
    topics: tally(rooms.flatMap((r) => r.topics)),
    companies: tally(rooms.flatMap((r) => r.companies)),
  };
}
