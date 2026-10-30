import { Suspense } from "react";
import type { Metadata } from "next";
import { BUILDS } from "@/lib/builds";
import { BuildsIndex } from "./builds-index";

export const metadata: Metadata = {
  title: "Builds — Empire State",
  description:
    "The things built along the way: the events pipeline, this hub, and the tools in between — each with what it is and where its code lives.",
};

export default function BuildsPage() {
  return (
    <Suspense>
      <BuildsIndex builds={BUILDS} />
    </Suspense>
  );
}
