import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/** Resolved Notion database ids (the bare ids, not collection:// data-source ids). */
export const DB = {
  events: required("NOTION_DB_EVENTS"),
  people: required("NOTION_DB_PEOPLE"),
  companies: required("NOTION_DB_COMPANIES"),
  topics: required("NOTION_DB_TOPICS"),
  contentDrafts: required("NOTION_DB_CONTENT_DRAFTS"),
  projectIdeas: required("NOTION_DB_PROJECT_IDEAS"),
} as const;
