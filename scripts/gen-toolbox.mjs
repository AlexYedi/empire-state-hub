#!/usr/bin/env node
// gen-toolbox.mjs — regenerate src/data/toolbox.json + architecture.ts counts from the live
// .claude/{commands,skills,agents} frontmatter. Local-only (needs the sibling pipeline repo);
// output is committed. Spec: docs/toolbox-generator.spec.md. Run: pnpm gen:toolbox
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const HUB = join(dirname(fileURLToPath(import.meta.url)), "..");
// Source repos (env-overridable; degrade gracefully if absent).
const PIPELINE_DIR =
  process.env.PIPELINE_DIR ||
  join(HUB, "..", "Empire_State_Events_Pipeline_Take_3");
const PLUGIN_DIR =
  process.env.PLUGIN_DIR || join(homedir(), "Documents", "GitHub", "alex-agents-skills");
const CLAUDE = join(PIPELINE_DIR, ".claude");
const OUT = join(HUB, "src", "data", "toolbox.json");

// If Alex wants the headline counts to show the plugin ecosystem instead of the project-local
// toolkit, flip this to "ecosystem". See docs/toolbox-generator.spec.md.
const PRIMARY_SCOPE = "local";

// ---- frontmatter parse (ported from the /toolbox command's proven Python scanner) ----
function frontmatter(path) {
  const t = readFileSync(path, "utf8");
  const m = t.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : "";
}
// Reads a key's value, joining wrapped/folded/block continuation lines (handles >, |, wrapped scalars).
function field(block, key) {
  const lines = block.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(new RegExp(`^${key}:\\s*(.*)$`));
    if (!m) continue;
    const v = m[1].trim();
    const parts = ["", ">", "|", ">-", "|-"].includes(v) ? [] : [v.replace(/^["']|["']$/g, "")];
    for (let j = i + 1; j < lines.length; j++) {
      if (/^[A-Za-z_-]+:/.test(lines[j])) break; // next top-level key
      if (lines[j].trim()) parts.push(lines[j].trim());
    }
    return parts.join(" ").trim();
  }
  return "";
}
const collapse = (s) => s.replace(/\s+/g, " ").trim();

// ---- enumerate ----
function listFiles(dir, { recursive = false } = {}) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory() && recursive) out.push(...listFiles(p, { recursive }));
    else if (st.isFile() && name.endsWith(".md")) out.push(p);
  }
  return out;
}

function scanItems() {
  const items = [];
  // commands: .claude/commands/*.md
  for (const p of listFiles(join(CLAUDE, "commands")).sort()) {
    const b = frontmatter(p);
    items.push({
      type: "command",
      name: "/" + basename(p, ".md"),
      description: collapse(field(b, "description")).slice(0, 400),
      args: field(b, "argument-hint"),
    });
  }
  // skills: .claude/skills/*/SKILL.md (one level, matches /toolbox)
  const skillsDir = join(CLAUDE, "skills");
  if (existsSync(skillsDir)) {
    for (const d of readdirSync(skillsDir).sort()) {
      const p = join(skillsDir, d, "SKILL.md");
      if (!existsSync(p)) continue;
      const b = frontmatter(p);
      items.push({
        type: "skill",
        name: field(b, "name") || d,
        description: collapse(field(b, "description")).slice(0, 400),
        args: "",
      });
    }
  }
  // agents: .claude/agents/**/*.md (recursive)
  for (const p of listFiles(join(CLAUDE, "agents"), { recursive: true }).sort()) {
    const b = frontmatter(p);
    items.push({
      type: "agent",
      name: field(b, "name") || basename(p, ".md"),
      description: collapse(field(b, "description")).slice(0, 400),
      args: "",
    });
  }
  return items;
}

// agents grouped by immediate subdir under .claude/agents/
function agentsByGroup() {
  const dir = join(CLAUDE, "agents");
  const groups = {};
  if (!existsSync(dir)) return groups;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) groups[name] = listFiles(p, { recursive: true }).length;
  }
  return groups;
}

