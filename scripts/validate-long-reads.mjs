// validate-long-reads — E-02. The authoritative schema is the zod union in
// src/lib/long-reads.ts (parsed at import, so a bad file fails the build). This
// module mirrors it in plain JS for the node --test lane, which cannot import TS:
// `pnpm check` runs the same rules over fixtures AND over every committed file in
// src/data/long-reads/, so drift in either copy fails CI.
//
// Run standalone: node scripts/validate-long-reads.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const BLOCK_TYPES = new Set(["heading", "paragraph", "quote", "image", "stat", "callout", "sources"]);

const isNonEmpty = (x) => typeof x === "string" && x.trim().length > 0;

/**
 * Validates one long-read file against the E-02 v1 rules. Returns a list of
 * problems (empty = valid). `roomSlugs` is the set of slugs in src/data/rooms.json.
 */
export function validateLongRead(data, roomSlugs) {
  const problems = [];
  const err = (m) => problems.push(m);

  if (!isNonEmpty(data.slug)) err("slug must be a non-empty string");
  else if (!roomSlugs.has(data.slug)) err(`slug "${data.slug}" does not match any room in src/data/rooms.json`);
  if (!isNonEmpty(data.updated)) err("updated must be a non-empty string");
  if (!Array.isArray(data.blocks) || data.blocks.length === 0) {
    err("blocks must be a non-empty array");
    return problems;
  }

  data.blocks.forEach((block, i) => {
    const at = `blocks[${i}] (${block?.type ?? "unknown"})`;
    if (!BLOCK_TYPES.has(block?.type)) {
      err(`${at}: unknown block type "${block?.type}" — v1 allows ${[...BLOCK_TYPES].join(", ")} (video is out of scope)`);
      return;
    }
    if (block.type === "quote" && !isNonEmpty(block.attribution)) err(`${at}: quote must carry attribution`);
    if (block.type === "image") {
      if (!isNonEmpty(block.alt)) err(`${at}: image must carry alt text (required by spec)`);
      if (!isNonEmpty(block.src)) err(`${at}: image must carry src`);
    }
    if (block.type === "stat") {
      for (const f of ["value", "label", "source"]) if (!isNonEmpty(block[f])) err(`${at}: stat must carry ${f}`);
    }
    if (block.type === "sources") {
      if (!Array.isArray(block.items) || block.items.length === 0) err(`${at}: sources must have at least one item`);
      else
        block.items.forEach((s, j) => {
          if (!isNonEmpty(s?.label)) err(`${at}: sources.items[${j}] must have a label`);
          if (s?.url !== undefined && !(typeof s.url === "string" && (/^https?:\/\//.test(s.url) || s.url.startsWith("/"))))
            err(`${at}: sources.items[${j}].url must be absolute or site-relative`);
        });
    }
    if (["heading", "paragraph", "callout"].includes(block.type) && !isNonEmpty(block.text))
      err(`${at}: ${block.type} must have text`);
  });

  return problems;
}

function roomSlugs() {
  const rooms = JSON.parse(readFileSync(join(ROOT, "src/data/rooms.json"), "utf8"));
  return new Set(rooms.rooms.map((r) => r.slug));
}

function scanCommitted() {
  const slugs = roomSlugs();
  const dir = join(ROOT, "src/data/long-reads");
  const findings = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const problems = validateLongRead(JSON.parse(readFileSync(join(dir, name), "utf8")), slugs);
    for (const p of problems) findings.push(`src/data/long-reads/${name}: ${p}`);
  }
  return findings;
}

if (process.argv[1] && process.argv[1].endsWith("validate-long-reads.mjs")) {
  const findings = scanCommitted();
  if (findings.length) {
    console.log(`✗ validate-long-reads: ${findings.length} finding(s)`);
    for (const f of findings) console.log("  " + f);
    process.exit(1);
  }
  console.log("✓ validate-long-reads: every committed long read parses and matches a room");
}
