import type { Metadata } from "next";

// about/page.tsx is a client component (it renders per lens), so the metadata
// lives here. Copy is drawn from the text already on the page (E-01 item 2).
export const metadata: Metadata = {
  title: "About — Empire State",
  description:
    "I sell, I build, and I write down what I see. Twelve years in enterprise B2B SaaS; now building at the intersection of AI and go-to-market.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
