#!/usr/bin/env node
// gen-system-map.mjs — build src/data/system-map.json (+ system-map.files.json) for the public
// /architecture map. Facts come from the pipeline repo (frontmatter, the ADR-8 system graph, git
// dates, roadmap.md); judgement comes from src/data/system-map.curated.json and is preserved as-is
// (merge-don't-clobber, same rule as gen-toolbox). PRD: docs/system-map.prd.md (YED-232).
//
// Run: pnpm gen:system-map            (PIPELINE_DIR=/path/to/pipeline to override the sibling default)
// Prints: components + files resolved · patterns matching nothing · unmapped files · overlay entries
// whose files changed after `reviewed_at` (the rot signal — review them, then bump the date).
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HUB = join(dirname(fileURLToPath(import.meta.url)), "..");
const PIPELINE_DIR = process.env.PIPELINE_DIR || join(HUB, "..", "Empire_State_Events_Pipeline_Take_3");
const GRAPH_DIR = join(PIPELINE_DIR, ".claude", ".state", "system-graph");
const CURATED = join(HUB, "src", "data", "system-map.curated.json");
const OUT = join(HUB, "src", "data", "system-map.json");
const OUT_FILES = join(HUB, "src", "data", "system-map.files.json");
const REPO_URL = "https://github.com/AlexYedi/Empire_State_Events_Pipeline_Take_3/blob/main/";
const LINEAR_URL = "https://linear.app/yedibalian/issue/";

