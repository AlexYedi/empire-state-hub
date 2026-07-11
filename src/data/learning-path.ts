// Learning path derived from Roberto Infante, "AI Agents and Applications:
// With LangChain, LangGraph and MCP" (Manning). This is an ORIGINAL, re-themed
// learning path — my own staging and my own GTM/events build projects inspired
// by the book, NOT a reproduction of the book's table of contents, exercises,
// or figures. The book is cited as the source text for each stage.

export const BOOK = {
  title: "AI Agents and Applications: With LangChain, LangGraph and MCP",
  author: "Roberto Infante",
  publisher: "Manning Publications",
  note: "Personal learning path inspired by the book. Buy the book; pull runnable code from its official GitHub repo.",
};

export type Stage = {
  n: number;
  slug: string;
  title: string;
  arc: string; // one-line where it sits on the engine→production arc
  learn: string[]; // concepts you walk away with (own words)
  skills: string[]; // backing skills in the alex repo
  project: { name: string; brief: string }; // re-themed GTM build project
  bookRef: string; // chapter pointer (citation)
};

export const STAGES: Stage[] = [
  {
    n: 1,
    slug: "foundations",
    title: "Foundations — LLMs & prompting",
    arc: "Before any framework: pick the right model, prompt it well.",
    learn: [
      "Engine vs. chatbot vs. agent — and not building an agent when an engine will do",
      "The adapt-an-LLM ladder: prompt engineering → RAG → fine-tuning (cheapest first)",
      "The in-context ladder: zero → one → few-shot → CoT → ToT → ThoT",
      "The 8-part prompt structure and forcing structured output",
      "Choosing a model by workload; routing across models in one system",
    ],
    skills: ["advanced-prompting-techniques", "building-with-llms", "ai-engineering-foundations"],
    project: {
      name: "Event-invite classifier + speaker-tier scorer",
      brief:
        "Take a pasted calendar invite → strict JSON (event_type, topics, speakers, host, relevance_tier). Then climb the prompting ladder to score each speaker Prioritize/Open/De-prioritize, logging where few-shot and CoT start producing stable output.",
    },
    bookRef: "Ch. 1–2",
  },
  {
    n: 2,
    slug: "summarization",
    title: "Summarization & the research engine",
    arc: "Compose LLM calls into a real pipeline that researches a topic.",
    learn: [
      "MapReduce vs. Refine summarization (breadth-fast vs. nuance-preserving)",
      "LCEL / Runnable composition: pipe, Passthrough, Parallel, Lambda, .map()",
      "The research-engine flow: question → query-gen → search → scrape → summarize → report",
      "Why a linear chain is rigid — the setup for LangGraph",
    ],
    skills: ["building-with-llms", "advanced-rag-retrieval"],
    project: {
      name: "\"Who's in the room\" research engine",
      brief:
        "Given an event roster, fan out web searches per person/company with .map(), scrape + summarize each, and reduce into a one-page pre-event intelligence brief. A LangChain-native mirror of the existing event-deep-research fan-out — a portfolio 'I rebuilt my pipeline in LCEL' piece.",
    },
    bookRef: "Ch. 3–4",
  },
  {
    n: 3,
    slug: "langgraph-and-rag",
    title: "LangGraph & RAG fundamentals",
    arc: "Make the pipeline adaptive, and ground it in your own corpus.",
    learn: [
      "LangGraph as a state machine: typed state, nodes, conditional edges, loops",
      "Converting a rigid chain into an adaptive graph with a relevance loop (capped)",
      "The RAG pattern; ingestion vs. retrieval stages; dense vs. sparse",
      "The non-negotiable 'answer only from context, else say you don't know' fence",
      "Chatbot memory as a bounded message list; LangSmith tracing to debug retrieval",
    ],
    skills: ["building-agents-with-langgraph", "rag-architect", "rag-and-agent-architecture"],
    project: {
      name: "Relevance-gated event researcher (LangGraph)",
      brief:
        "Port the research engine to a StateGraph with a Relevance Evaluator node: if fewer than half the scraped summaries actually mention the event's speakers/topics, loop back and regenerate queries (cap 3) before writing the brief. Self-correction for thin-signal events.",
    },
    bookRef: "Ch. 5–7",
  },
  {
    n: 4,
    slug: "advanced-rag",
    title: "Advanced RAG — the accuracy toolkit",
    arc: "Diagnose a specific retrieval failure and apply the matching fix.",
    learn: [
      "Indexing-side: parent/child and multi-vector (summary / hypothetical-question) embeddings",
      "Query-side: rewrite, multi-query, step-back, HyDE, decomposition",
      "Routing across vector · SQL · graph backends; self-query metadata filters",
      "Hybrid search + Reciprocal Rank Fusion; retrieval post-processing (threshold, keyword, time-weight)",
      "The failure → technique decision table",
    ],
    skills: ["advanced-rag-retrieval", "rag-architect"],
    project: {
      name: "Event-corpus RAG with parent/child + self-query",
      brief:
        "Index the Notion hub (briefs, transcripts, People/Companies/Topics) with 500-char child chunks and large parents; tag chunks with event/date/speaker/company metadata and build a self-query retriever so 'what did Anthropic folks say in June?' auto-infers filters. Add a router between transcripts (vector) and CRM (text-to-SQL).",
    },
    bookRef: "Ch. 8–10",
  },
  {
    n: 5,
    slug: "agents-mcp-production",
    title: "Agents, MCP & production",
    arc: "Multi-agent orchestration, your own MCP tools, and shipping safely.",
    learn: [
      "Tools + the ReAct loop; prebuilt create_react_agent; steering tool use via the prompt",
      "Single vs. router vs. supervisor (one-way vs. return-ticket)",
      "Building & consuming MCP servers (FastMCP, STDIO vs HTTP, MCP Inspector)",
      "Memory via checkpoints + rewind; layered guardrails (input/agent/post-model); HITL",
      "Evaluation as a discipline (100+ adversarial set) and deployment posture",
    ],
    skills: [
      "multi-agent-orchestration",
      "building-mcp-servers",
      "agent-memory-and-guardrails",
      "ai-evals",
    ],
    project: {
      name: "Router event-intelligence assistant + MCP spine + eval harness",
      brief:
        "Build a router graph dispatching event/person/content specialists with a scope guardrail that rejects off-topic asks before any specialist spend. Expose the Events/Notion spine as a FastMCP server (get_event / list_recent_events / find_person). Add a post-model guardrail that flags unsourced thesis claims or visual-brief repetition, and a 100+ example eval set scoring functional/behavioral/regression pass rates.",
    },
    bookRef: "Ch. 11–14",
  },
];
