import type { MetadataRoute } from "next";
import { getRooms } from "@/lib/rooms";

// The canonical origin. On Vercel, VERCEL_PROJECT_PRODUCTION_URL (then VERCEL_URL)
// is auto-injected by the platform — no new env vars are introduced (.env.example
// is untouched). The localhost fallback only affects local dev, where the sitemap
// is never crawled. If a pinned custom domain is preferred, replace this helper
// with a constant.
function siteOrigin(): string {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "localhost:3000";
  return `https://${host.replace(/^https?:\/\//, "")}`;
}

// Static public routes, enumerated by hand — /ops/* is deliberately absent (E-01
// item 5); nothing under src/app/ops may ever be crawlable.
const STATIC_ROUTES = ["", "/rooms", "/architecture", "/journal", "/about", "/changelog", "/build-arcs", "/work"];

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
  ];
}
