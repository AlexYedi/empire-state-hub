# Empire State Hub

A dual-lens surface for an AI-native GTM pipeline: a **public portfolio** on the front, a **live operator cockpit** on the back — both built on the pipeline's own data, not a static mockup.

The pipeline turns NYC AI/tech event attendance into research, networking prep, and content. This hub is where that system watches itself work.

## Why it exists

Most "portfolio sites" are brochures — hand-written claims that drift the moment the underlying work moves on. This one is wired to the source. The tool counts, the changelog, and the operator dashboards all read from the live system, so the site can't quietly lie about what's shipped. That constraint is the point.

## What's behind it

The pipeline is built on a few deliberate bets, learned the hard way across two prior iterations:

- **Skill-first, not middleware.** The research engine is a set of Claude skills with direct MCP writes to Notion and HubSpot — no n8n, no glue layer that fails in the seams. The predecessor died at the integration layer; this one separates "do great research" from "put it in the right places."
- **Multi-agent research fan-out.** `/event-deep-research` dispatches parallel specialists (company, person, topic, competitive-signal) from the parent thread, then a synthesis-only agent assembles the brief — shaped around the real SDK constraint that subagents can't spawn subagents.
- **Systems-thinking as a standing discipline.** A Meadows-grounded diagnostic harness (stocks/flows/loops/leverage points) is used to reason about *why* things stall, not just patch symptoms.
- **Build better, not faster.** A definition-of-done gate and build-session telemetry put a floor under "done" — non-trivial builds leave a durable trace (spec, issue, adversarial pass) instead of shipping on green checks.

## Live vs. in progress

Kept honest on purpose:

**Live**
- Event research + content pipeline (`/event-deep-research`, `/post-event-content`, pre/post-event content)
- This hub — public portfolio + `/ops` cockpit
- `/ops/rigor` — build-rigor telemetry (build sessions + judge runs) over a dedicated PostHog project
- `/ops/market-intel` — market-intelligence feed over the live graph
- The toolbox generator — drift-proof, regenerated from source

**In progress**
- Market-Intelligence Engine (Supabase spine — job-search + content lenses)
- The measurement layer maturing: the cross-provider build-quality judge is *provisional-trusted*, still accruing calibration evidence before it's load-bearing everywhere

## Stack

Next.js (App Router) · TypeScript · Tailwind · PostHog · Notion + HubSpot (MCP) · Supabase · Linear · Vercel. Discipline, skills, and agents ship via a shared Claude Code plugin that every project inherits.

## Running locally

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Environment variables (PostHog keys, Notion DB ids, Supabase, `OPS_PASSWORD` for the `/ops` gate) live in `.env.local` — see the deployment notes. The `/ops/*` cockpit is password-gated; the public portfolio pages are open.

### After adding a tool

When a skill, agent, or command is added or removed, regenerate the live catalog so the site's numbers stay honest:

```bash
pnpm gen:toolbox        # rescans .claude/{skills,agents,commands}, updates src/data/toolbox.json
```

New tools land in group **"Other"** with no tier — categorize them by editing the item's `group`/`tier`; the generator preserves your edits on the next run.
