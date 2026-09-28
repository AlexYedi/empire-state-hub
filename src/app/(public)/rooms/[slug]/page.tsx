import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRoom, getRooms } from "@/lib/rooms";
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
  return <RoomView room={room} />;
}
