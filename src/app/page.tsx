import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
      </main>
    </>
  );
}
