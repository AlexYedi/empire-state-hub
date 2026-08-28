// Content Performance — LinkedIn post-analytics snapshot.
// Source: LinkedIn SinglePostAnalytics exports, 50 distinct posts (deduped), 2026-01-08 → 2026-08-25.
// As of: 2026-08-28. Point-in-time snapshot (not live). Demographics are LinkedIn's shown top-N
// (truncated; do not sum to 100) — shares are reach-weighted % of shown viewers. Hardened re-pull;
// seniority/role reconciled to <0.1pt vs an independent extraction pass.

export type Meta = {
  nPosts: number;
  dateRange: string;
  asOf: string;
  totalImpressions: number;
  totalEngagements: number;
  medianEngRatePct: number;
};

export const META: Meta = {
  nPosts: 50,
  dateRange: "Jan 8 – Aug 25, 2026",
  asOf: "2026-08-28",
  totalImpressions: 20006,
  totalEngagements: 214,
  medianEngRatePct: 1.0,
};

export type Stat = { label: string; value: string; sub: string };

export const HEADLINE_STATS: Stat[] = [
  { label: "posts analyzed", value: "50", sub: "Jan–Aug 2026" },
  { label: "total impressions", value: "20,006", sub: "median 1.0% eng rate" },
  { label: "decision-makers", value: "26%", sub: "Dir / VP / CXO / Owner" },
  { label: "on-target audience", value: "49%", sub: "founders + GTM peers" },
];

export type Bar = { label: string; pct: number };

// Who's seeing it — role families (reach-weighted % of shown job titles).
export const ROLE_FAMILIES: Bar[] = [
  { label: "Engineers / builders", pct: 43.5 },
  { label: "Founders / CEO", pct: 25.8 },
  { label: "GTM / Sales / CS", pct: 22.8 },
  { label: "Product", pct: 6.5 },
  { label: "Recruiters", pct: 4.6 },
];

// Seniority mix (reach-weighted % of shown).
export const SENIORITY: Bar[] = [
  { label: "Senior (IC)", pct: 40.3 },
  { label: "Entry", pct: 25.2 },
  { label: "Director", pct: 12.9 },
  { label: "Manager", pct: 7.3 },
  { label: "VP", pct: 4.7 },
  { label: "CXO", pct: 4.0 },
  { label: "Owner", pct: 3.8 },
  { label: "Training", pct: 1.1 },
  { label: "Partner", pct: 0.8 },
];

export const INDUSTRY: Bar[] = [
  { label: "Software Development", pct: 31.1 },
  { label: "IT Services & Consulting", pct: 21.5 },
  { label: "Technology / Info / Internet", pct: 21.3 },
  { label: "Financial Services", pct: 11.4 },
  { label: "Business Consulting", pct: 3.3 },
  { label: "Advertising", pct: 3.2 },
  { label: "Staffing & Recruiting", pct: 1.5 },
  { label: "VC & Private Equity", pct: 1.1 },
];

export const COMPANY_SIZE: Bar[] = [
  { label: "2–10", pct: 10.4 },
  { label: "11–50", pct: 14.4 },
  { label: "51–200", pct: 15.2 },
  { label: "201–500", pct: 8.9 },
  { label: "501–1,000", pct: 8.2 },
  { label: "1,001–5,000", pct: 18.9 },
  { label: "5,001–10,000", pct: 4.5 },
  { label: "10,001+", pct: 19.6 },
];

export type Rollup = { group: string; pct: number; onTarget: boolean };

export const INDUSTRY_ROLLUP: Rollup[] = [
  { group: "AI-native / software+tech", pct: 53.0, onTarget: true },
  { group: "IT-services / staffing", pct: 23.0, onTarget: false },
  { group: "Financial / VC / banking", pct: 13.6, onTarget: false },
];

export const SIZE_ROLLUP: Rollup[] = [
  { group: "Startup / small (≤200)", pct: 40.1, onTarget: true },
  { group: "Mid-market (201–5,000)", pct: 35.9, onTarget: false },
  { group: "Enterprise (5,000+)", pct: 24.0, onTarget: false },
];

