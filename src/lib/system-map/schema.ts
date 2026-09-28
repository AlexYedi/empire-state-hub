// The contract between scripts/gen-system-map.mjs and the /architecture page. Parsed at import time
// in the page, so a malformed regeneration fails the build rather than rendering something wrong.
import { z } from "zod";

export const STATUSES = ["live", "stale", "scaffolded", "parked", "planned"] as const;
export const EDGE_KINDS = ["reads", "writes", "dispatches", "gates", "produces", "consumes", "depends-on"] as const;
export const KINDS = ["command", "skill", "agent", "hook", "script", "reference", "policy", "external", "surface"] as const;

export type Status = (typeof STATUSES)[number];
export type EdgeKind = (typeof EDGE_KINDS)[number];

const Ref = z.object({ id: z.string(), url: z.string() });

export const ComponentSchema = z.object({
  id: z.string(),
  zone: z.string(),
  name: z.string(),
  kind: z.enum(KINDS),
  status: z.enum(STATUSES),
  statusReason: z.string().nullable(),
  description: z.string(),
  why: z.object({ text: z.string().min(1), source: z.string().min(1) }),
  build: z.object({
    firstShipped: z.string().nullable(),
    lastChanged: z.string().nullable(),
    refs: z.array(Ref),
    adrs: z.array(Ref),
    note: z.string().nullable(),
  }),
  tools: z.array(z.string()),
  files: z.array(z.string()),
  fileCount: z.number(),
  reviewed_at: z.string(),
  overlayStale: z.boolean(),
});

export const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  kind: z.enum(EDGE_KINDS),
  summary: z.string(),
  status: z.enum(STATUSES),
});

export const BuildItemSchema = z.object({
  issue: z.string(),
  extends: z.array(z.string()),
  why: z.string(),
  phase: z.string(),
  url: z.string(),
});

export const SystemMapSchema = z.object({
  generated_at: z.string(),
  source: z.object({
    pipeline_sha: z.string(),
    graph_built_at: z.string().nullable(),
    graph_nodes: z.number(),
    graph_edges: z.number(),
    unmapped_files: z.number(),
  }),
  counts: z.object({ skills: z.number(), agents: z.number(), commands: z.number(), components: z.number() }),
  zones: z.array(z.object({ id: z.string(), name: z.string(), blurb: z.string() })),
  components: z.array(ComponentSchema),
  edges: z.array(EdgeSchema),
  buildPath: z.object({
    phases: z.array(z.object({ id: z.string(), label: z.string(), window: z.string(), anchor: z.string().nullable(), issueCount: z.number() })),
    anchors: z.array(z.object({ id: z.string(), label: z.string(), milestone: z.string(), date: z.string(), proof: z.string() })),
    items: z.array(BuildItemSchema),
  }),
  overlayStale: z.array(z.string()),
});

export const FilesSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      subtype: z.string(),
      component: z.string().nullable(),
      description: z.string(),
      firstShipped: z.string().nullable(),
      lastChanged: z.string().nullable(),
      url: z.string(),
    }),
  ),
  edges: z.array(z.object({ src: z.string(), dst: z.string(), line: z.number().nullable() })),
});

export type SystemMap = z.infer<typeof SystemMapSchema>;
export type MapComponent = z.infer<typeof ComponentSchema>;
export type MapEdge = z.infer<typeof EdgeSchema>;
export type BuildItem = z.infer<typeof BuildItemSchema>;
export type FilesGraph = z.infer<typeof FilesSchema>;
export type FileNode = FilesGraph["nodes"][number];

/** What the page adds from Linear at render time (null when Linear is unreachable). */
export type LinearState = {
  identifier: string;
  title: string;
  state: string;
  stateType: string;
  priorityLabel: string;
  url: string;
};
