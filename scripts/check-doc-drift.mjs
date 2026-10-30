#!/usr/bin/env node
// check-doc-drift.mjs — the documentation-rot trigger (Shared hygiene bundle).
// Agent guidance (AGENTS.md, .obvious/obvious.md) names files, scripts and commands. When the code
// it describes moves or dies, the guidance rots silently — the same spec-vs-doc drift the
// topic-intelligence incident taught us to surface. This check makes two failure modes visible:
//
//   1. STALE (fails): the guidance references a path that no longer exists in the repo it describes.
//   2. DRIFTING (warns only): a referenced file's last commit is newer than the guidance doc's —
//      someone changed the code without re-reading the doc that describes it. A rot signal, like
//      gen-system-map's overlayStale; review the entry, then update the doc.
//
// Scope is references, not claims — it can prove a path is gone, not that a sentence stayed true.
// Run: node scripts/check-doc-drift.mjs                     (this repo's guidance)
//      node scripts/check-doc-drift.mjs --dir=_pipeline     (another checkout's guidance)
// Exit 1 only on stale references; drift warnings never block.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
  const [k, v = "true"] = a.replace(/^--/, "").split("=");
  return [k, v];
}));
const REPO = resolve(args.dir || join(dirname(fileURLToPath(import.meta.url)), ".."));
const DOCS = ["AGENTS.md", ".obvious/obvious.md"].map((d) => join(REPO, d)).filter((p) => existsSync(p));

if (!DOCS.length) {
  console.error(`✗ doc-drift: no AGENTS.md or .obvious/obvious.md found in ${REPO}`);
  process.exit(1);
}

const EXT = String.raw`(?:md|py|sh|sql|mjs|ts|tsx|js|json|ya?ml|txt|example)`;
// A repo-relative path with a known extension. Bare filenames are ambiguous (which repo? which
// copy?) so they are out of scope — the check errs toward under-flagging.
const PATH_RE = new RegExp(String.raw`(?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\.${EXT}`, "g");
const IGNORE = [/^node_modules\//, /^\.git\//, /^_pipeline\//];

// One git pass over history: { path → last commit date (YYYY-MM-DD) }.
function lastCommitDates() {
  const dates = new Map();
  try {
    const out = execFileSync("git", ["-C", REPO, "log", "--name-only", "--format=%x00%cs", "--no-renames"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    let date = "";
    for (const line of out.split("\n")) {
      if (line.startsWith("\0")) {
        date = line.slice(1).trim();
        continue;
      }
      const f = line.trim();
      if (f && date && !dates.has(f)) dates.set(f, date); // log is newest-first
    }
  } catch {
    // no git history (shallow checkout) — drift warnings degrade to "unknown", stale checks still run
  }
  return dates;
}

const dates = lastCommitDates();
const problems = [];
const drifting = [];
let checked = 0;

for (const doc of DOCS) {
  const docRel = doc.slice(REPO.length + 1);
  const text = readFileSync(doc, "utf8");
  for (const line of text.split("\n")) {
    if (/https?:\/\//.test(line)) continue; // a URL's path is not a repo reference (conservative)
    for (const m of line.matchAll(PATH_RE)) {
      const ref = m[0];
      if (ref === docRel || IGNORE.some((r) => r.test(ref))) continue;
      if (/[*<>…{}]/.test(ref)) continue; // glob / placeholder / ellipsis / brace-contraction — skip
      checked++;
      if (!existsSync(join(REPO, ref))) {
        problems.push(`${docRel}: references ${ref} — file does not exist (stale guidance)`);
        continue;
      }
      const docDate = dates.get(docRel);
      const refDate = dates.get(ref);
      if (docDate && refDate && refDate > docDate) drifting.push(`${docRel}: ${ref} changed ${refDate}, doc last touched ${docDate}`);
    }
  }
}

const docNames = DOCS.map((d) => d.slice(REPO.length + 1)).join(", ");
if (problems.length) {
  console.log(`✗ doc-drift: ${problems.length} stale reference(s) in ${docNames}`);
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}
console.log(`✓ doc-drift: ${checked} referenced path(s) across ${docNames} all exist`);
if (drifting.length) {
  console.log(`  ! ${drifting.length} reference(s) may have drifted (code changed after the doc — re-read, then update):`);
  for (const d of drifting) console.log("    " + d);
}
