// E-04 contract tests — the Public Rooms MCP server against the committed rooms.json.
// Runs the REAL server (SDK wiring included) over an in-memory transport, so tool
// outputs, outputSchema enforcement, and the unknown-slug error path are all exercised
// through the actual MCP protocol.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import {
  createRoomsServer,
  listRooms,
  listSeries,
  searchSpeakers,
  MCP_PUBLIC_FIELDS,
  RoomSummarySchema,
  RoomPublicSchema,
  SpeakerSearchResultSchema,
  SeriesEntrySchema,
} from "../../../src/lib/mcp/rooms-server.mjs";

const require = createRequire(import.meta.url);
const ROOMS = require("../../../src/data/rooms.json").rooms;

/** Fresh server + client over an in-memory transport; runs `fn(client)`. */
async function withClient(fn) {
  const server = createRoomsServer({ rooms: ROOMS });
  const client = new Client({ name: "contract-test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    await fn(client);
  } finally {
    await client.close();
    await server.close();
  }
}

const call = (client, name, args = {}) => client.callTool({ name, arguments: args });

/**
 * Every object key in a tool's structured output must be on the public allowlist.
 * Walks `structuredContent` only — `content`/`isError` are MCP protocol envelope
 * fields, not tool data.
 */
function assertWithinAllowlist(value, path = "$") {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertWithinAllowlist(v, `${path}[${i}]`));
  } else if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      assert.ok(MCP_PUBLIC_FIELDS.has(k), `field ${path}.${k} is outside the public allowlist`);
      assertWithinAllowlist(v, `${path}.${k}`);
    }
  }
}

test("server exposes exactly the four read-only tools", async () => {
  await withClient(async (client) => {
    const { tools } = await client.listTools();
    assert.deepEqual(
      tools.map((t) => t.name).sort(),
      ["get_room", "list_rooms", "list_series", "search_speakers"],
    );
    for (const t of tools) {
      assert.equal(t.annotations?.readOnlyHint, true, `${t.name} must be annotated read-only`);
    }
  });
});

test("list_rooms returns schema-valid output for every committed room", async () => {
  await withClient(async (client) => {
    const result = await call(client, "list_rooms");
    assert.equal(result.isError, undefined);
    const structured = result.structuredContent;
    assert.equal(structured.count, ROOMS.length);
    assert.equal(structured.rooms.length, ROOMS.length);
    for (const row of structured.rooms) RoomSummarySchema.parse(row);
    assertWithinAllowlist(structured);
  });
});

test("list_rooms filters by series and date window", async () => {
  const all = listRooms(ROOMS);
  const withSeries = ROOMS.filter((r) => r.series);
  assert.ok(withSeries.length > 0, "fixture rooms must include a named series");

  const series = withSeries[0].series;
  const bySeries = listRooms(ROOMS, { series });
  assert.ok(bySeries.length > 0);
  assert.ok(bySeries.every((r) => r.series === series));
  assert.deepEqual(
    bySeries.map((r) => r.slug),
    all.filter((r) => r.series === series).map((r) => r.slug),
  );

  const dates = all.map((r) => r.date).sort();
  const mid = dates[Math.floor(dates.length / 2)];
  const window = listRooms(ROOMS, { from: mid, to: mid });
  assert.ok(window.every((r) => r.date === mid));
  assert.ok(listRooms(ROOMS, { from: mid }).every((r) => r.date >= mid));
  assert.ok(listRooms(ROOMS, { to: mid }).every((r) => r.date <= mid));
});

test("list_rooms is chronological", () => {
  const dates = listRooms(ROOMS).map((r) => r.date);
  assert.deepEqual(dates, [...dates].sort());
});

test("get_room returns the room within the public allowlist", async () => {
  await withClient(async (client) => {
    const result = await call(client, "get_room", { slug: ROOMS[0].slug });
    assert.equal(result.isError, undefined);
    const room = RoomPublicSchema.parse(result.structuredContent.room);
    assert.equal(room.slug, ROOMS[0].slug);
    for (const s of room.speakers) {
      assert.deepEqual(Object.keys(s).sort(), ["company", "linkedin", "name", "roles", "title"]);
    }
    assertWithinAllowlist(result.structuredContent);
  });
});

test("get_room with an unknown slug returns a structured MCP error, not a throw", async () => {
  await withClient(async (client) => {
    const result = await call(client, "get_room", { slug: "1900-01-01-not-a-room" });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Unknown room slug/);
    assert.equal(result.structuredContent, undefined, "error results carry no structured payload");
  });
});

test("search_speakers matches by name and company, with the rooms each speaker appeared in", async () => {
  const speaker = ROOMS.flatMap((r) => r.speakers).find((s) => s.company);
  const byCompany = searchSpeakers(ROOMS, speaker.company);
  assert.ok(byCompany.length >= 1);
  assert.ok(byCompany.some((s) => s.rooms.some((ref) => ref.slug)));
  assert.ok(searchSpeakers(ROOMS, speaker.company.toUpperCase()).length >= 1, "company search is case-insensitive");

  const byName = searchSpeakers(ROOMS, speaker.name);
  assert.ok(byName.some((s) => s.name === speaker.name), "name search finds the speaker");

  await withClient(async (client) => {
    const result = await call(client, "search_speakers", { query: speaker.company });
    assert.equal(result.isError, undefined);
    const parsed = SpeakerSearchResultSchema.array().parse(result.structuredContent.speakers);
    // Cross-check: every referenced room actually contains that speaker.
    for (const s of parsed) {
      for (const ref of s.rooms) {
        const room = ROOMS.find((r) => r.slug === ref.slug);
        assert.ok(room, `referenced room ${ref.slug} exists`);
        assert.ok(
          room.speakers.some((x) => x.name === s.name),
          `${s.name} actually appears in ${ref.slug}`,
        );
      }
    }
    assertWithinAllowlist(result.structuredContent);
  });
});

test("search_speakers with a blank or unmatched query returns empty, not an error", async () => {
  assert.deepEqual(searchSpeakers(ROOMS, ""), []);
  assert.deepEqual(searchSpeakers(ROOMS, "zzz-no-such-company"), []);
  await withClient(async (client) => {
    const result = await call(client, "search_speakers", { query: "zzz-no-such-company" });
    assert.equal(result.isError, undefined);
    assert.equal(result.structuredContent.speakers.length, 0);
  });
});

test("list_series counts match the committed rooms", async () => {
  const expected = new Map();
  for (const r of ROOMS) if (r.series) expected.set(r.series, (expected.get(r.series) ?? 0) + 1);
  const series = listSeries(ROOMS);
  assert.equal(series.length, expected.size);
  for (const { name, count } of series) assert.equal(count, expected.get(name));
  assert.ok(series[0].count >= series[series.length - 1].count, "sorted busiest first");

  await withClient(async (client) => {
    const result = await call(client, "list_series");
    assert.equal(result.isError, undefined);
    for (const entry of result.structuredContent.series) SeriesEntrySchema.parse(entry);
    assert.deepEqual(result.structuredContent.series, series);
    assertWithinAllowlist(result.structuredContent);
  });
});

test("invalid tool arguments are rejected by the schema, cleanly", async () => {
  await withClient(async (client) => {
    const result = await call(client, "list_rooms", { from: "not-a-date" });
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent, undefined, "error results carry no structured payload");
  });
});