function pluginEcosystem() {
  const skillsDir = join(PLUGIN_DIR, "skills");
  const skills = existsSync(skillsDir)
    ? readdirSync(skillsDir).filter((d) => existsSync(join(skillsDir, d, "SKILL.md"))).length
    : 0;
  return { skills };
}

function gitCommits() {
  try {
    return Number(
      execFileSync("git", ["-C", PIPELINE_DIR, "rev-list", "--count", "HEAD"], {
        encoding: "utf8",
      }).trim(),
    );
  } catch {
    return null;
  }
}

// ---- merge: preserve curated group/tier, flag added/removed ----
function loadPrev() {
  try {
    return JSON.parse(readFileSync(OUT, "utf8"));
  } catch {
    return { items: [], counts: {} };
  }
}

function main() {
  if (!existsSync(CLAUDE)) {
    console.error(`✗ pipeline .claude not found at ${CLAUDE}\n  Set PIPELINE_DIR=/path/to/pipeline and retry.`);
    process.exit(1);
  }
  const prev = loadPrev();
  const prevByKey = new Map(prev.items.map((i) => [`${i.type}\t${i.name}`, i]));
  const scanned = scanItems();

  const added = [];
  const items = scanned.map((it) => {
    const prevIt = prevByKey.get(`${it.type}\t${it.name}`);
    if (!prevIt) added.push(`${it.type} ${it.name}`);
    return {
      type: it.type,
      name: it.name,
      description: it.description,
      args: it.args,
      group: prevIt?.group ?? "Other", // new tools land in "Other" for Alex to categorize
      tier: prevIt?.tier ?? "", // empty tier renders un-tagged
    };
  });
  const scannedKeys = new Set(scanned.map((i) => `${i.type}\t${i.name}`));
  const removed = prev.items
    .filter((i) => !scannedKeys.has(`${i.type}\t${i.name}`))
    .map((i) => `${i.type} ${i.name}`);

  // stable sort: type (command, skill, agent) then name — clean diffs
  const typeOrder = { command: 0, skill: 1, agent: 2 };
  items.sort((a, b) => (typeOrder[a.type] - typeOrder[b.type]) || a.name.localeCompare(b.name));

  const counts = {
    command: items.filter((i) => i.type === "command").length,
    skill: items.filter((i) => i.type === "skill").length,
    agent: items.filter((i) => i.type === "agent").length,
    commits: gitCommits(),
  };
  const eco = pluginEcosystem();

  const out = {
    generated_note:
      "GENERATED by scripts/gen-toolbox.mjs from the pipeline's .claude/{commands,skills,agents} " +
      "frontmatter. Do not hand-edit facts — run `pnpm gen:toolbox` after adding/removing a tool. " +
      "The `group`/`tier` fields ARE hand-curated and preserved across regenerations; new tools land " +
      "in group 'Other' with no tier for you to categorize. The live /toolbox command is always-current.",
    generated_at: process.env.GEN_TOOLBOX_DATE || new Date().toISOString().slice(0, 10),
    primary_scope: PRIMARY_SCOPE,
    counts,
    agentsByGroup: agentsByGroup(),
    ecosystem: eco, // the alex-plugin distribution library (separate, larger scope)
    items,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

  // ---- report ----
  const oldC = prev.counts || {};
  console.log("✓ wrote src/data/toolbox.json");
  console.log(
    `  counts: command ${oldC.command ?? "?"}→${counts.command} · skill ${oldC.skill ?? "?"}→${counts.skill} · agent ${oldC.agent ?? "?"}→${counts.agent} · commits ${oldC.commits ?? "?"}→${counts.commits}`,
  );
  console.log(`  agentsByGroup: ${JSON.stringify(out.agentsByGroup)}  · ecosystem skills: ${eco.skills}`);
  if (added.length) console.log(`  + ADDED (categorize in 'Other'): ${added.join(", ")}`);
  if (removed.length) console.log(`  - REMOVED: ${removed.join(", ")}`);
  if (!added.length && !removed.length) console.log("  no add/remove — facts + counts refreshed in place");
}

main();
