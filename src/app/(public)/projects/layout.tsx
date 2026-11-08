import type { Metadata } from "next";

// The index renders per lens on the client, so the metadata lives here (themes pattern).
export const metadata: Metadata = {
  title: "In Flight — Empire State",
  description:
    "Mission control for the projects being built right now: why each one exists, where it's going, what's left, and the numbers that say whether it's working.",
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
