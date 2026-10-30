import type { Metadata } from "next";
import { getShowcase } from "@/lib/content-drafts";
import { WorkShowcase } from "@/components/work-showcase";

// Copy is drawn from the page's own copy (E-01 item 3: no new claims).
export const metadata: Metadata = {
  title: "Published content — Empire State",
  description:
    "Every event becomes a researched brief, posts that share what happened, and the notes to follow up.",
};

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const items = await getShowcase();
  return <WorkShowcase items={items} />;
}
