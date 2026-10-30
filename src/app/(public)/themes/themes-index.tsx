"use client";

import Link from "next/link";
import { useLens } from "@/components/lens-provider";
import { getRoom } from "@/lib/rooms";
import type { Theme } from "@/lib/themes";
import type { LayerView } from "@/lib/topic-layers";

type Coverage = {
  mappedTopics: number;
  totalRoomTopics: number;
  source: { repo: string; commit: string; asOf: string };
};

export function ThemesIndex({
  themes,
  sourceRooms,
  layers,
  coverage,
}: {
  themes: Theme[];
  sourceRooms: number;
  layers: LayerView[];
  coverage: Coverage;
}) {
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

      <LayersSection layers={layers} coverage={coverage} ed={ed} />
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

// "By layer" (E-10 item 3 / YED-126): the same rooms, cut by the pipeline's S-03 ten-layer
// reference architecture. Counts derive from the committed topic-layers.json at build time;
// a topic counts toward its primary layer only, with secondary-only touches shown separately.
function LayersSection({ layers, coverage, ed }: { layers: LayerView[]; coverage: Coverage; ed: boolean }) {
  return (
    <section className="mt-16 border-t border-border pt-12">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        {ed ? "By layer" : "layers"}
      </p>
      <h2
        className={
          ed
            ? "mt-4 font-display text-2xl leading-tight tracking-tight sm:text-3xl"
            : "mt-4 font-mono text-2xl font-semibold tracking-tight"
        }
      >
        {ed ? "Where the signal concentrates." : "Layer density, derived."}
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
        {ed
          ? "The same rooms, cut by a ten-layer reference architecture for applied AI: how much of the archive lands in each layer of the stack."
          : "Room counts per S-03 layer (primary assignment). Secondary-only touches are shown separately, never merged into the primary count."}
      </p>
      <p className="mt-1 font-mono text-[11px] text-muted">
        {coverage.mappedTopics} of {coverage.totalRoomTopics} room topics carry a layer · map from{" "}
        {coverage.source.repo} @ {coverage.source.commit} (as of {coverage.source.asOf})
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {layers.map((layer) => (
          <LayerCard key={layer.id} layer={layer} ed={ed} />
        ))}
      </div>
    </section>
  );
}

function LayerCard({ layer, ed }: { layer: LayerView; ed: boolean }) {
  return (
    <article className="rounded-lg border border-border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={ed ? "font-display text-lg tracking-tight" : "font-mono text-base font-semibold tracking-tight"}>
          {layer.label}
        </h3>
        <p className="font-mono text-[11px] text-muted">
          {layer.roomCount} rooms · {layer.topicCount} topics
          {layer.secondaryRoomCount > 0 && ` · +${layer.secondaryRoomCount} via secondary`}
        </p>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-muted">{layer.description}</p>

      {layer.rooms.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {layer.rooms.map((room) => (
            <Link
              key={room.slug}
              href={`/rooms/${room.slug}`}
              className="rounded-full border border-border px-3 py-1 text-muted transition-colors hover:text-fg"
            >
              {room.name}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
