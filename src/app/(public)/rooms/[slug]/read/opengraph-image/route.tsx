import { ImageResponse } from "next/og";
import { getLongRead } from "@/lib/long-reads";
import { getRoom } from "@/lib/rooms";

// Per-read Open Graph image (E-02 executable 6): the event name as the title,
// the event date beneath, house tokens throughout — the same dark base and
// signature acid green as the site-wide default (src/app/opengraph-image.tsx).
//
// This is an explicit route handler at a stable path rather than the
// opengraph-image.tsx file convention: in this app the file convention's
// generated route is served under a build-hash-suffixed path
// (/read/opengraph-image-<hash>) while the injected meta tag points at the
// unsuffixed path, which 404s. An explicit handler keeps the URL that
// generateMetadata points at and the URL that serves identical.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = getRoom(slug);
  const read = getLongRead(slug);
  if (!room || !read) {
    // dynamicParams = false means only known slugs reach build; a miss here is
    // a broken registry, not content to render.
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#0E1320",
          padding: "96px 112px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: 160,
            height: 8,
            background: "#8FE83A",
            marginBottom: 48,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: room.name.length > 60 ? 64 : 80,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            color: "#F1F3F8",
          }}
        >
          {room.name}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 32,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#9AA6BF",
          }}
        >
          Long read · {room.date}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
