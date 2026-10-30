# Public Rooms MCP server (E-04)

An MCP (Model Context Protocol) server exposing Alex's public NYC AI room archive — the same committed, reviewed data behind [rooms.json](../src/data/rooms.json) — to any MCP client.

- **URL:** `https://<hub>/api/mcp` (replace `<hub>` with the deployed hub's domain; locally: `http://localhost:3000/api/mcp`)
- **Transport:** Streamable HTTP (JSON responses, stateless)
- **Auth:** none — the data is public
- **Writes:** none — four read-only tools, no env vars

## Tools

### `list_rooms`
List rooms (events) in the archive, oldest first.

| Input | Type | Description |
|---|---|---|
| `series` | string, optional | Exact series name, e.g. `"The Shortlist"` |
| `from` | string, optional | Inclusive start date, `YYYY-MM-DD` |
| `to` | string, optional | Inclusive end date, `YYYY-MM-DD` |

Returns `{ rooms: [{ slug, name, date, series, location }], count }`.

### `get_room`
Get one room by slug — the room as in `rooms.json`: speakers (name, title, company, LinkedIn, roles), topics, companies, takeaways, and published post links. An unknown slug returns a structured MCP error (never a 500).

| Input | Type | Description |
|---|---|---|
| `slug` | string | Room slug, e.g. `"2026-09-28-shortlist-september-founder-showcase"` |

Returns `{ room: { … } }`.

### `search_speakers`
Search speakers across all rooms by name or company (case-insensitive substring). Each hit lists every room the person appeared in.

| Input | Type | Description |
|---|---|---|
| `query` | string | Name or company substring, e.g. `"Amperos"` |

Returns `{ speakers: [{ name, title, company, linkedin, rooms: [{ slug, name, date, roles }] }], count }`.

### `list_series`
List the distinct event series in the archive, each with its room count, busiest first. Takes no arguments.

Returns `{ series: [{ name, count }] }`.

## Connect from Claude Desktop

Add to `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "empire-rooms": {
      "url": "https://<hub>/api/mcp"
    }
  }
}
```

## Connect from Claude Code

```sh
claude mcp add --transport http empire-rooms https://<hub>/api/mcp
```

Or in `.mcp.json` / `~/.claude.json`:

```json
{
  "mcpServers": {
    "empire-rooms": {
      "type": "http",
      "url": "https://<hub>/api/mcp"
    }
  }
}
```

## Verify locally

```sh
pnpm dev
npx @modelcontextprotocol/inspector   # connect to http://localhost:3000/api/mcp
pnpm test:mcp                         # contract tests (also part of pnpm check)
```

## Implementation notes

- **Route:** `src/app/api/mcp/route.ts` — a fresh server + `WebStandardStreamableHTTPServerTransport` per request, JSON responses. Stateless, so nothing breaks across serverless invocations.
- **Data:** imported from `src/lib/rooms.ts` only (zod-parsed `rooms.json`). Never Notion or Linear.
- **SDK:** `@modelcontextprotocol/sdk` (official TypeScript SDK). Its web-standard transport consumes the Web `Request`/`Response` that Next 16 route handlers use, with no Node shim. Vercel's `mcp-handler` was rejected: its peer dependency on `@modelcontextprotocol/server ^2.0.0` does not match the published SDK line and its Next 16 support is unverified.
- **Public-safety boundary:** outputs are projected onto an explicit allowlist (`MCP_PUBLIC_FIELDS` in `src/lib/mcp/rooms-server.mjs`) and enforced by `outputSchema` plus the contract tests in `scripts/fixtures/mcp/rooms-server.test.mjs`. Speakers carry name, title, company, LinkedIn, and roles only — the same boundary as the site.
