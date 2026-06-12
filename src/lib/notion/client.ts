import "server-only";
import { Client, isFullPage } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client";

// Single server-only Notion client. The token never reaches the browser.
const notion = new Client({ auth: process.env.NOTION_TOKEN });

// v5 API: a database exposes data sources; rows are queried on the data source.
// Cache the db-id -> data-source-id resolution for the process lifetime.
const dataSourceIds = new Map<string, string>();

async function resolveDataSourceId(databaseId: string): Promise<string> {
  const cached = dataSourceIds.get(databaseId);
  if (cached) return cached;
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const sources = (db as { data_sources?: { id: string }[] }).data_sources;
  const id = sources?.[0]?.id;
  if (!id) throw new Error(`No data source found for Notion database ${databaseId}`);
  dataSourceIds.set(databaseId, id);
  return id;
}

/** Query every row of a database (paginated), returning only full page objects. */
export async function queryAllRows(databaseId: string): Promise<PageObjectResponse[]> {
  const dataSourceId = await resolveDataSourceId(databaseId);
  const rows: PageObjectResponse[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const row of res.results) {
      if (isFullPage(row)) rows.push(row);
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return rows;
}
