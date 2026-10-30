import type { MetadataRoute } from "next";

// The canonical origin. On Vercel, VERCEL_PROJECT_PRODUCTION_URL (then VERCEL_URL)
// is auto-injected by the platform — no new env vars are introduced (.env.example
// is untouched). The localhost fallback only affects local dev, where robots.txt
// is never crawled. If a pinned custom domain is preferred, replace this helper
// with a constant. (E-01 item 6; the sitemap in E-01 item 5 resolves the same way.)
function siteOrigin(): string {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "localhost:3000";
  return `https://${host.replace(/^https?:\/\//, "")}`;
}

// Allow everything except the operator cockpit: /ops/* is Basic-auth-gated and
// must never be crawled.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/ops/",
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
