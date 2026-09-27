"use client";

import { useLens } from "@/components/lens-provider";
import { SystemMapView } from "@/components/system-map/system-map";
import type { LinearState, SystemMap } from "@/lib/system-map/schema";

export function MapClient({ map, linear }: { map: SystemMap; linear: LinearState[] | null }) {
  const { lens } = useLens();
  return <SystemMapView map={map} linear={linear} lens={lens} />;
}
