import type { Metadata } from "next";

// themes/page.tsx is a client component (it renders per lens), so the metadata
// lives here — same pattern as journal.
export const metadata: Metadata = {
  title: "Themes — Empire State",
  description:
    "Recurring topics and series across the New York AI rooms, with the rooms and published posts that carry each one.",
};

export default function ThemesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
