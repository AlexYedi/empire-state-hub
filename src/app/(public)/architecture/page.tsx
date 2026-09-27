import { Suspense } from "react";
import mapJson from "@/data/system-map.json";
import { SystemMapSchema } from "@/lib/system-map/schema";
import { getIssues } from "@/lib/linear/issues";
import { ArchitectureIntro } from "./intro";
import { MapClient } from "./map-client";

// The System Map (YED-232, docs/system-map.prd.md). Facts are generated from the pipeline repo
// (pnpm gen:system-map); reasoning is the curated overlay; the build path's state is read from
// Linear at render time and cached briefly — never restated here.
export const revalidate = 300;

const MAP = SystemMapSchema.parse(mapJson);

export default async function ArchitecturePage() {
  const linear = await getIssues(MAP.buildPath.items.map((i) => i.issue));
  return (
    <div className="w-full">
      <ArchitectureIntro map={MAP} linear={linear} />
      <Suspense fallback={<div className="h-[calc(100vh-4.5rem)] min-h-[560px] border-y border-border bg-bg" />}>
        <MapClient map={MAP} linear={linear} />
      </Suspense>
    </div>
  );
}
