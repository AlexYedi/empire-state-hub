// Typed loader over the CANONICAL arc data (build-arcs.json). That JSON is the single source of
// truth for this page. Arc copy is hand-curated, so it carries an `asOf` date and a `sinceNote`
// naming what changed after it was written — the page shows both instead of quietly going stale.
// (The pipeline's gen_build_arcs_artifact.py was retired in the 2026-09-28 reset.)

import data from "./build-arcs.json";

export type ArcTheme = "intelligence" | "surface" | "distribution" | "craft";

export type BuildArc = {
  id: string;
  theme: ArcTheme;
  foundation?: boolean; // the theme's foundation anchor; children build on it
  name: string;
  tagline: string;
  what: string;
  why: string;
  value: string;
  bestPractices: string;
  v1Limits: string;
  future: string;
  enterprise: string;
};

export const THEMES = data.themes as { id: ArcTheme; label: string; blurb: string }[];

export const BUILD_ARCS = data as unknown as {
  intro: string;
  asOf: string;
  sinceNote?: string;
  arcs: BuildArc[];
  throughLine: string;
};
