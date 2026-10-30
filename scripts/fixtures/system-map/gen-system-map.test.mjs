// Fixture test for the YED-236 second privacy layer: a pipeline repo where a private file was
// force-added despite matching .gitignore (tracked + ignored). The generator must refuse — exit
// non-zero, name the path — BEFORE writing anything to the hub's public data files.
//
// Only the refusal path is exercised end-to-end: a "happy" spawn with a fixture PIPELINE_DIR would
// regenerate src/data/system-map.json from fixture content, clobbering the real maps. The happy
// path is covered by the real regeneration run (`pnpm gen:system-map`) and verify-system-map.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

test("generator refuses tracked-but-gitignored pipeline files (YED-236, fail closed)", () => {
  const pipe = mkdtempSync(join(tmpdir(), "sysmap-pipeline-"));
  try {
    const git = (...args) => execFileSync("git", ["-C", pipe, ...args], { encoding: "utf8" });
    git("init", "-q");
    const commit = (...args) =>
      execFileSync("git", ["-C", pipe, "-c", "user.email=test@test", "-c", "user.name=test", "commit", ...args], { encoding: "utf8" });
    commit("--allow-empty", "-q", "-m", "init");
    writeFileSync(join(pipe, ".gitignore"), "me-model.md\n");
    mkdirSync(join(pipe, ".claude", "skills", "demo"), { recursive: true });
    writeFileSync(join(pipe, "CLAUDE.md"), "# Policy\n");
    writeFileSync(join(pipe, ".claude", "skills", "demo", "SKILL.md"), "---\nname: demo\n---\nbody\n");
    writeFileSync(join(pipe, "me-model.md"), "PRIVATE\n");
    git("add", "CLAUDE.md", ".claude/skills/demo/SKILL.md", ".gitignore");
    git("add", "-f", "me-model.md"); // the incident: force-added despite the ignore rule
    commit("-q", "-m", "tracked me-model.md");

    const run = spawnSync("node", [join(ROOT, "scripts", "gen-system-map.mjs")], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, PIPELINE_DIR: pipe },
    });
    const output = (run.stdout ?? "") + (run.stderr ?? "");
    assert.notEqual(run.status, 0, `expected refusal, got success:\n${output}`);
    assert.match(output, /privacy guard/);
    assert.match(output, /me-model\.md/, "the offending path must be named");
  } finally {
    rmSync(pipe, { recursive: true, force: true });
  }
});
