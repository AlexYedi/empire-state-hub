import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRoom, getRooms, type Room } from "@/lib/rooms";
import { xShareUrl } from "@/lib/share";
import { pageUrl } from "@/lib/site-url";
import { RoomView } from "./room-view";

// Every room is known at build time (the committed rooms.json); anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getRooms().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const room = getRoom(slug);
  if (!room) return {};
  const description = room.what ?? `Speakers, takeaways and posts from ${room.name}.`;
  return {
    title: `${room.name} — Rooms · Empire State`,
    description,
    // E-06 item 2: X card on rooms, reusing the site-wide Open Graph image
    // (src/app/opengraph-image.tsx route). Setting images explicitly: defining
    // openGraph/twitter in generateMetadata overrides the file convention's
    // inherited image on these routes (verified against the built HTML).
    openGraph: {
      title: room.name,
      description,
      url: pageUrl(`/rooms/${room.slug}`),
      images: [pageUrl("/opengraph-image")],
    },
    twitter: {
      card: "summary_large_image",
      title: room.name,
      description,
      images: [pageUrl("/opengraph-image")],
    },
  };
}

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = getRoom(slug);
  if (!room) notFound();
  return (
    <>
      <EventJsonLd room={room} />
      <RoomView
        room={room}
        // Built server-side: the origin env vars are not inlined into client bundles.
        shareUrl={xShareUrl({ title: room.name, url: pageUrl(`/rooms/${room.slug}`) })}
      />
    </>
  );
}

/** schema.org Event, built only from fields already published in rooms.json (E-01 item 8). */
function eventJsonLd(room: Room) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: room.name,
    startDate: room.date,
    ...(room.location ? { location: { "@type": "Place", name: room.location } } : {}),
    ...(room.what ? { description: room.what } : {}),
    ...(room.speakers.length > 0
      ? {
          performer: room.speakers.map((s) => ({
            "@type": "Person",
            name: s.name,
          })),
        }
      : {}),
  };
}

function EventJsonLd({ room }: { room: Room }) {
  return (
    <script
      type="application/ld+json"
      // Escape "<" so a room field containing "</script>" can never close the tag early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd(room)).replace(/</g, "\\u003c") }}
    />
  );
}
