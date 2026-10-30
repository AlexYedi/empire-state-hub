import type { Metadata } from "next";

// journal/page.tsx is a client component (it renders per lens), so the metadata
// lives here. Copy is drawn from the text already on the page (E-01 item 3).
export const metadata: Metadata = {
  title: "Journal — Empire State",
  description:
    "The work, as it happened — facts auto-assembled from git history; the summaries are curated.",
};

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
