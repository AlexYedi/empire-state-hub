// Fake Notion responses for gen-rooms tests. Shapes mirror the v5 API (pages.retrieve,
// dataSources.query, blocks.children.list) closely enough for the accessors gen-rooms uses.
// Every string that must NEVER reach rooms.json carries a LEAK_ sentinel; the test greps for them.

const t = (plain, href = null) => [{ plain_text: plain, href }];
const title = (s) => ({ type: "title", title: t(s) });
const text = (s) => ({ type: "rich_text", rich_text: t(s) });
const select = (s) => ({ type: "select", select: s ? { name: s } : null });
const multi = (...xs) => ({ type: "multi_select", multi_select: xs.map((name) => ({ name })) });
const rel = (...ids) => ({ type: "relation", relation: ids.map((id) => ({ id })) });
const date = (s) => ({ type: "date", date: s ? { start: s } : null });
const url = (s) => ({ type: "url", url: s });
const page = (id, properties, last_edited_time = "2026-09-01T00:00:00.000Z") => ({
  object: "page",
  id,
  last_edited_time,
  properties,
});

let n = 0;
const blk = (type, s, extra = {}) => ({ id: `b${++n}`, type, has_children: false, [type]: { rich_text: t(s) }, ...extra });
const h2 = (s) => blk("heading_2", s);
const h3 = (s) => blk("heading_3", s);
const p = (s) => blk("paragraph", s);
const li = (s) => blk("numbered_list_item", s);
const bl = (s) => blk("bulleted_list_item", s);
const quote = (s) => blk("quote", s);
const code = (s) => blk("code", s);
const linkPara = (label, href) => ({ id: `b${++n}`, type: "paragraph", has_children: false, paragraph: { rich_text: t(label, href) } });

// ---------- ids ----------
export const IDS = {
  event: "e1000000000000000000000000000001",
  eventSameDay: "e1000000000000000000000000000002",
  legacy: "389d3699c2db81e09fd4feced66c7501",
  held: "e1000000000000000000000000000003",
  speaker: "a1000000000000000000000000000001",
  host: "a1000000000000000000000000000002",
  attendee: "a1000000000000000000000000000003",
  noRole: "a1000000000000000000000000000004",
  company: "c1000000000000000000000000000001",
  company2: "c1000000000000000000000000000002",
  topic: "d1000000000000000000000000000001",
  brief: "f1000000000000000000000000000001",
  recap: "f1000000000000000000000000000002",
  preview: "f1000000000000000000000000000003",
  scheduled: "f1000000000000000000000000000004",
  noUrl: "f1000000000000000000000000000005",
  review: "f1000000000000000000000000000006",
  dm: "f1000000000000000000000000000007",
  legacyPost: "f1000000000000000000000000000008",
  roundup: "f1000000000000000000000000000009",
};

const events = [
  page(IDS.event, {
    "Event Name": title("Agents in Production: NYC"),
    "Event Date": date("2026-09-16T18:00:00.000-04:00"),
    Location: text("Some Venue, New York"),
    "Event Status": select("post_complete"),
    "Event Description": text("LEAK_EVENT_DESCRIPTION raw invite text"),
    "Google Calendar Event ID": text("LEAK_GCAL_ID"),
    People: rel(IDS.speaker, IDS.host, IDS.attendee, IDS.noRole),
    Companies: rel(IDS.company, IDS.company2),
    Topics: rel(IDS.topic),
  }),
  page(IDS.eventSameDay, {
    "Event Name": title("Another Room Same Night"),
    "Event Date": date("2026-09-16"),
    People: rel(),
    Companies: rel(),
    Topics: rel(),
  }),
  page(IDS.held, {
    "Event Name": title("Held Room"),
    "Event Date": date("2026-09-20"),
    People: rel(IDS.speaker),
    Companies: rel(),
    Topics: rel(),
  }),
];