// ---------- small helpers ----------
const readJsonl = (p) =>
  readFileSync(p, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : "";
}
// Same scanner gen-toolbox uses (folded / block / wrapped scalars).
function field(block, key) {
  const lines = block.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(new RegExp(`^${key}:\\s*(.*)$`));
    if (!m) continue;
    const v = m[1].trim();
    const parts = ["", ">", "|", ">-", "|-"].includes(v) ? [] : [v.replace(/^["']|["']$/g, "")];
    for (let j = i + 1; j < lines.length; j++) {
      if (/^[A-Za-z_-]+:/.test(lines[j])) break;
      if (lines[j].trim()) parts.push(lines[j].trim());
    }
    return parts.join(" ").trim();
  }
  return "";
}
const collapse = (s) => s.replace(/\s+/g, " ").trim();
const firstSentence = (s, max = 220) => {
  const t = collapse(s);
  const m = t.match(/^.*?[.!?](\s|$)/);
  const out = m ? m[0].trim() : t;
  return out.length > max ? out.slice(0, max - 1) + "…" : out;
};

// What a file says it is, from its own header — never invented.
function describeFile(rel) {
  const p = join(PIPELINE_DIR, rel);
  if (!existsSync(p)) return "";
  const text = readFileSync(p, "utf8");
  if (rel.endsWith(".md")) {
    const fm = frontmatter(text);
    const d = field(fm, "description");
    if (d) return firstSentence(d);
    const title = text.split("\n").find((l) => l.startsWith("# "));
    return title ? title.replace(/^#\s*/, "").trim() : "";
  }
  if (rel.endsWith(".py")) {
    const m = text.match(/"""([\s\S]*?)"""/);
    return m ? firstSentence(m[1]) : "";
  }
  if (rel.endsWith(".sh")) {
    const lines = text.split("\n").slice(1, 6).filter((l) => /^#\s*\S/.test(l));
    return lines.length ? firstSentence(lines.map((l) => l.replace(/^#\s?/, "")).join(" ")) : "";
  }
  if (rel.endsWith(".json")) return "";
  return "";
}

// MCP servers / models an artifact declares. Hashed server ids (a connector's uuid) are Notion.
const MCP_NAMES = {
  notion: "Notion MCP",
  claude_ai_Gmail: "Gmail MCP",
  claude_ai_HubSpot: "HubSpot MCP",
  claude_ai_Google_Calendar: "Google Calendar MCP",
  claude_ai_Supabase: "Supabase MCP",
  claude_ai_Granola: "Granola MCP",
  claude_ai_PostHog: "PostHog MCP",
  claude_ai_ChatPRD: "ChatPRD MCP",
  linear: "Linear MCP",
};
const MODEL_NAMES = { opus: "Opus", sonnet: "Sonnet", haiku: "Haiku" };
function toolsOf(rel) {
  const p = join(PIPELINE_DIR, rel);
  if (!existsSync(p) || !rel.endsWith(".md")) return [];
  const text = readFileSync(p, "utf8");
  const out = new Set();
  for (const m of text.matchAll(/mcp__([A-Za-z0-9_-]+?)__/g)) {
    const key = m[1];
    if (/^[0-9a-f]{8}-/.test(key)) out.add("Notion MCP");
    else if (MCP_NAMES[key]) out.add(MCP_NAMES[key]);
    else out.add(`${key} MCP`);
  }
  const fm = frontmatter(text);
  const tools = field(fm, "tools");
  if (/\bWebSearch\b/.test(tools)) out.add("WebSearch");
  if (/\bWebFetch\b/.test(tools)) out.add("WebFetch");
  const model = field(fm, "model").toLowerCase();
  if (MODEL_NAMES[model]) out.add(`${MODEL_NAMES[model]} (agent model)`);
  return [...out];
}

// ---------- git dates: one pass over history, per-file first/last touch ----------
function gitDates() {
  const first = new Map();
  const last = new Map();
  let sha = "unknown";
  try {
    sha = execFileSync("git", ["-C", PIPELINE_DIR, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
    const log = execFileSync(
      "git",
      ["-C", PIPELINE_DIR, "log", "--name-only", "--format=%x00%ad", "--date=short", "--no-renames"],
      { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
    );
    let date = "";
    for (const line of log.split("\n")) {
      if (line.startsWith("\0")) {
        date = line.slice(1).trim();
        continue;
      }
      const f = line.trim();
      if (!f) continue;
      if (!last.has(f)) last.set(f, date); // log is newest-first
      first.set(f, date); // keeps overwriting → ends on the oldest
    }
  } catch (e) {
    console.error(`  ! git history unavailable (${e.message.split("\n")[0]}); dates will be null`);
  }
  return { first, last, sha };
}

// ---------- roadmap: phases (issue → phase) + anchors ----------
function roadmap() {
  const p = join(PIPELINE_DIR, ".claude", "references", "roadmap.md");
  const phases = [];
  const anchors = [];
  if (!existsSync(p)) return { phases, anchors, issuePhase: new Map() };
  const text = readFileSync(p, "utf8");
  let cur = null;
  let inAnchors = false;
  for (const line of text.split("\n")) {
    const ph = line.match(/^### (Phase \d+) — (.+?) ·? ?(P\d)? ?\((.*?)\)(?: → \*\*(A\d)\*\*)?/);
    if (ph) {
      cur = { id: ph[3] || ph[1].replace(" ", "").toLowerCase(), label: `${ph[1]} — ${ph[2]}`, window: ph[4], anchor: ph[5] || null, issues: [] };
      phases.push(cur);
      inAnchors = false;
      continue;
    }
    if (/^## 6\./.test(line)) {
      inAnchors = true;
      cur = null;
      continue;
    }
    if (/^## /.test(line)) {
      inAnchors = false;
      cur = null;
    }
    if (cur && line.startsWith("|")) {
      for (const m of line.matchAll(/YED-\d+/g)) if (!cur.issues.includes(m[0])) cur.issues.push(m[0]);
    }
    if (inAnchors) {
      const a = line.match(/^\| \*\*(A\d) · (.+?)\*\* \((M\d)\) \| (\d{4}-\d{2}-\d{2}) \| (.+?) \|/);
      if (a) anchors.push({ id: a[1], label: a[2], milestone: a[3], date: a[4], proof: a[5] });
    }
  }
  const issuePhase = new Map();
  for (const ph of phases) for (const i of ph.issues) if (!issuePhase.has(i)) issuePhase.set(i, ph.id);
  return { phases, anchors, issuePhase };
}

// ---------- hub routes (the hub component's "files" are its own pages) ----------
function hubRoutes() {
  const app = join(HUB, "src", "app");
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === "page.tsx") {
        const route = dir.slice(app.length).replace(/\/\((public)\)/g, "") || "/";
        out.push(route);
      }
    }
  };
  if (existsSync(app)) walk(app);
  return out.sort();
}

// ---------- pattern → graph nodes ----------
function matcher(pattern) {
  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -2);
    return (id) => id.startsWith(prefix);
  }
  return (id) => id === pattern;
}

function main() {
  if (!existsSync(join(GRAPH_DIR, "nodes.jsonl"))) {
    console.error(
      `✗ ADR-8 graph not found at ${GRAPH_DIR}\n  Run \`python3 .claude/scripts/build_graph.py\` in the pipeline repo (or set PIPELINE_DIR) and retry.`,
    );
    process.exit(1);
  }
  const curated = JSON.parse(readFileSync(CURATED, "utf8"));
  let prev = { components: [], buildPath: { items: [] } };
  try { prev = JSON.parse(readFileSync(OUT, "utf8")); } catch { /* first run */ }
  const nodes = readJsonl(join(GRAPH_DIR, "nodes.jsonl")).filter((n) => n.exists !== false);
  const edges = readJsonl(join(GRAPH_DIR, "edges.jsonl")).filter((e) => e.exists !== false);
  const meta = existsSync(join(GRAPH_DIR, "meta.json")) ? JSON.parse(readFileSync(join(GRAPH_DIR, "meta.json"), "utf8")) : {};
  const nodeIds = nodes.map((n) => n.id);
  const { first, last, sha } = gitDates();
  const rm = roadmap();

  const fileOwner = new Map(); // node id → component id (first match wins; curated order = priority)
  const emptyPatterns = [];
  const overlayStale = [];
  const warnings = [];

  const components = curated.components.map((c) => {
    const files = [];
    for (const pat of c.files ?? []) {
      const hit = nodeIds.filter(matcher(pat));
      if (!hit.length) emptyPatterns.push(`${c.id}: ${pat}`);
      for (const id of hit) {
        if (!files.includes(id)) files.push(id);
        if (!fileOwner.has(id)) fileOwner.set(id, c.id);
      }
    }
    const primary = files[0] ?? null;
    const description = c.summary || (primary ? describeFile(primary) : "");
    if (!description) warnings.push(`${c.id}: no summary and no describable primary file`);

    const tools = new Set(c.tools ?? []);
    for (const f of files) for (const t of toolsOf(f)) tools.add(t);

    const firsts = files.map((f) => first.get(f)).filter(Boolean).sort();
    const lasts = files.map((f) => last.get(f)).filter(Boolean).sort();
    const firstShipped = firsts[0] ?? null;
    const lastChanged = lasts[lasts.length - 1] ?? null;
    if (lastChanged && c.reviewed_at && lastChanged > c.reviewed_at) overlayStale.push(`${c.id} (changed ${lastChanged}, reviewed ${c.reviewed_at})`);

    const status = c.status?.value ?? "live";
    if (c.status && !c.status.reason) warnings.push(`${c.id}: status override without a reason`);
    if (!c.why?.text || !c.why?.source) warnings.push(`${c.id}: why.text / why.source missing`);

    const refs = (c.build?.refs ?? []).map((r) => ({ id: r, url: LINEAR_URL + r }));
    const adrs = files.filter((f) => f.startsWith("docs/adr/")).map((f) => ({ id: basename(f, ".md").replace(/^ADR-(\d+)-.*/, "ADR-$1"), url: REPO_URL + f }));

    return {
      id: c.id,
      zone: c.zone,
      name: c.name,
      kind: c.kind,
      status,
      statusReason: c.status?.reason ?? null,
      description,
      why: c.why,
      build: { firstShipped, lastChanged, refs, adrs, note: c.build?.note ?? null },
      tools: [...tools].sort(),
      files: c.id === "hub" ? hubRoutes().map((r) => `hub:${r}`) : files,
      fileCount: c.id === "hub" ? hubRoutes().length : files.length,
      reviewed_at: c.reviewed_at,
      overlayStale: overlayStale.some((s) => s.startsWith(c.id + " ")),
    };
  });

  // edges: validate endpoints, give each a stable id
  const ids = new Set(components.map((c) => c.id));
  const edgesOut = curated.edges.map((e, i) => {
    if (!ids.has(e.source) || !ids.has(e.target)) warnings.push(`edge ${i}: unknown endpoint ${e.source} → ${e.target}`);
    return { id: `${e.source}--${e.kind}--${e.target}`, ...e, status: e.status ?? "live" };
  });
  const seen = new Set();
  for (const e of edgesOut) {
    if (seen.has(e.id)) warnings.push(`duplicate edge id ${e.id}`);
    seen.add(e.id);
  }

  // build path: attach roadmap phase; Linear state is fetched live by the page
  const items = curated.buildPath.items.map((it) => {
    for (const x of it.extends) if (!ids.has(x)) warnings.push(`buildPath ${it.issue}: unknown component ${x}`);
    return { ...it, phase: rm.issuePhase.get(it.issue) ?? "now", url: LINEAR_URL + it.issue };
  });

  // file layer: every existing graph node, who owns it, what it says it is
  const unmapped = nodeIds.filter((id) => !fileOwner.has(id));
  const filesOut = {
    generated_note: "GENERATED by scripts/gen-system-map.mjs from the pipeline's ADR-8 system graph. Do not hand-edit.",
    nodes: nodes.map((n) => ({
      id: n.id,
      subtype: n.subtype,
      component: fileOwner.get(n.id) ?? null,
      description: describeFile(n.id),
      firstShipped: first.get(n.id) ?? null,
      lastChanged: last.get(n.id) ?? null,
      url: REPO_URL + n.id,
    })),
    edges: edges.map((e) => ({ src: e.src, dst: e.dst, line: e.evidence?.line ?? null })),
  };

  const out = {
    generated_note:
      "GENERATED by scripts/gen-system-map.mjs. Facts (descriptions, dates, tools, files) come from the pipeline repo; " +
      "judgement (why, status reasons, edges, build path) is preserved from system-map.curated.json — edit THAT file, then run `pnpm gen:system-map`.",
    generated_at: process.env.GEN_DATE || new Date().toISOString().slice(0, 10),
    source: { pipeline_sha: sha, graph_built_at: meta.built_at ?? null, graph_nodes: nodes.length, graph_edges: edges.length, unmapped_files: unmapped.length },
    zones: curated.zones,
    components,
    edges: edgesOut,
    buildPath: { phases: rm.phases.map(({ issues, ...p }) => ({ ...p, issueCount: issues.length })), anchors: rm.anchors, items },
    overlayStale: overlayStale.map((s) => s.split(" ")[0]),
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  writeFileSync(OUT_FILES, JSON.stringify(filesOut) + "\n");

  // ---- report (added / removed vs the previous generation — AC7) ----
  const prevIds = new Set(prev.components.map((c) => c.id));
  const prevPlanned = new Set((prev.buildPath?.items ?? []).map((i) => i.issue));
  const added = [...components.filter((c) => !prevIds.has(c.id)).map((c) => c.id), ...items.filter((i) => !prevPlanned.has(i.issue)).map((i) => `plan:${i.issue}`)];
  const removed = [...prev.components.filter((c) => !ids.has(c.id)).map((c) => c.id), ...(prev.buildPath?.items ?? []).filter((i) => !items.some((x) => x.issue === i.issue)).map((i) => `plan:${i.issue}`)];
  console.log(`✓ wrote src/data/system-map.json (${components.length} components · ${edgesOut.length} edges · ${items.length} planned) + system-map.files.json (${nodes.length} files · ${edges.length} references)`);
  console.log(`  pipeline ${sha} · graph built ${meta.built_at ?? "?"} · phases ${rm.phases.map((p) => p.id).join(",")} · anchors ${rm.anchors.map((a) => `${a.id}=${a.date}`).join(" ")}`);
  const byZone = {};
  for (const c of components) byZone[c.zone] = (byZone[c.zone] ?? 0) + 1;
  console.log(`  per zone: ${JSON.stringify(byZone)}`);
  if (added.length) console.log(`  + ADDED: ${added.join(", ")}`);
  if (removed.length) console.log(`  - REMOVED: ${removed.join(", ")}`);
  if (!added.length && !removed.length) console.log("  no add/remove — facts refreshed in place");
  if (emptyPatterns.length) console.log(`  ! ${emptyPatterns.length} pattern(s) match no graph node:\n    ${emptyPatterns.join("\n    ")}`);
  if (unmapped.length) console.log(`  ! ${unmapped.length} graph file(s) mapped to no component (shown in the 'unmapped' bucket): e.g. ${unmapped.slice(0, 6).join(", ")}${unmapped.length > 6 ? ", …" : ""}`);
  if (overlayStale.length) console.log(`  ! overlay STALE — files changed after reviewed_at (re-read the entry, then bump the date):\n    ${overlayStale.join("\n    ")}`);
  if (warnings.length) {
    console.log(`✗ ${warnings.length} problem(s):\n    ${warnings.join("\n    ")}`);
    process.exit(1);
  }
}

main();
