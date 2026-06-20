import { getShowcase } from "@/lib/content-drafts";
import { WorkShowcase } from "@/components/work-showcase";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const items = await getShowcase();
  return <WorkShowcase items={items} />;
}
