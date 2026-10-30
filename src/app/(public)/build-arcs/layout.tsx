import type { Metadata } from "next";

// build-arcs/page.tsx is a client component (it renders per lens), so the
// metadata lives here. Copy is drawn from the intro already on the page
// (E-01 item 4).
export const metadata: Metadata = {
  title: "Build Arcs — Empire State",
  description:
    "The work, in arcs — the sprints behind the system, grouped into themes. Each arc is a thesis, not just a feature.",
};

export default function BuildArcsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
