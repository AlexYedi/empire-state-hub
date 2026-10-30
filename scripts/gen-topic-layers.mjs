#!/usr/bin/env node
// gen-topic-layers.mjs — build src/data/topic-layers.json for the /themes "By layer" view
// (E-10 item 3 / YED-126). The source of truth is the sibling pipeline repo's S-03 export:
// .claude/references/topic-layers.json (topic id → { layer, secondary, duplicate_of }) joined
// with .claude/references/topics-snapshot.json (topic id → name). The join happens here, once,
// so the hub ships a committed, reviewable file keyed by NAME — no graph access at runtime.
//
// duplicate_of is dropped on purpose: it is a PROPOSAL awaiting Alex's ruling, and the hub
// view must not collapse or dedupe topics on it.
//
// Run: pnpm gen:topic-layers           (PIPELINE_DIR=/path/to/pipeline to override the sibling default)
// Exits non-zero on: missing/untracked inputs, a snapshot id the map doesn't cover (or vice versa),
// a duplicate topic name, a layer id outside the S-03 architecture, or secondary == layer.
// Room topics with no graph mapping are a known vocabulary drift — printed loudly, excluded from
// the map, and surfaced as a coverage count in the UI rather than silently absorbed.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HUB = join(dirname(fileURLToPath(import.meta.url)), "..");
const PIPELINE_DIR = process.env.PIPELINE_DIR || join(HUB, "..", "Empire_State_Events_Pipeline_Take_3");
const LAYERS_REF = ".claude/references/topic-layers.json";
const SNAPSHOT_REF = ".claude/references/topics-snapshot.json";
const ARCHITECTURE_REF = ".claude/references/reference-architecture.md";
const OUT = join(HUB, "src", "data", "topic-layers.json");
const REPO = "AlexYedi/Empire_State_Events_Pipeline_Take_3";

const fail = (msg) => {
  console.error(`gen-topic-layers: ${msg}`);
  process.exit(1);
};

function git(...args) {
  const opts = typeof args.at(-1) === "object" ? args.pop() : {};
  try {
    return execFileSync("git", ["-C", PIPELINE_DIR, ...args], { encoding: "utf8" }).trim();
  } catch {
    if (opts.allowFail) return null;
    fail(`git ${args[0]} failed in ${PIPELINE_DIR}`);
  }
}

// ---------- inputs ----------
const refs = [LAYERS_REF, SNAPSHOT_REF, ARCHITECTURE_REF];
for (const rel of refs) {
  if (!existsSync(join(PIPELINE_DIR, rel))) fail(`${rel}: not found in PIPELINE_DIR (${PIPELINE_DIR})`);
  // YED-236 pattern: refuse anything not cleanly tracked in the pipeline repo — an
  // untracked or tracked-but-ignored reference must never feed a public data file.
  if (!git("ls-files", "--", rel)) fail(`${rel}: not tracked in the pipeline repo`);
  if (git("check-ignore", "-q", rel, { allowFail: true }) !== null) {
    fail(`${rel}: is gitignored in the pipeline repo — privacy guard (YED-236 pattern)`);
  }
}

let rawLayers;
let snapshot;
try {
  rawLayers = JSON.parse(readFileSync(join(PIPELINE_DIR, LAYERS_REF), "utf8"));
  snapshot = JSON.parse(readFileSync(join(PIPELINE_DIR, SNAPSHOT_REF), "utf8"));
} catch (e) {
  fail(`unreadable reference JSON: ${e.message}`);
}
const architecture = readFileSync(join(PIPELINE_DIR, ARCHITECTURE_REF), "utf8");

