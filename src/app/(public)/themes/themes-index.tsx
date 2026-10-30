"use client";

import Link from "next/link";
import { useLens } from "@/components/lens-provider";
import { getRoom } from "@/lib/rooms";
import type { Theme } from "@/lib/themes";

export function ThemesIndex({ themes, sourceRooms }: { themes: Theme[]; sourceRooms: number }) {
  const { lens } = useLens();
  const ed = lens === "editorial";
  const postTotal = themes.reduce((n, t) => n + t.postUrls.length, 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        {ed ? "Recurring themes" : "themes"}
      </p>
      <h1
        className={
          ed
            ? "mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
            : "mt-4 font-mono text-3xl font-semibold tracking-tight sm:text-4xl"
        }
      >
        {ed ? "What the rooms keep returning to." : "Topic index, derived."}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
        {ed
          ? "Topics and series that show up in more than one room — each with the rooms that carried it and the posts that came out of them."
          : "A theme exists only where rooms.json topics/series overlap across 2+ rooms. No invented taxonomy: every entry cross-checks against the committed room export at build time."}
      </p>
      <p className="mt-1 font-mono text-[11px] text-muted">
        {themes.length} themes · {postTotal} published posts · derived from {sourceRooms} rooms
      </p>

      {themes.length === 0 ? (
        <p className="mt-12 text-sm italic text-muted">No recurring themes yet.</p>
      ) : (
        <div className="mt-8 space-y-4">
          {themes.map((theme) => (
            <ThemeCard key={theme.id} theme={theme} ed={ed} />
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeCard({ theme, ed }: { theme: Theme; ed: boolean }) {
  const rooms = theme.roomSlugs
    .map(getRoom)
    .filter((r) => r !== undefined);

  return (
    <article className="rounded-lg border border-border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={ed ? "font-display text-xl tracking-tight" : "font-mono text-lg font-semibold tracking-tight"}>
          {theme.name}
        </h2>
        <p className="font-mono text-[11px] text-muted">
          {theme.roomSlugs.length} rooms · {theme.postUrls.length} posts
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {rooms.map((room) => (
          <Link
            key={room.slug}
            href={`/rooms/${room.slug}`}
            className="rounded-full border border-border px-3 py-1 text-muted transition-colors hover:text-fg"
          >
            {room.name}
          </Link>
        ))}
      </div>

      {theme.postUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted">
          {theme.postUrls.map((url, i) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-border underline-offset-4 transition-colors hover:text-fg"
            >
              post {i + 1} ↗
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
