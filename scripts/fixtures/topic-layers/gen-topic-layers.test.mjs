// Fixture test for gen-topic-layers.mjs (E-10 item 3 / YED-126): the generator must fail closed
// when the pipeline's layer map does not cover the topics snapshot — an unmapped topic id would
// otherwise silently shrink the hub's layer counts. Also: an untracked reference file must be
// refused (YED-236 pattern) before anything is written to src/data/.
//
// Only refusal paths are exercised end-to-end: a "happy" run against a fixture would regenerate
// the real src/data/topic-layers.json. The happy path is covered by the actual regeneration
// (pnpm gen:topic-layers against the sibling checkout).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function fixturePipeline(layerMap, { trackRefs = true } = {}) {
  const pipe = mkdtempSync(join(tmpdir(), "topic-layers-pipeline-"));
  mkdirSync(join(pipe, ".claude", "references"), { recursive: true });
  writeFileSync(
    join(pipe, ".claude", "references", "topics-snapshot.json"),
    JSON.stringify({ as_of: "2026-10-30", source: "public.topic (id, name only)", topics: [{ id: "11111111-1111-1111-1111-111111111111", name: "RAG (Retrieval-Augmented Generation)" }] }),
  );
  writeFileSync(join(pipe, ".claude", "references", "topic-layers.json"), JSON.stringify(layerMap));
  writeFileSync(
    join(pipe, ".claude", "references", "reference-architecture.md"),
    "# Applied-AI Reference Architecture\n\n## Layers\n\n### data-retrieval\n\nGetting context to models.\n",
  );
  // Always a real git repo: the untracked case under guard is a reference file inside a live
  // checkout that was never committed, not a directory with no git at all.
  const git = (...args) => spawnSync("git", ["-C", pipe, ...args], { encoding: "utf8" });
  git("init", "-q");
  if (trackRefs) {
    git("add", ".claude/references");
  } else {
    writeFileSync(join(pipe, "README.md"), "# fixture\n");
    git("add", "README.md");
  }
  git("-c", "user.email=test@test", "-c", "user.name=test", "commit", "-q", "--allow-empty", "-m", "init");
  return pipe;
}

function runGenerator(pipe) {
  return spawnSync("node", [join(ROOT, "scripts", "gen-topic-layers.mjs")], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, PIPELINE_DIR: pipe },
  });
}

test("generator refuses an unmapped snapshot id (fail closed, names the topic)", () => {
  const pipe = fixturePipeline({}); // snapshot has one topic, the map has none
  try {
    const run = runGenerator(pipe);
    const output = (run.stdout ?? "") + (run.stderr ?? "");
    assert.notEqual(run.status, 0, `expected refusal, got success:\n${output}`);
    assert.match(output, /unmapped/i);
    assert.match(output, /RAG/, "the offending topic must be named");
  } finally {
    rmSync(pipe, { recursive: true, force: true });
  }
});

test("generator refuses an untracked reference file (YED-236 pattern)", () => {
  const map = { "11111111-1111-1111-1111-111111111111": { layer: "data-retrieval", secondary: null, duplicate_of: null } };
  const pipe = fixturePipeline(map, { trackRefs: false });
  try {
    const run = runGenerator(pipe);
    const output = (run.stdout ?? "") + (run.stderr ?? "");
    assert.notEqual(run.status, 0, `expected refusal, got success:\n${output}`);
    assert.match(output, /not tracked/);
  } finally {
    rmSync(pipe, { recursive: true, force: true });
  }
});

test("generator refuses a layer id outside the reference architecture", () => {
  const map = { "11111111-1111-1111-1111-111111111111": { layer: "vibes", secondary: null, duplicate_of: null } };
  const pipe = fixturePipeline(map);
  try {
    const run = runGenerator(pipe);
    const output = (run.stdout ?? "") + (run.stderr ?? "");
    assert.notEqual(run.status, 0, `expected refusal, got success:\n${output}`);
    assert.match(output, /unknown layer/);
  } finally {
    rmSync(pipe, { recursive: true, force: true });
  }
});