const people = [
  page(IDS.speaker, {
    Name: title("Sam Speaker"),
    "Current Title": text("Head of Platform"),
    Email: { type: "email", email: "LEAK_sam@example.com" },
    "Phone Number": { type: "phone_number", phone_number: "LEAK_212-555-0100" },
    Notes: text("LEAK_PERSON_NOTES private"),
    "Known POV / Bio": text("LEAK_BIO judgement"),
    "LinkedIn URL": url("https://www.linkedin.com/in/sam-speaker"),
    "Role Context": multi("speaker"),
    Company: rel(IDS.company),
  }),
  page(IDS.host, {
    Name: title("Hana Host"),
    "Current Title": text("Organizer"),
    "LinkedIn URL": url("http://not-linkedin.example/hana"),
    "Role Context": multi("host", "attendee"),
    Company: rel(),
  }),
  page(IDS.attendee, {
    Name: title("LEAK_ATTENDEE_NAME"),
    "Role Context": multi("attendee", "contact"),
    Company: rel(IDS.company),
  }),
  page(IDS.noRole, {
    Name: title("LEAK_NO_ROLE_NAME"),
    "Role Context": multi(),
    Company: rel(),
  }),
];

const entities = [
  page(IDS.company, { "Company Name": title("Acme AI"), Description: text("LEAK_COMPANY_DESCRIPTION") }),
  page(IDS.company2, { "Company Name": title("Beta Labs") }),
  page(IDS.topic, { Topic: title("Agent Reliability"), Challenges: text("LEAK_TOPIC_BODY") }),
];

const draft = (id, props, t2) =>
  page(
    id,
    {
      Title: title(props.title ?? "draft"),
      "Content Type": select(props.type),
      "Content Status": select(props.status),
      "Published URL": url(props.url ?? null),
      Event: rel(...(props.events ?? [])),
    },
    t2,
  );

const drafts = [
  draft(IDS.brief, { title: "LEAK_BRIEF_TITLE Post-Event Brief", type: "post_event_brief", status: "needs_review", events: [IDS.event] }),
  draft(IDS.recap, {
    title: "LEAK_DRAFT_TITLE Post-Event Post (A/B) [PUBLISHED 9/17: Variant A]",
    type: "linkedin_post_post",
    status: "published",
    url: "https://www.linkedin.com/posts/recap-123",
    events: [IDS.event],
  }),
  draft(IDS.preview, {
    title: "Pre-Event Post",
    type: "linkedin_post_pre",
    status: "published",
    url: "https://www.linkedin.com/posts/preview-456",
    events: [IDS.event],
  }),
  draft(IDS.roundup, {
    title: "The Upcoming Week",
    type: "linkedin_post_pre",
    status: "published",
    url: "https://www.linkedin.com/posts/roundup-789",
    events: [IDS.event, IDS.eventSameDay, IDS.event],
  }),
  draft(IDS.scheduled, { title: "LEAK_SCHEDULED", type: "linkedin_post_post", status: "scheduled", url: "https://www.linkedin.com/posts/LEAK_SCHEDULED_URL", events: [IDS.event] }),
  draft(IDS.noUrl, { title: "LEAK_NO_URL", type: "linkedin_post_post", status: "published", events: [IDS.event] }),
  draft(IDS.review, { title: "LEAK_REVIEW", type: "linkedin_post_pre", status: "needs_review", url: "https://www.linkedin.com/posts/LEAK_REVIEW_URL", events: [IDS.event] }),
  draft(IDS.dm, { title: "LEAK_DM", type: "linkedin_dm_speaker", status: "published", url: "https://www.linkedin.com/in/LEAK_DM_URL", events: [IDS.event] }),
  draft(IDS.legacyPost, {
    title: "NYC AI Demos #10 — Post-Event",
    type: "linkedin_post_post",
    status: "published",
    url: "https://www.linkedin.com/posts/demos-10",
    events: [],
  }),
];

const legacyPage = page(IDS.legacy, {
  Title: title("NYC AI Demos #10"),
  "Event Date": date("2026-06-24"),
  Location: text("Demo Hall"),
  "Event Status": select("content_drafted"),
  "Event Description": text("LEAK_LEGACY_DESCRIPTION"),
  "Content Type": select(null),
  "Content Status": select(null),
  People: rel(),
  Topics: rel(),
  Event: rel(),
});

const toggleTools = { ...h2("Tools Mentioned"), has_children: true, id: "toggle-tools" };

