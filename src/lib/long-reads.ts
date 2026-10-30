// Long reads (E-02) — the web-native long form of an event post. Parsed at import,
// the same idiom as src/lib/rooms.ts: a malformed file fails the build instead of
// rendering something wrong. No Notion import here by design — public pages read
// only the committed, reviewed JSON (AGENTS.md rule 1).
//
// Adding a long read = add `src/data/long-reads/<room-slug>.json` plus one import
// below. The slug MUST match an existing room slug; anything else throws at import.
import { z } from "zod";
import { getRoom } from "@/lib/rooms";

// -- Block model: a discriminated union on `type` (E-02 v1 has exactly these seven).

const Heading = z.object({
  type: z.literal("heading"),
  text: z.string().min(1),
});

const Paragraph = z.object({
  type: z.literal("paragraph"),
  text: z.string().min(1),
});

// Quotes always carry attribution (E-02 hard constraint), and only quotes Alex
// approved go public — approved quotes live in the reviewed JSON file.
const Quote = z.object({
  type: z.literal("quote"),
  text: z.string().min(1),
  attribution: z.string().min(1),
});

// Alt text is REQUIRED by the spec; the accessibility bar is in the schema, not the review.
const Image = z.object({
  type: z.literal("image"),
  src: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

const Stat = z.object({
  type: z.literal("stat"),
  value: z.string().min(1),
  label: z.string().min(1),
  source: z.string().min(1),
});

const Callout = z.object({
  type: z.literal("callout"),
  title: z.string().optional(),
  text: z.string().min(1),
});

const SourceItem = z.object({
  label: z.string().min(1),
  // An absolute link or a site-relative path (e.g. a room's public carousel PDF).
  url: z
    .string()
    .refine((u) => /^https?:\/\//.test(u) || u.startsWith("/"), "must be an absolute URL or a site-relative path")
    .optional(),
});

const Sources = z.object({
  type: z.literal("sources"),
  items: z.array(SourceItem).min(1),
});

const Block = z.discriminatedUnion("type", [Heading, Paragraph, Quote, Image, Stat, Callout, Sources]);
export type LongReadBlock = z.infer<typeof Block>;

const LongReadSchema = z.object({
  slug: z.string(),
  updated: z.string(),
  readingMinutes: z.number().int().positive().optional(),
  blocks: z.array(Block).min(1),
});

export type LongRead = z.infer<typeof LongReadSchema>;

// -- Registry: one import per long read.
import SEED from "@/data/long-reads/2026-09-28-shortlist-september-founder-showcase.json";

const FILES = [SEED] as const;

function load(file: unknown): LongRead {
  const read = LongReadSchema.parse(file);
  // A long read hangs off a room; a slug with no room is a broken link at build time.
  if (!getRoom(read.slug)) {
    throw new Error(`long-reads: slug "${read.slug}" does not match any room in src/data/rooms.json`);
  }
  return read;
}

const LONG_READS: LongRead[] = FILES.map(load);

/** Rough prose word count across text-bearing blocks, at a 200 wpm reading pace. */
function computeReadingMinutes(blocks: LongReadBlock[]): number {
  const words = blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
        case "paragraph":
        case "callout":
          return b.text;
        case "quote":
          return b.text;
        case "stat":
          return `${b.value} ${b.label} ${b.source}`;
        case "image":
          return `${b.alt} ${b.caption ?? ""}`;
        case "sources":
          return b.items.map((s) => s.label).join(" ");
      }
    })
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function getLongRead(slug: string): (Omit<LongRead, "readingMinutes"> & { readingMinutes: number }) | undefined {
  const read = LONG_READS.find((r) => r.slug === slug);
  if (!read) return undefined;
  return { ...read, readingMinutes: read.readingMinutes ?? computeReadingMinutes(read.blocks) };
}

export function hasLongRead(slug: string): boolean {
  return LONG_READS.some((r) => r.slug === slug);
}

/** Every long-read slug — used by the route's generateStaticParams and the sitemap follow-up. */
export function getLongReadSlugs(): string[] {
  return LONG_READS.map((r) => r.slug);
}
