// The two co-equal lenses the public surface is authored in.
// Editorial = the documentarian (story, taste). Technical = the builder (system, depth).
// The toggle flips the entire world; both are first-class, neither is a footnote.
export type Lens = "editorial" | "technical";

export const LENS_COOKIE = "es-lens";
export const DEFAULT_LENS: Lens = "editorial";

export function isLens(value: string | undefined): value is Lens {
  return value === "editorial" || value === "technical";
}

export function otherLens(lens: Lens): Lens {
  return lens === "editorial" ? "technical" : "editorial";
}
