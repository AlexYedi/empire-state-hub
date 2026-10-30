// Fails the build if an editorial marker ships in public data. Long reads, room copy and builds
// copy are rendered verbatim, so "[confirm]" / "TODO" / "TBD" in src/data/** would go live as-is
// (found in the first Long Reads seed, 2026-10-30). Companion to verify-public-safe.mjs; that
// script stays untouched (guarded).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DATA = join(ROOT, "src/data");
// Generated snapshots of the private pipeline (not reader-facing prose) are out of scope.
const SKIP = new Set(["system-map.json", "system-map.files.json", "build-journal.json"]);
const MARKER = /\[confirm[^\]]*\]|\bTODO\b|\bTBD\b|\[PLACEHOLDER[^\]]*\]/i;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".json") && !SKIP.has(name) ? [p] : [];
  });

const hits = [];
for (const file of walk(DATA)) {
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    const m = line.match(MARKER);
    if (m) hits.push(`${relative(ROOT, file)}:${i + 1}  ${m[0]}`);
  });
}
if (hits.length) {
  console.error(`✗ editorial markers in public data (${hits.length}):\n  ${hits.join("\n  ")}`);
  process.exit(1);
}
console.log("✓ no editorial markers in public data");
