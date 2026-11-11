# E-11 · Projects in flight (Empire)

**Repo:** empire-state-hub · **Route:** `/projects` (nav tab "In Flight") and `/projects/<slug>`

## What it is

The hub's mission control for development sprints, projects and sub-projects. It has two readers:

- **Alex and the sessions working with him.** It's the one place that says what's in flight, why, where each piece is going and what's left.
- **Hiring managers.** It shows the work in progress, the judgment behind it, and the numbers that say whether it's working.

It isn't a scratch pad. It's updated when a milestone moves, a decision is made, a metric changes or a risk appears. A routine PR, commit or review round doesn't earn an update. Finished work is archived, not deleted.

## Data contract

One file per project: `src/data/projects/<slug>.json`. Each working session edits **only its own project's file**, so sessions never conflict. `src/lib/projects.ts` parses every file at build, and a rule-breaking file fails the build.

The schema enforces these rules:

1. **Every metric has its do-nothing baseline**, plus `asOf` and a `source`. A number without a baseline isn't published. An empty `metrics` list is allowed and renders as "no metric yet".
2. `status: "archived"` requires `completed`. Only archived projects carry `completed`.
3. `log` holds at most 8 entries, at milestone level, and renders newest first.
4. The slug equals the filename. A `sub-project`, and only a sub-project, names a `parent`, which must be an existing top-level project (one level deep, no cycles).
5. No placeholder markers (`TODO`, `TBD`, `[confirm]`) appear in any value.
6. Unknown keys are refused. Links must be https, and never point at Linear.
7. Dates are real calendar dates, and `completed` is not before `started`.

## Public-safety rules (AGENTS.md rules 1–5 apply in full)

- Nothing private goes in a file:
  - no `.env` values or secrets
  - no me-model or target-company content
  - no compensation or recruiting detail about specific companies
  - no person other than Alex
  - no off-the-record material
  - no inbox content
- **Open security gaps don't go on this page until they're fixed.** Describe the safeguard once it ships.
- **Claim a safeguard only when the live system enforces it.** A planned control is written as planned ("by design, the reviewer will…"). Never describe how a gate can be bypassed, or which controls are not yet applied.
- Every figure cites a public source (a PR, an issue, a published post) or is labelled as a first-party measurement with its date.
- Linear IDs may appear as plain text in `tracking`. Don't link to them, because the workspace is private.

## Fields

| Field | Required | Meaning |
|---|---|---|
| `slug`, `title`, `tagline` (≤160 chars) | yes | identity and a one-line pitch |
| `kind` | yes | `project`, `sprint` or `sub-project` (+ `parent`) |
| `status` | yes | `active`, `blocked`, `paused` or `archived` |
| `health` | yes | `on-track`, `at-risk` or `off-track`. This is an honest call, not a mood. |
| `phase`, `owner` | yes | the current phase, and who drives it |
| `started`, `updated` | yes | ISO dates. `target` is optional. `completed` is for archived projects only. |
| `why` | yes | the problem, with its baseline |
| `mission` | yes | what's being built |
| `destination` | yes | what done looks like, and how anyone would know |
| `showcase` | yes, 1–5 | what the work demonstrates, written for a hiring manager |
| `milestones` | yes, ≥1 | `done`, `active`, `next` or `later`, with optional `date` and `note` |
| `metrics` | — | `label`, `baseline`, `current`, `target?`, `asOf`, `source`, `note?` |
| `decisions` | — | made: `date`, `decision`, `why` |
| `open` | — | still open: `question`, `owner` |
| `risks` | — | `risk`, `mitigation` |
| `log` | — | ≤8 milestone-level entries |
| `links`, `tracking`, `stack` | — | public links, Linear IDs as text, tools |

### Status-report layer (added 2026-11-11, all optional)

The page reads like a project status report, in the order a busy reader needs: bottom line, what's needed, what changed, plan, problems, then context. The layer applies these practices:
- **BLUF** (bottom line up front)
- **Decisions needed, with deadlines** (DACI)
- **Delta since the last update** (weeknotes)
- **Hill-chart certainty instead of percent-complete** (Shape Up)
- **RAID**: risks, assumptions, issues, dependencies
- **Anti-watermelon health**: a colour always comes with its reason, trend and confidence.

| Field | Meaning |
|---|---|
| `summary` | Bottom line up front, 2–4 sentences. Is it on track? How serious is any problem? What's needed from the reader? Write it last and show it first. |
| `healthWhy` | The objective reason for the health call. **Required** when a live project (active, blocked or paused) that isn't on track has a `summary`. With no summary, it shows under the header. Pages without a `summary` keep their context (why, what, where, showcase) at the top. Pages with one move it below the plan. Loader rules are tested in `scripts/fixtures/projects/`. |
| `trend`, `confidence` | `trend` is `improving`, `steady` or `worsening`. `confidence` is the owner's percentage with a plain-language qualifier. |
| `asks` | Decisions needed. Each has: `decision`, `recommendation`, `options` (≤3, the alternatives), `owner`, `due?`, `costOfDelay` and `reversible` (a two-way door or a one-way door). Use `asks` instead of `open` when a recommendation exists. |
| `sinceLast` | `since` (the date of the previous update) plus 1–8 `changes`, each marked `done`, `changed`, `slipped` or `learned`. |
| `issues` | Problems happening now (risks that have already landed): `issue`, `impact`, `action`, `owner`. |
| `dependencies` | What the work waits on: `on`, `need`, `status` (`waiting`, `in-progress` or `met`). |
| milestone `target`, `certainty` | `target` is the planned date for unfinished work. `certainty` is `figuring-out` or `executing`. |
| risk `likelihood`, `impact` | `low`, `medium` or `high`. |

## Lifecycle

1. **Start:** add the file with `status: active` and its milestones.
2. **Update at moments that matter:** a milestone moves, a decision is made or opened, a metric changes, or a risk appears or clears. Also bump `updated`.
3. **Finish:** set `status: archived`, add `completed`, mark the last milestone `done`, and give the final metric. The page moves to the archive on its own.

## Verify

`pnpm check && pnpm lint && pnpm build`. The build fails on any rule above.

**Done when:** `/projects` lists live and archived projects, and every project page renders in both lenses.
