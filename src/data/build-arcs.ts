// The major build arcs behind the system — the "sprints." Each is a genuine thesis:
// what it is, why it exists, the value, what V1 doesn't do yet, where it goes, the
// best practices it's informed by, and how it ties back to enterprise production building.

export type BuildArc = {
  id: string;
  name: string;
  tagline: string;
  what: string;
  why: string;
  value: string;
  bestPractices: string;
  v1Limits: string;
  future: string;
  enterprise: string;
};

export const BUILD_ARCS = {
  intro:
    "Three build arcs — the sprints behind the system. Each is a thesis, not just a feature: the what, the why, what V1 deliberately doesn't do yet, and how it maps to the data, eval, and governance stack that enterprises spend millions standing up.",
  arcs: [
    {
      id: "market-intelligence-engine",
      name: "The Market-Intelligence Engine",
      tagline: "The intelligence substrate.",
      what: "A Postgres graph where companies, people, topics, and events are first-class objects, and a signal is literally an event with a kind, a cited source, and a confidence. Producers write signals in; the dashboard and a relevance recompute read them out.",
      why: "New York's AI scene throws off more signal in a week than one person can hold, and it's ephemeral. A queryable substrate turns fleeting encounters into a durable, cross-referenceable memory — lens-agnostic, so the same graph serves content and the job search.",
      value: "“What's rising × relevant × uncovered” becomes computable, not vibes. Every signal carries provenance, so nothing is unsourced — and the graph tells a one-day spike apart from a sustained trend.",
      bestPractices: "Event-sourcing / activity-stream modeling (event-as-hyperedge). Meadows' stock-and-flow: the signal stock accumulates; the viewpoint is a derived flow, decay-weighted, never wiped. Recency-decay + cross-source corroboration from information retrieval.",
      v1Limits: "Single primary producer; relevance is recency × engagement × confidence with hand-set weights, no learned model; the event-proximity boost stays dormant until attended events populate; manual trigger only.",
      future: "More producers (voice / role scanners), a learned relevance model, embedding-based semantic dedup, and — deliberately last — unattended scheduling (the one piece that would cost metered API tokens).",
      enterprise: "A system-of-record plus lightweight feature-store pattern — the exact shape enterprises build for “signals → decisions,” scoped to one operator. The veracity layer (provenance, honest confidence, pipeline health) mirrors how production ML earns trust.",
    },
    {
      id: "knowledge-graph-hygiene",
      name: "Knowledge-Graph Data Foundation & Hygiene",
      tagline: "Clean, connected data at scale.",
      what: "Backfilling the graph from Notion (172 companies, 153 topics, 240 people → 232 persons), a reusable dedup / normalization toolkit (fuzzy-match, safe-merge, flag-and-import backfill), and a full Notion ↔ graph reconciliation.",
      why: "A graph is only as useful as it is clean. A single scan fragmented it into near-duplicate topics; the people import carried duplicate pages and unresolved names. Left alone, that noise poisons every downstream ranking — the same failure that kills real production graphs.",
      value: "One node per real entity; provenance preserved on merge (signals move, they're never lost); human-in-the-loop for the judgment calls — the operator sets the taxonomy, the tooling executes it safely.",
      bestPractices: "Entity resolution / master-data-management (match-before-create, survivorship rules). Idempotent backfills (search-before-insert, safe re-runs). Dry-run-before-write on every destructive op.",
      v1Limits: "Dedup is string-similarity + human-in-the-loop, not embeddings; name-only person dedup can theoretically false-merge two distinct people who share a name; a few entities still lack a company; one name flagged unresolved for later.",
      future: "Embedding-based semantic merge (also unblocks automation), a formal survivorship policy for conflicting fields, and full event → person/company edge backfill.",
      enterprise: "MDM plus data-quality governance in miniature — the unglamorous foundation every production data/AI system lives or dies on, and the layer most often skipped until it causes an outage.",
    },
    {
      id: "build-rigor-measurement",
      name: "Build-Rigor & Measurement Layer",
      tagline: "Instrumented building.",
      what: "A Definition-of-Done gate that writes real telemetry, a cross-provider LLM-as-judge (two model families in a quorum), build-session telemetry piped to a dashboard, and branch-first git discipline enforced by a hook.",
      why: "Diagnosed via systems analysis as a Shifting-the-Burden archetype: rigor lived in optional docs, never the execution path, so a memory-less agent shipped on green checks with no durable trace — and the consequences surfaced weeks later. This puts a floor under “done” inside the execution path.",
      value: "Every non-trivial build leaves an artifact (spec, issue, adversarial pass) and a telemetry row. The judge resists self-preference by drawing its second opinion from a different provider, not the same model family.",
      bestPractices: "LLM-as-judge with a cross-provider quorum (self-preference mitigation). DORA / delivery-observability thinking — measure the delivery system, not just the product. “Own the contract, rent the platform”: a stable log schema with a swappable backend.",
      v1Limits: "The judge is provisional-trusted — advisory, never hard-blocking; the DoD is self-attested; telemetry is a single dedicated project.",
      future: "The judge earning “trusted” status via prospective calibration, and a value-action registry so every metric carries a threshold → action → surface — no orphan metrics.",
      enterprise: "AI evals + delivery observability + governance — precisely the “how do we trust and measure our AI systems” question every enterprise AI team is now grappling with. A full-stack-GTM wedge: demonstrated, not stated.",
    },
  ] satisfies BuildArc[],
  throughLine:
    "All three share one thesis: build better, not faster. Architecture before automation; human-in-the-loop until evidence justifies removing it; inspect real data before proposing fixes; every non-trivial build leaves a durable trace. The value isn't any single component — it's an operator running a small, honest, instrumented version of the exact stack enterprises are spending millions to stand up.",
} as const;
