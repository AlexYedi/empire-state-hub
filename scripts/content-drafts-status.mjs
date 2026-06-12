// Proves deep row reads via the Notion v5 data-sources API, and prints the real
// Content Drafts breakdown by status + type. Run:
//   node --env-file=.env.local scripts/content-drafts-status.mjs
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const CD = process.env.NOTION_DB_CONTENT_DRAFTS;

// v5: a database has data sources; rows are queried on the data source.
const db = await notion.databases.retrieve({ database_id: CD });
const dataSourceId = db.data_sources[0].id;

const rows = [];
let cursor;
do {
  const res = await notion.dataSources.query({
    data_source_id: dataSourceId,
    start_cursor: cursor,
    page_size: 100,
  });
  rows.push(...res.results);
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

const byStatus = {};
const byType = {};
for (const r of rows) {
  const status = r.properties?.["Content Status"]?.select?.name ?? "(none)";
  const type = r.properties?.["Content Type"]?.select?.name ?? "(none)";
  byStatus[status] = (byStatus[status] ?? 0) + 1;
  byType[type] = (byType[type] ?? 0) + 1;
}

console.log(`Content Drafts — ${rows.length} total rows (live from Notion API)\n`);
console.log("By status:");
for (const [k, v] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(3)}  ${k}`);
}
console.log("\nBy type:");
for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(3)}  ${k}`);
}
