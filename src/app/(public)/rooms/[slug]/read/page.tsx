import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLongRead, getLongReadSlugs } from "@/lib/long-reads";
import { getRoom } from "@/lib/rooms";
import { BlockRenderer } from "@/components/long-read/blocks";

// Like the room page: every long read is known at build time (the committed
// src/data/long-reads/*.json registry); anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getLongReadSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const room = getRoom(slug);
  const read = getLongRead(slug);
  if (!room || !read) return {};
  const title = `${room.name} — Long read · Empire State`;
  const firstParagraph = read.blocks.find((b) => b.type === "paragraph")?.text;
  return {
    title,
    description: firstParagraph ?? room.what ?? undefined,
  };
}

// fmtRoomDate lives in a "use client" module (rooms-index.tsx) and can't be
// imported into a server component; the format is intentionally identical.
const fmtDate = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export default async function LongReadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = getRoom(slug);
  const read = getLongRead(slug);
  if (!room || !read) notFound();

  return (
    <article className="mx-auto w-full max-w-[68ch] px-4 py-16 sm:px-6 sm:py-20">
      <Link
        href={`/rooms/${room.slug}`}
        className="font-mono text-xs uppercase tracking-widest text-muted hover:text-accent"
      >
        ← Back to room
      </Link>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <time className="font-mono text-[11px] uppercase tracking-widest text-muted">{fmtDate(room.date)}</time>
          {room.series && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">{room.series}</span>
          )}
          {room.location && <span className="text-[11px] text-muted">· {room.location}</span>}
          <span className="text-[11px] text-muted">· {read.readingMinutes} min read</span>
        </div>
        <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">{room.name}</h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-muted">
          Long read · updated {fmtDate(read.updated)}
        </p>
      </header>

      <div className="mt-4">
        {read.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>
    </article>
  );
}