// The S-03 contract: layer ids are exactly the `### <id>` headings under `## Layers`
// in reference-architecture.md — parsed, never hardcoded twice.
const LAYER_IDS = [...architecture.matchAll(/^### ([a-z0-9-]+)$/gm)].map((m) => m[1]);
if (LAYER_IDS.length === 0) fail("no layer headings parsed from reference-architecture.md");

// ---------- validate the map ----------
const idName = new Map(snapshot.topics.map((t) => [t.id, t.name]));
if (idName.size !== snapshot.topics.length) fail("topics-snapshot.json: duplicate topic id");

const mapIds = new Set(Object.keys(rawLayers));
const snapIds = new Set(idName.keys());
const missingFromMap = [...snapIds].filter((id) => !mapIds.has(id));
const unknownToSnapshot = [...mapIds].filter((id) => !snapIds.has(id));
if (missingFromMap.length)
  fail(`topic-layers.json: ${missingFromMap.length} snapshot id(s) unmapped, e.g. ${missingFromMap[0]} (${idName.get(missingFromMap[0])})`);
if (unknownToSnapshot.length) fail(`topic-layers.json: id not in snapshot: ${unknownToSnapshot[0]}`);

const byName = new Map();
for (const [id, entry] of Object.entries(rawLayers)) {
  const name = idName.get(id);
  if (byName.has(name)) fail(`duplicate topic name across ids: "${name}"`);
  if (!LAYER_IDS.includes(entry.layer)) fail(`"${name}": unknown layer "${entry.layer}" (valid: ${LAYER_IDS.join(", ")})`);
  if (entry.secondary != null) {
    if (!LAYER_IDS.includes(entry.secondary)) fail(`"${name}": unknown secondary layer "${entry.secondary}"`);
    if (entry.secondary === entry.layer) fail(`"${name}": secondary equals layer`);
  }
  byName.set(name, { id, layer: entry.layer, secondary: entry.secondary ?? null });
}

// ---------- cross-reference the hub's rooms ----------
const rooms = JSON.parse(readFileSync(join(HUB, "src", "data", "rooms.json"), "utf8")).rooms;
const roomTopicNames = [...new Set(rooms.flatMap((r) => r.topics ?? []))].sort();
const unmapped = roomTopicNames.filter((name) => !byName.has(name));
if (unmapped.length) {
  console.warn(`gen-topic-layers: WARNING — ${unmapped.length} room topic(s) have no graph mapping and are excluded from layer counts:`);
  for (const name of unmapped) console.warn(`  - ${name}`);
  console.warn("gen-topic-layers: align names in the graph or rooms export, then regenerate.");
}

// ---------- emit ----------
const order = new Map(LAYER_IDS.map((id, i) => [id, i]));
const topics = [...byName.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .sort(([, x], [, y]) => order.get(x.layer) - order.get(y.layer))
  .map(([name, { id, layer, secondary }]) => (secondary ? { id, name, layer, secondary } : { id, name, layer }));

const commit = git("rev-parse", "--short", "HEAD");
const output = {
  generatedAt: new Date().toISOString(),
  source: {
    repo: REPO,
    commit,
    paths: refs,
    asOf: snapshot.as_of,
  },
  topics,
};

writeFileSync(OUT, JSON.stringify(output, null, 2) + "\n");

// Per-layer room counts — printed for the PR body, same as the pipeline's topic_layers.py selftest.
const perLayer = new Map(LAYER_IDS.map((id) => [id, new Set()]));
const secondaryRooms = new Map(LAYER_IDS.map((id) => [id, new Set()]));
for (const room of rooms) {
  for (const name of room.topics ?? []) {
    const t = byName.get(name);
    if (!t) continue;
    perLayer.get(t.layer)?.add(room.slug);
    if (t.secondary) secondaryRooms.get(t.secondary)?.add(room.slug);
  }
}
console.log(
  `gen-topic-layers: wrote ${topics.length} topics across ${LAYER_IDS.length} layers → src/data/topic-layers.json (pipeline @ ${commit}, as of ${snapshot.as_of})`,
);
for (const id of LAYER_IDS) {
  const count = perLayer.get(id).size;
  const viaSecondary = secondaryRooms.get(id).size;
  console.log(`  ${id.padEnd(22)} ${String(count).padStart(2)} rooms${viaSecondary ? ` (+${viaSecondary} via secondary)` : ""}`);
}
