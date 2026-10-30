import type { Metadata } from "next";
import { Hero } from "@/components/hero";
import systemMap from "@/data/system-map.json";

// Copy is drawn from the hero copy below (E-01 item 2: no new claims).
export const metadata: Metadata = {
  title: "Empire State — Field notes · New York",
  description:
    "Most of what happens in New York's AI rooms never leaves them. A running account of the ones worth remembering — and the system that turns each night into something that lasts.",
};

export default function Home() {
  // One source of truth for the system's size: the generated system map (pnpm gen:system-map).
  const { skills, agents, commands } = systemMap.counts;
  return <Hero counts={{ skills, agents, commands }} />;
}
