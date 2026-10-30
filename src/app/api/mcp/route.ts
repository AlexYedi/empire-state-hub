// Public Rooms MCP server (E-04) — Streamable HTTP transport at /api/mcp.
//
// Read-only tools over the committed, zod-validated rooms.json (src/lib/rooms.ts) —
// never Notion or Linear, no auth (the data is public), no env vars, no writes.
//
// Stateless: a fresh server + transport per request with JSON (non-SSE) responses,
// the pattern the MCP SDK documents for serverless-style HTTP deployments — nothing
// to clean up and nothing that breaks across Vercel invocations.
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getRooms } from "@/lib/rooms";
import { createRoomsServer } from "@/lib/mcp/rooms-server.mjs";

async function handleMcpRequest(req: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createRoomsServer({ rooms: getRooms() });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    await server.close();
  }
}

// MCP requests are never cacheable — every POST is a fresh JSON-RPC exchange.
export const dynamic = "force-dynamic";

export { handleMcpRequest as GET, handleMcpRequest as POST, handleMcpRequest as DELETE };
