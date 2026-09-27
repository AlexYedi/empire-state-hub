// verify-system-map — the map's honesty checks, mechanically (PRD docs/system-map.prd.md §5/§6).
// Fails on: an edge or build-path item naming a component that does not exist; a curated entry
// without a sourced "why"; a status override without a reason; a component outside the 25–35 band.
// Warns (does not fail) on overlay entries whose files changed after they were last reviewed — the
// rot signal the topic-intelligence incident taught us to surface, not hide.
// Run: node scripts/verify-system-map.mjs   (wired into `pnpm check`)
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const map = JSON.parse(readFileSync(`${ROOT}src/data/system-map.json`, "utf8"));
const curated = JSON.parse(readFileSync(`${ROOT}src/data/system-map.curated.json`, "utf8"));

const problems = [];
const ids = new Set(map.components.map((c) => c.id));
const zones = new Set(map.zones.map((z) => z.id));
const curatedIds = new Set(curated.components.map((c) => c.id));

if (map.components.length < 25 || map.components.length > 35) problems.push(`component count ${map.components.length} outside the 25–35 band (AC1)`);
for (const c of map.components) {
  if (!zones.has(c.zone)) problems.push(`${c.id}: unknown zone ${c.zone}`);
  if (!curatedIds.has(c.id)) problems.push(`${c.id}: in the generated map but not in the overlay (regenerate)`);
  if (!c.why?.text || !c.why?.source) problems.push(`${c.id}: why.text / why.source missing`);
  if (c.status !== "live" && !c.statusReason) problems.push(`${c.id}: status ${c.status} without a reason`);
  if (!c.description) problems.push(`${c.id}: empty description`);
}
for (const c of curated.components) if (!ids.has(c.id)) problems.push(`${c.id}: in the overlay but missing from the generated map (regenerate)`);
for (const e of map.edges) if (!ids.has(e.source) || !ids.has(e.target)) problems.push(`edge ${e.id}: unknown endpoint`);
for (const it of map.buildPath.items) for (const x of it.extends) if (!ids.has(x)) problems.push(`${it.issue}: extends unknown component ${x}`);
if (!map.buildPath.anchors.length) problems.push("no anchors parsed from roadmap.md § 6");
// Phase is computed from roadmap.md by the generator; a phase written into prose is duplicated,
// unreconciled state (the YED-226 defect the judge caught on 2026-09-27) — refuse it.
for (const it of curated.buildPath.items) if (/\bP[0-3]\b|\(P[0-3]\)|Phase [0-3]/.test(it.why)) problems.push(`${it.issue}: phase tag written in prose ("${it.why.match(/\(?P[0-3]\)?|Phase [0-3]/)[0]}") — the generator derives phase from roadmap.md; remove it`);

// YED-236: no path in the public files map may be gitignored in the pipeline repo. Runs wherever the
// pipeline checkout is present (every local generate); skipped with a note where it isn't (Vercel build).
let privacyNote = "";
const PIPELINE_DIR = process.env.PIPELINE_DIR || join(ROOT, "..", "Empire_State_Events_Pipeline_Take_3");
if (existsSync(join(PIPELINE_DIR, ".git"))) {
  const files = JSON.parse(readFileSync(`${ROOT}src/data/system-map.files.json`, "utf8"));
  const paths = [...new Set([...files.nodes.map((n) => n.id), ...files.edges.flatMap((e) => [e.src, e.dst])])]
    .filter((p) => p && !p.startsWith("~") && !p.startsWith("/"));
  let hits = [];
  try {
    hits = execFileSync("git", ["-C", PIPELINE_DIR, "check-ignore", "--stdin"], { input: paths.join("\n"), encoding: "utf8" })
      .split("\n").map((s) => s.trim()).filter(Boolean);
  } catch (e) {
    if (e.status !== 1) problems.push(`privacy check could not run (git check-ignore failed in ${PIPELINE_DIR})`);
  }
  for (const h of hits) problems.push(`privacy: ${h} is gitignored in the pipeline repo but appears in system-map.files.json (YED-236)`);
  privacyNote = ` · privacy ✓ (${paths.length} paths)`;
} else {
  privacyNote = " · privacy check skipped (no pipeline checkout)";
}

const stale = map.components.filter((c) => c.overlayStale).map((c) => c.id);

if (problems.length) {
  console.log(`✗ verify-system-map: ${problems.length} problem(s)`);
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}
console.log(`✓ verify-system-map: ${map.components.length} components · ${map.edges.length} edges · ${map.buildPath.items.length} planned · anchors ${map.buildPath.anchors.map((a) => a.id).join(",")}${privacyNote}`);
if (stale.length) console.log(`  ! ${stale.length} curated entr${stale.length === 1 ? "y" : "ies"} may lag the code (files changed after reviewed_at): ${stale.join(", ")}`);
