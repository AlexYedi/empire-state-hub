// Negative and positive cases for the E-11 project loader rules (status-report layer).
// Run: node --experimental-strip-types --test scripts/fixtures/projects/projects.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProject } from "../../../src/lib/projects.ts";

const base = () => ({
  slug: "fixture-project",
  title: "Fixture project",
  tagline: "A fixture.",
  kind: "project",
  status: "active",
  health: "at-risk",
  phase: "Phase 1",
  owner: "Alex Yedibalian",
  started: "2026-11-01",
  updated: "2026-11-10",
  why: "Because.",
  mission: "Build it.",
  destination: "Done when done.",
  showcase: ["Something"],
  milestones: [{ title: "First", status: "active" }],
});
const F = "fixture-project.json";

test("a minimal project without the status layer still parses", () => {
  const p = validateProject(F, base());
  assert.deepEqual(p.asks, []);
  assert.equal(p.summary, undefined);
});

test("an at-risk live project with a summary but no healthWhy is rejected", () => {
  assert.throws(() => validateProject(F, { ...base(), summary: "Bottom line." }), /needs healthWhy/);
});

test("the healthWhy rule covers blocked and paused projects too", () => {
  for (const status of ["blocked", "paused"]) {
    assert.throws(() => validateProject(F, { ...base(), status, summary: "Bottom line." }), /needs healthWhy/);
  }
});

test("an on-track project with a summary needs no healthWhy", () => {
  assert.doesNotThrow(() => validateProject(F, { ...base(), health: "on-track", summary: "Bottom line." }));
});

test("sinceLast.since after updated is rejected", () => {
  const json = { ...base(), sinceLast: { since: "2026-11-11", changes: [{ kind: "done", text: "x" }] } };
  assert.throws(() => validateProject(F, json), /sinceLast.since is after updated/);
});

test("an ask must carry a recommendation, owner, cost of delay and reversibility", () => {
  const json = { ...base(), asks: [{ decision: "Pick one", owner: "Alex", costOfDelay: "x", reversible: true }] };
  assert.throws(() => validateProject(F, json), /recommendation/);
});

test("a full status layer parses", () => {
  const json = {
    ...base(),
    summary: "Bottom line.",
    healthWhy: "Objective reason.",
    trend: "improving",
    confidence: "60%: moderately confident",
    asks: [{ decision: "Pick", recommendation: "A", options: ["B"], owner: "Alex", due: "2026-11-12", costOfDelay: "x", reversible: false }],
    sinceLast: { since: "2026-11-08", changes: [{ kind: "slipped", text: "x" }] },
    issues: [{ issue: "i", impact: "m", action: "a", owner: "Alex" }],
    dependencies: [{ on: "Alex", need: "n", status: "waiting" }],
    milestones: [{ title: "First", status: "active", target: "2026-11-14", certainty: "executing" }],
    risks: [{ risk: "r", mitigation: "m", likelihood: "high", impact: "low" }],
  };
  assert.equal(validateProject(F, json).asks.length, 1);
});
