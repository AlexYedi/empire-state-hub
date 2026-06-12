"use client";

import Link from "next/link";
import { LensToggle } from "./lens-toggle";
import { useLens } from "./lens-provider";

/** Wordmark itself is authored per lens — small proof the dual-lens is content, not skin. */
export function SiteHeader() {
  const { lens } = useLens();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          {lens === "editorial" ? (
            <>
              <span className="font-display text-lg tracking-tight">Empire State</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Field Notes
              </span>
            </>
          ) : (
            <>
              <span className="font-mono text-sm tracking-tight">empire-state</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                //hub
              </span>
            </>
          )}
        </Link>
        <LensToggle />
      </div>
    </header>
  );
}
