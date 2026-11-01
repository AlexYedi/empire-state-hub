import Link from "next/link";
import { getLongReadSummaries } from "@/lib/long-reads";

// fmtRoomDate lives in a "use client" module (rooms-index.tsx) and can't be
// imported into a server component; the format is intentionally identical.
const fmtDate = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * Home-page "Latest long reads" module (E-02 executable 5): the newest 3 reads.
 * Server component over the committed JSON registry — no Notion import here by
 * design (AGENTS.md rule 1). Renders nothing while the registry is empty.
 */
export function LatestReads() {
  const reads = getLongReadSummaries().slice(0, 3);
  if (reads.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-24">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">Latest long reads</p>
      <h2 className="mt-4 font-display text-2xl leading-tight tracking-tight sm:text-3xl">
        The long form of the room.
      </h2>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {reads.map((r) => (
          <Link
            key={r.slug}
            href={`/rooms/${r.slug}/read`}
            className="group flex flex-col rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent focus-visible:border-accent focus-visible:outline-none"
          >
            <div className="flex flex-wrap items-center gap-2">
              <time className="font-mono text-[11px] uppercase tracking-widest text-muted">{fmtDate(r.roomDate)}</time>
              <span className="text-[11px] text-muted">· {r.readingMinutes} min read</span>
            </div>
            <h3 className="mt-2 text-sm font-medium leading-snug text-fg group-hover:text-accent">{r.roomName}</h3>
            {r.excerpt && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{r.excerpt}</p>}
            <span className="mt-auto pt-3 font-mono text-[10px] text-muted group-hover:text-accent">
              Read the long read →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
