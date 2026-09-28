import { Hero } from "@/components/hero";
import systemMap from "@/data/system-map.json";

export default function Home() {
  // One source of truth for the system's size: the generated system map (pnpm gen:system-map).
  const { skills, agents, commands } = systemMap.counts;
  return <Hero counts={{ skills, agents, commands }} />;
}
