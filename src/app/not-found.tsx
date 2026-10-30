import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Root-level 404: renders inside the root layout (LensProvider included), so the
// lens-aware header works unchanged.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center">
        <div className="mx-auto w-full max-w-5xl px-6 py-24">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">404</p>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
            Page not found.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
            That page doesn&apos;t exist — it may have moved or never shipped.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-5 text-sm">
            <Link
              href="/"
              className="rounded-full bg-accent px-5 py-2.5 font-medium text-bg transition-opacity hover:opacity-90"
            >
              Home
            </Link>
            <Link href="/rooms" className="text-muted transition-colors hover:text-fg">
              Browse the rooms →
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
