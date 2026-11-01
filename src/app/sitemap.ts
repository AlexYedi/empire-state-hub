import type { MetadataRoute } from "next";
import { getRooms } from "@/lib/rooms";
import { getLongReadSummaries } from "@/lib/long-reads";
import { siteOrigin } from "@/lib/site-url";

// Static public routes, enumerated by hand — /ops/* is deliberately absent (E-01
// item 5); nothing under src/app/ops may ever be crawlable.
const STATIC_ROUTES = ["", "/rooms", "/themes", "/architecture", "/journal", "/about", "/changelog", "/build-arcs", "/work"];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const now = new Date();

  return [
    ...STATIC_ROUTES.map((path) => ({
      url: `${origin}${path}`,
      lastModified: now,
    })),
    ...getRooms().map((room) => ({
      url: `${origin}/rooms/${room.slug}`,
      lastModified: now,
    })),
    // E-02 executable 6: each long read is its own crawlable page, keyed by the
    // read's own updated date rather than "now".
    ...getLongReadSummaries().map((read) => ({
      url: `${origin}/rooms/${read.slug}/read`,
      lastModified: new Date(read.updated + "T00:00:00Z"),
    })),
  ];
}
