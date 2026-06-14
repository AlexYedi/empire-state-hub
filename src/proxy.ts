import { NextResponse, type NextRequest } from "next/server";

// v1 gate for /ops: HTTP Basic Auth against OPS_PASSWORD.
// - Local dev with no password set: allowed (so building isn't blocked).
// - Production with no password set: denied (deploy-safe by default — you must set
//   OPS_PASSWORD in the Vercel env to open it). Upgrade path: Auth.js (M3 / YED-76).
// (Next 16 "proxy" convention — successor to the deprecated "middleware" file.)
export function proxy(req: NextRequest) {
  const password = process.env.OPS_PASSWORD;

  if (!password) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Not found", { status: 404 });
    }
    return NextResponse.next();
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const [, supplied] = atob(header.slice(6)).split(":");
      if (supplied === password) return NextResponse.next();
    } catch {
      // malformed header — fall through to challenge
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="empire-state ops", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/ops", "/ops/:path*"] };
