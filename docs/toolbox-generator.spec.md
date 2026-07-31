# Spec — Toolbox/Counts Generator (Hub Phase 3, Option B)

**One-liner:** A local Node script that regenerates `src/data/toolbox.json` and the count fields in
`src/data/architecture.ts` from the live `.claude/{commands,skills,agents}` frontmatter, so the hub's
build-in-public surface never drifts from reality.

## Problem (the named friction)
Two hand-maintained files drifted from reality and from each other:
`architecture.ts` said 38 skills / 20 agents / 12 commands / 160 commits; `toolbox.json` said 26 / 21 / 22;
live reality (2026-07-30) is **26 skills · 21 agents · 23 commands · 234 commits** (project-local).
A manual re-count re-drifts the instant a tool is added — the R2 patch trap. This generator removes the
friction durably (the friction-remover test).

## Source of truth (decision — flag for Alex)
**Primary = the pipeline's own `.claude/{commands,skills,agents}`** — the self-contained "Empire State
toolkit," identical to what the live `/toolbox` command scans. The `alex` plugin (261 skills / 114 agents /
102 commands) is a *different, larger* scope (the distribution library); it is captured as a **secondary
`ecosystem` count**, not the headline. Rationale: the honest, verifiable, self-contained number for *this
project* is project-local; `/toolbox` itself leads with project-local and treats the plugin as an appendix.
**If Alex prefers the headline to show the ecosystem number, flip `PRIMARY_SCOPE` — one constant.**

## Behavior
1. **Parse frontmatter** (ported from the `/toolbox` command's proven Python scanner): `description`,
   `name`, `argument-hint` — handles single-line, folded `>`, block `|`, and wrapped scalars.
2. **Enumerate** (mirrors `/toolbox` exactly): commands `.claude/commands/*.md`; skills
   `.claude/skills/*/SKILL.md` (one level); agents `.claude/agents/**/*.md` (recursive).
3. **Merge, don't clobber** — `group` and `tier` on each item are **hand-curated** (the toolbox page groups
   by them). Preserve them by matching on `type+name`; **new** tools get `group:"Other"`, `tier:""`
   (renders un-tagged) so Alex can categorize them; **removed** tools drop out. The run prints an
   added/removed report so curation gaps are visible, never silent.
4. **Counts** → `toolbox.json.counts = {command, skill, agent, commits}` (commits via
   `git -C <pipeline> rev-list --count HEAD`) plus `agentsByGroup` (files per `.claude/agents/<sub>/`) and
   `ecosystem` (plugin totals). Stable-sorted items for clean diffs.
5. **`architecture.ts` imports** its `counts` and per-group agent counts from `toolbox.json` — narrative
   (`agentGroups[].role`, `workflows`, `constraint`, `span`) stays hand-authored.

## Constraints / non-goals
- **Local-only** — Vercel builds see only the hub repo, not the pipeline. So the generator is a manual
  `pnpm gen:toolbox`, its output committed; it is **NOT** wired into `build`. (Same as today's committed
  snapshot, just generated instead of hand-typed.)
- Reads the pipeline via `PIPELINE_DIR` (default sibling absolute path, env-overridable). Degrades
  gracefully (skips a source, never crashes) if a path is missing.
- Does not rewrite curated narrative; does not touch anything outside `src/data/`.

## Files
- `scripts/gen-toolbox.mjs` (the generator) · `package.json` (`gen:toolbox` script) ·
  `src/data/toolbox.json` (regenerated) · `src/data/architecture.ts` (counts now imported).

## Verify
`pnpm gen:toolbox` prints old→new counts + added/removed; `git diff src/data/toolbox.json` shows the
refreshed facts with `group`/`tier` preserved; `pnpm build` clean; `/ops/toolbox` + `/architecture` render
the live numbers.

## Adversarial pre-mortem
- *Curation loss:* mitigated by the merge (preserve group/tier by name). — *Path fragility:* env-overridable
  + graceful skip. — *Silent drift back:* it's manual, so document the "run after adding tools" step in the
  README + the file's `generated_note`. — *Count-semantics surprise:* the project-local vs ecosystem choice
  is a single flagged constant.
