# E-04 · Public NYC AI Rooms MCP server, B4 (Empire)

**Repo:** empire-state-hub · source: roadmap build B4 · read-only, public Rooms fields only

## Product
Any MCP client (Claude, Cursor) connects to `https://<hub>/api/mcp` and asks about NYC AI events Alex has attended: who spoke, which companies were in the room, which series. It's also a portfolio piece and the opener for conversations with Anthropic and other MCP teams.

## Tools (read-only)
- `list_rooms({ series?, from?, to? })` → `[{ slug, name, date, series, location }]`
- `get_room({ slug })` → the room as in `rooms.json`. Speakers carry name, title, company, LinkedIn and roles only.
- `search_speakers({ query })` → speakers matching name or company, each with the rooms they appeared in.
- `list_series()` → the distinct series, each with its room count.

## Technical
- **Route:** `src/app/api/mcp/route.ts`, Streamable HTTP transport.
  - Use `@modelcontextprotocol/sdk` or Vercel's `mcp-handler`. **Pick one, justify it on the plan card, and confirm it supports Next 16.**
- **Data:** imported from `src/lib/rooms.ts` only. It MUST NOT import `src/lib/notion` or `src/lib/linear`.
- **Inputs:** validated with zod. An unknown slug returns a structured MCP error, never a 500.
- No auth (the data is public), no write tools, no env vars.
- **Tests (`node --test`):**
  - Every tool returns schema-valid output on the committed `rooms.json`.
  - No output field falls outside the public allowlist.
  - An unknown slug errors cleanly.
- **Docs:** `docs/mcp.md` with the URL, the tool list, and Claude Desktop / Claude Code config snippets.

**Executables:**
1. SDK choice, route skeleton and `list_series`.
2. The other three tools.
3. Contract tests.
4. Docs.

**Done when:**
- MCP Inspector against the local dev server lists 4 tools, and each returns data.
- The tests pass.
- `pnpm check && pnpm lint && pnpm build` pass.