export const BLOCKS = {
  [IDS.brief]: [
    h2("1. Quick Take"),
    p("Reliability, not capability, was the through-line."),
    quote("LEAK_QUOTE_BLOCK a speaker said this"),
    p("“LEAK_QUOTE_LED line in quick take”"),
    h2("The Thesis"),
    p("Evals are the new unit tests [VERIFY: check the stat]."),
    p("LEAK_PHRASE this part stays in the room"),
    h3("Conditioning Notes"),
    p("LEAK_CONDITIONING nested under thesis"),
    h2("Insights (ranked by durability)"),
    p("Intro line that is not an insight."),
    li("Insight one"),
    li("Insight two"),
    li("Insight three"),
    li("Insight four"),
    li("Insight five"),
    li("LEAK_INSIGHT_SIX"),
    h2("Full Quote Bank"),
    bl("LEAK_QUOTE_BANK “never publish this”"),
    h2("Hot Takes"),
    bl("LEAK_HOT_TAKE"),
    h2("Anecdotes"),
    p("LEAK_ANECDOTE"),
    h2("People & Outreach State"),
    p("LEAK_OUTREACH follow up with Sam at sam@example.com"),
    toggleTools,
    h2("Open Loops"),
    p("LEAK_OPEN_LOOP"),
  ],
  "toggle-tools": [bl("LangGraph"), bl("Braintrust")],
  [IDS.recap]: [
    h2("Variant A — primary"),
    p("LEAK_POST_BODY the post copy itself is on LinkedIn, not here"),
    h2("Tier 1 comment (on the host's recap)"),
    p("LEAK_TIER1 https://example.com/tier1"),
    h2("First comment (sources)"),
    code(
      [
        "Sources + going deeper:",
        "→ The talk slides: https://example.com/slides",
        "→ [VERIFY] The paper: https://arxiv.org/abs/2501.00001",
        "→ [LINK: repo TBD]",
        "[Variant B only] → B-only link: https://example.com/LEAK_VARIANT_B",
        "[Variant A only] → A-only link: https://example.com/variant-a",
        "→ Internal notes: https://www.notion.so/LEAK_NOTION_LINK",
        "→ Contact: LEAK_contact@example.com https://example.com/contact",
        "The event page:",
        "",
        "https://example.com/event",
        "(Add: tag the speakers https://example.com/LEAK_EDITOR_NOTE)",
      ].join("\n"),
    ),
    h2("Visual brief"),
    p("Rendered: content-drafts/demo-dir/post-event-carousel.pdf (4 pages)"),
  ],
  [IDS.preview]: [
    h2("Learn-More Set (first comment)"),
    linkPara("Primer on agent evals", "https://example.com/primer"),
    p("A line with no link at all"),
    p("See content-drafts/demo-dir/uncommitted.pdf"),
  ],
  [IDS.roundup]: [p("roundup body")],
  [IDS.legacyPost]: [
    h2("First comment (post separately)"),
    p("[Variant B only] https://example.com/LEAK_UNKNOWN_VARIANT"),
    p("[LINK: placeholder]"),
  ],
};

export const COMMITTED = new Set([
  "content-drafts/demo-dir/post-event-carousel.pdf",
  "content-drafts/demo-dir/carousel.pdf",
  "content-drafts/other-dir/carousel.pdf",
]);

export const OVERLAY = [
  { slug: "2026-09-16-agents-in-production-nyc", series: "Test Series", what: "A room about agents in production." },
  {
    slug: "2026-06-24-nyc-ai-demos-10",
    notion_page_id: "389d3699-c2db-81e0-9fd4-feced66c7501",
    extra_post_ids: [IDS.legacyPost],
    carousel: "content-drafts/other-dir/carousel.pdf",
  },
  { slug: "2026-09-20-held-room", publish: false },
  { slug: "2026-09-18-nowhere", what: "no event on this date" },
];

const all = [...events, ...people, ...entities, ...drafts, legacyPage];
const byId = new Map(all.map((x) => [x.id.replace(/-/g, ""), x]));

export const source = {
  listEvents: async () => events,
  listDrafts: async () => drafts,
  getPage: async (id) => byId.get(id.replace(/-/g, "")) ?? null,
  getBlocks: async (id) => BLOCKS[id] ?? BLOCKS[id.replace(/-/g, "")] ?? [],
};
