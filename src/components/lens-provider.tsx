"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { LENS_COOKIE, otherLens, type Lens } from "@/lib/lens";

type LensContextValue = {
  lens: Lens;
  setLens: (lens: Lens) => void;
  toggle: () => void;
};

const LensContext = createContext<LensContextValue | null>(null);

/**
 * Holds the active lens. Initialized from the server-read cookie (so the first
 * paint already matches — no flash of the wrong lens), then persisted client-side
 * on change. Writes `data-lens` on <html> directly for instant, CSS-driven theming.
 */
export function LensProvider({
  initialLens,
  children,
}: {
  initialLens: Lens;
  children: React.ReactNode;
}) {
  const [lens, setLensState] = useState<Lens>(initialLens);

  const setLens = useCallback((next: Lens) => {
    setLensState(next);
    document.documentElement.dataset.lens = next;
    document.cookie = `${LENS_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const toggle = useCallback(() => {
    setLensState((current) => {
      const next = otherLens(current);
      document.documentElement.dataset.lens = next;
      document.cookie = `${LENS_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  return (
    <LensContext.Provider value={{ lens, setLens, toggle }}>
      {children}
    </LensContext.Provider>
  );
}

export function useLens(): LensContextValue {
  const ctx = useContext(LensContext);
  if (!ctx) throw new Error("useLens must be used within a LensProvider");
  return ctx;
}
