"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLens } from "@/components/lens-provider";
import { filterRooms, roomCarousels, roomFacets, type Room, type RoomFilters } from "@/lib/rooms";

export const fmtRoomDate = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const KEYS = ["series", "topic", "company"] as const;

export function RoomsIndex({ rooms, generatedAt }: { rooms: Room[]; generatedAt: string | null }) {
  const { lens } = useLens();
  const ed = lens === "editorial";
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: RoomFilters = {
    series: params.get("series") ?? undefined,
    topic: params.get("topic") ?? undefined,
    company: params.get("company") ?? undefined,
  };
  const shown = filterRooms(rooms, filters);
  const facets = roomFacets(rooms);
  const speakerTotal = rooms.reduce((n, r) => n + r.speakers.length, 0);

  const setFilter = (key: (typeof KEYS)[number], value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const active = KEYS.filter((k) => filters[k]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        {ed ? "The rooms" : "rooms"}
      </p>
      <h1
        className={
          ed
            ? "mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
            : "mt-4 font-mono text-3xl font-semibold tracking-tight sm:text-4xl"
        }
      >
        {ed ? "Every room, on the record." : "Event archive, generated."}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
        {ed
          ? "New York's AI rooms, one page each: who was on stage, what the room was working through, and the posts that came out of it."
          : "One page per event: speakers, takeaways from the post-event brief, published posts and carousels. Exported from Notion through an allowlist; the committed JSON is what ships."}
      </p>
      <p className="mt-1 font-mono text-[11px] text-muted">
        {rooms.length} rooms · {speakerTotal} speakers
        {generatedAt ? ` · generated ${generatedAt.slice(0, 10)}` : " · not yet generated"}
      </p>

      {rooms.length > 0 && (
        <div className="mt-10 flex flex-wrap items-center gap-2 text-sm">
          <FilterSelect label="Series" value={filters.series} options={facets.series} onChange={(v) => setFilter("series", v)} />
          <FilterSelect label="Topic" value={filters.topic} options={facets.topics} onChange={(v) => setFilter("topic", v)} />
          <FilterSelect label="Company" value={filters.company} options={facets.companies} onChange={(v) => setFilter("company", v)} />
          {active.length > 0 && (
            <button
              type="button"
              onClick={() => router.replace(pathname, { scroll: false })}
              className="rounded px-2 py-1 text-xs text-muted hover:text-fg"
            >
              clear
            </button>
          )}
        </div>
      )}

      {rooms.length === 0 ? (
        <p className="mt-12 text-sm italic text-muted">No rooms published yet.</p>
      ) : shown.length === 0 ? (
        <p className="mt-12 text-sm italic text-muted">No rooms match these filters.</p>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {shown.map((r) => (
            <RoomCard key={r.slug} room={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: { value: string; count: number }[];
  onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <label className="inline-flex items-center gap-2 rounded border border-border bg-surface px-2 py-1 text-xs text-muted">
      {label}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[12rem] bg-transparent text-fg focus-visible:outline-none"
      >
        <option value="">all</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value} ({o.count})
          </option>
        ))}
      </select>
    </label>
  );
}

function RoomCard({ room }: { room: Room }) {
  const carousels = roomCarousels(room);
  const preview = carousels.find((c) => c.preview)?.preview;
  return (
    <Link
      href={`/rooms/${room.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-accent focus-visible:border-accent focus-visible:outline-none"
    >
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element -- static asset in /public, sized by aspect
        <img src={preview} alt="" className="aspect-[4/5] max-h-48 w-full object-cover object-top" />
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2">
          <time className="font-mono text-[11px] uppercase tracking-widest text-muted">{fmtRoomDate(room.date)}</time>
          {room.series && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">{room.series}</span>
          )}
        </div>
        <h2 className="mt-2 text-sm font-medium leading-snug text-fg group-hover:text-accent">{room.name}</h2>
        {room.what && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{room.what}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-3 font-mono text-[10px] text-muted">
          <span>{room.speakers.length} speakers</span>
          <span>{room.posts.length} posts</span>
          {carousels.length > 0 && <span className="rounded border border-border px-1.5 py-0.5">carousel</span>}
          {room.recapPending && <span className="italic">recap pending</span>}
        </div>
      </div>
    </Link>
  );
}