// The headline finding: topic → audience. Two cohorts across the metrics that matter.
export type CohortMetric = { metric: string; gtm: number; technical: number; hint: string };

export const TOPIC_AUDIENCE: CohortMetric[] = [
  { metric: "Founders + GTM (your target)", gtm: 54.1, technical: 34.7, hint: "higher is on-target" },
  { metric: "Engineers / builders", gtm: 36.3, technical: 65.3, hint: "lower is on-target" },
  { metric: "Startup-size (≤200)", gtm: 40.0, technical: 35.1, hint: "higher is on-target" },
  { metric: "IT-services / enterprise tail", gtm: 18.1, technical: 34.7, hint: "lower is on-target" },
];

export type Pair = { label: string; a: { name: string; pct: number }; b: { name: string; pct: number } };

export const FORMAT_EFFECT: Pair = {
  label: "Engagement rate by format",
  a: { name: "Visual (carousel / native)", pct: 1.88 },
  b: { name: "Text / link", pct: 0.77 },
};

export const SEASONALITY: Pair = {
  label: "Engagement rate — summer drag",
  a: { name: "Rest of year", pct: 1.4 },
  b: { name: "Summer (Jun 15–Aug 31)", pct: 0.88 },
};

// Reach ≠ resonance — notable posts (impressions vs engagement rate).
export type PostPoint = {
  slug: string;
  impressions: number;
  engRatePct: number;
  topic: "gtm" | "technical" | "roundup" | "event";
  note?: string;
};

export const REACH_VS_ENGAGEMENT: PostPoint[] = [
  { slug: "brex-social", impressions: 3104, engRatePct: 0.13, topic: "event", note: "3,104 seen · 4 engagements" },
  { slug: "shortlist-carousel", impressions: 1121, engRatePct: 1.07, topic: "gtm" },
  { slug: "ai-nyctech-aiagents", impressions: 1096, engRatePct: 1.0, topic: "gtm" },
  { slug: "mcp-release", impressions: 931, engRatePct: 0.97, topic: "technical" },
  { slug: "nytechweek-gtm", impressions: 741, engRatePct: 0.13, topic: "roundup" },
  { slug: "gtm-eng-nyc", impressions: 570, engRatePct: 0.88, topic: "gtm" },
  { slug: "ai-seo-geo-aeo", impressions: 537, engRatePct: 3.54, topic: "gtm", note: "top engagement rate" },
  { slug: "gtm-2024-2026", impressions: 350, engRatePct: 2.86, topic: "gtm" },
  { slug: "fin-x-clay", impressions: 389, engRatePct: 2.06, topic: "gtm" },
  { slug: "2x-productivity", impressions: 313, engRatePct: 2.24, topic: "gtm" },
  { slug: "mcp-user-journey", impressions: 318, engRatePct: 1.89, topic: "technical" },
  { slug: "neuehouse", impressions: 236, engRatePct: 2.97, topic: "gtm" },
];

export const TAKEAWAYS: string[] = [
  "Half your audience already IS the target — founders (26%) + GTM peers (23%). Engineers are the single biggest group (44%), so it feels off-target, but isn't.",
  "TOPIC drives WHO sees it — the biggest, cleanest lever. GTM/business content reaches founders + GTM decision-makers; technical/infra content reaches engineers + enterprise IT.",
  "FORMAT drives engagement — visual (carousel/native) posts pull ~2.4× the engagement rate of text/link. Reach ≠ resonance.",
  "~53% at software/tech companies + 40% at startups = a real AI-native slice; a ~23% IT-services + 24% enterprise tail (inflated by technical content) is off-profile.",
  "Summer was a real ~37% engagement drag; time-of-day was confounded into noise; edit-quality isn't measurable without an A/B.",
  "The move: lead with GTM/business/full-stack-GTM content (your positioning AND your target audience agree), in visual format — treat deep-technical posts as the credibility layer.",
];
