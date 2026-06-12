// Confirms the live credentials in .env.local actually reach Notion + Linear.
// Run: node --env-file=.env.local scripts/verify-sources.mjs
// Prints names/counts only — never secret values.
import { Client } from "@notionhq/client";
import { LinearClient } from "@linear/sdk";

let ok = true;
const fail = (msg) => {
  ok = false;
  console.log(`  ✗ ${msg}`);
};

const NOTION_DBS = {
  Events: process.env.NOTION_DB_EVENTS,
  People: process.env.NOTION_DB_PEOPLE,
  Companies: process.env.NOTION_DB_COMPANIES,
  Topics: process.env.NOTION_DB_TOPICS,
  "Content Drafts": process.env.NOTION_DB_CONTENT_DRAFTS,
  "Project Ideas": process.env.NOTION_DB_PROJECT_IDEAS,
};

console.log("== Notion ==");
if (!process.env.NOTION_TOKEN) {
  fail("NOTION_TOKEN not set");
} else {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  for (const [name, id] of Object.entries(NOTION_DBS)) {
    if (!id) {
      fail(`${name}: missing id`);
      continue;
    }
    try {
      const db = await notion.databases.retrieve({ database_id: id });
      const title = db.title?.map((t) => t.plain_text).join("") || "(untitled)";
      const dsCount = db.data_sources?.length ?? 0;
      console.log(`  ✓ ${name.padEnd(15)} → "${title}" (${dsCount} data source${dsCount === 1 ? "" : "s"})`);
    } catch (e) {
      fail(`${name}: ${e.code || e.message}`);
    }
  }
}

console.log("\n== Linear ==");
if (!process.env.LINEAR_API_KEY) {
  fail("LINEAR_API_KEY not set");
} else {
  try {
    const linear = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
    const me = await linear.viewer;
    const issues = await linear.issues({ first: 5 });
    console.log(`  ✓ authed as ${me.name}; issues query returned ${issues.nodes.length} (sample)`);
  } catch (e) {
    fail(`Linear: ${e.message}`);
  }
}

console.log(ok ? "\nALL SOURCES OK ✓" : "\nSOME SOURCES FAILED ✗");
process.exit(ok ? 0 : 1);
