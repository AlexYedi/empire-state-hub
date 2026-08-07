// Typed loader over the CANONICAL arc data (build-arcs.json). That JSON is the single source of
// truth — this hub page and the shareable Artifact both derive from it, so they can't drift.
// To change an arc, edit build-arcs.json; then regenerate the Artifact (see the pipeline repo's
// gen_build_arcs_artifact.py). Do not hand-edit arc copy in two places again.

import data from "./build-arcs.json";

export type ArcTheme = "intelligence" | "rigor" | "surface" | "distribution" | "craft";

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
  arcs: BuildArc[];
  throughLine: string;
};
