// The centerpiece: one REAL run of the pipeline, frozen and curated for replay.
// Source: "Scaling Enterprise AI Agents" (NYC, May 2026) — research brief + the
// published "Measurement is the gate" post, both pulled from Notion. PII-scrubbed:
// only public-figure (speaker/host) context and public post content appear here.

export type TriagePath = "NEW" | "REFRESH" | "SKIP";

export const REPLAY = {
  event: {
    name: "Scaling Enterprise AI Agents",
    date: "May 2026 · New York",
    editorialLede:
      "One room. Three of the four companies that had just shipped enterprise-agent governance tools in a single 60-day window. Here's what happened — and the machine that turned the night into a brief, a post, and five warm intros.",
    technicalLede:
      "A real invocation, stage by stage: calendar invite → entity triage → 4-agent parallel fan-out → synthesizer → dependency-ordered writes → published post.",
  },

  pipelineBlock: {
    speakers: [
      "Robert Brennan — CEO, OpenHands / All Hands AI",
      "Dillon Forrest — Solutions Architect, Vercel",
      "Mahan Salehi — Sr. PM Lead, Generative AI, NVIDIA",
      "Alex Starr — Corporate Fellow, AMD",
    ],
    host: "Chris Bradbury — Principal, Alumni Ventures",
    topics: ["Enterprise AI agent security & governance", "Scaling agents to production / reliability"],
  },

  triage: [
    { entity: "Scaling Enterprise AI Agents", type: "Event", path: "NEW" as TriagePath },
    { entity: "OpenHands, NVIDIA, AMD, Alumni Ventures", type: "Companies", path: "NEW" as TriagePath },
    { entity: "Vercel", type: "Company", path: "REFRESH" as TriagePath },
    { entity: "Brennan, Forrest, Salehi, Starr, Bradbury", type: "People", path: "NEW" as TriagePath },
    { entity: "Agent governance · Scaling to production", type: "Topics", path: "NEW" as TriagePath },
  ],

  fanout: [
    {
      agent: "company-researcher",
      scope: "5 companies, in depth",
      finding:
        "OpenHands — Series A $18.8M (Madrona), 70K GitHub stars. Vercel — $9.3B Series F, and an April 20 OAuth supply-chain breach the same month it shipped a security product. AMD MI350P (144GB, on-prem agent inference). NVIDIA NemoClaw alpha.",
    },
    {
      agent: "person-researcher",
      scope: "5 speakers + host",
      finding:
        "Brennan's four-bucket enterprise-qualification framework maps directly onto Alex's B2B territory management — a real practitioner-to-practitioner hook. Starr (one of <15 AMD Corporate Fellows) is the rarest seat in the room: a genuine enterprise deployer, and a named OpenHands customer.",
    },
    {
      agent: "topic-landscape-analyst",
      scope: "2 topics, 5 dimensions each",
      finding:
        "OWASP Top 10 for Agentic Apps (Dec 2025): prompt injection is #1 — and structurally unsolved. The 847-deployment study: 76% failed within 90 days. Compound error: 95% per step across 20 steps = 36% end-to-end.",
    },
    {
      agent: "competitive-signal-scanner",
      scope: "cross-company, last 60 days",
      finding:
        "A 60-day control-plane burst: NemoClaw (Mar 16), Vercel deepsec (May 4), OpenHands Agent Control Plane (May 6), AMD MI350P (May 7). Four uncoordinated vendors, one buyer signal.",
    },
  ],

  synthesis: {
    quickTake:
      "Four technical speakers collectively responsible for the current frontier of enterprise agent governance — products that all launched inside a 60-day window. The sharpest entry point is the governance-stack narrative: four vendors who each shipped an answer to the same CISO signal, without coordinating.",
    documentarianAngle:
      "The enterprise agent governance stack assembled itself in public in 60 days. Three of the four companies that shipped it were in this room. What does it mean when the market self-organizes a governance answer before a regulator mandates one?",
    successSignals: [
      "A substantive 5-minute exchange with Brennan (his POC framework ↔ Alex's territory management)",
      "A non-public read from Starr on the AMD ↔ OpenHands collaboration",
      "At least one named AV portfolio company hiring senior GTM, from Bradbury",
      "A documentarian post published within 48 hours",
    ],
  },

  writes: [
    { db: "Companies", count: 5, note: "1 refreshed (Vercel), 4 new" },
    { db: "Topics", count: 2, note: "new" },
    { db: "People", count: 5, note: "relations → companies set" },
    { db: "Event", count: 1, note: "relations → people, companies, topics" },
    { db: "Content Drafts", count: 9, note: "brief, posts, questions, connection notes" },
  ],

  output: {
    type: "linkedin_post_post",
    title: "Measurement is the gate",
    excerpt:
      "I expected last night's enterprise-AI panel to be a fight about trust. Turns out nobody in the room doubted the agents could do the work. They doubted anyone could prove it. The gate on a production agent isn't trust, and it isn't capability — it's whether you can answer two questions with data: is it right, and is it worth it. The teams that can are scaling. The 76% that couldn't are the ones that quietly died in 90 days.",
    carouselUrl: "https://gamma.app/generations/KO3oCW8Vls38DZYAkqQ9N",
  },
} as const;
