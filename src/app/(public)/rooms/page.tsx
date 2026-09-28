import { Suspense } from "react";
import type { Metadata } from "next";
import { getRooms, roomsGeneratedAt } from "@/lib/rooms";
import { RoomsIndex } from "./rooms-index";

export const metadata: Metadata = {
  title: "Rooms — Empire State",
  description:
    "An archive of New York AI rooms: who spoke and what the room was working through, and the posts that came out of each one.",
};

export default function RoomsPage() {
  return (
    <Suspense>
      <RoomsIndex rooms={getRooms()} generatedAt={roomsGeneratedAt} />
    </Suspense>
  );
}
