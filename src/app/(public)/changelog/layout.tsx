import type { Metadata } from "next";

// changelog/page.tsx is a client component (it renders per lens), so the
// metadata lives here. Copy is drawn from the page's own copy (E-01 item 3).
export const metadata: Metadata = {
  title: "Changelog — Empire State",
  description: "Five months, one reset — the build log, with curated milestones.",
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
