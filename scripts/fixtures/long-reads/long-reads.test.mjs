// Long-reads schema tests (E-02) — mirrors the rooms test lane. The authoritative
// schema is the zod union in src/lib/long-reads.ts (parsed at import, so the build
// fails on a bad file); this suite pins the same rules in JS via
// scripts/validate-long-reads.mjs, which node --test can import.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLongRead } from "../../validate-long-reads.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOMS = new Set(
  JSON.parse(readFileSync(join(HERE, "../../../src/data/rooms.json"), "utf8")).rooms.map((r) => r.slug),
);

const load = (name) => JSON.parse(readFileSync(join(HERE, name), "utf8"));

test("a valid long-read fixture parses", () => {
  const problems = validateLongRead(load("valid.json"), ROOMS);
  assert.deepEqual(problems, []);
});

test("a missing image alt fails", () => {
  const problems = validateLongRead(load("missing-alt.json"), ROOMS);
  assert.ok(problems.some((p) => p.includes("alt")), `expected an alt failure, got: ${problems.join("; ")}`);
});

test("an unknown block type fails", () => {
  const problems = validateLongRead(load("unknown-type.json"), ROOMS);
  assert.ok(problems.some((p) => p.includes("unknown block type")), `expected an unknown-type failure, got: ${problems.join("; ")}`);
});

test("a slug with no room fails", () => {
  const problems = validateLongRead(load("no-room.json"), ROOMS);
  assert.ok(problems.some((p) => p.includes("does not match any room")), `expected a no-room failure, got: ${problems.join("; ")}`);
});

test("every committed long read under src/data/long-reads is valid", () => {
  const dir = join(HERE, "../../../src/data/long-reads");
  const findings = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const problems = validateLongRead(JSON.parse(readFileSync(join(dir, name), "utf8")), ROOMS);
    for (const p of problems) findings.push(`${name}: ${p}`);
  }
  assert.deepEqual(findings, []);
});
