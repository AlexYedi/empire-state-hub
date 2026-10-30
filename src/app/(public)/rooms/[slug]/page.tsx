import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRoom, getRooms, type Room } from "@/lib/rooms";
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
  return {
    title: `${room.name} — Rooms · Empire State`,
    description: room.what ?? `Speakers, takeaways and posts from ${room.name}.`,
  };
}

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = getRoom(slug);
  if (!room) notFound();
  return (
    <>
      <EventJsonLd room={room} />
      <RoomView room={room} />
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd(room)) }}
    />
  );
}
