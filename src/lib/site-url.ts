// The canonical origin (E-01 item 5 idiom). On Vercel, VERCEL_PROJECT_PRODUCTION_URL
// (then VERCEL_URL) is auto-injected by the platform — no new env vars are introduced
// (.env.example is untouched). The localhost fallback only affects local dev, where
// share links are never crawled.
export function siteOrigin(): string {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "localhost:3000";
  return `https://${host.replace(/^https?:\/\//, "")}`;
}

/** Absolute URL for a site-relative path, for metadata and share intents. */
export function pageUrl(path: string): string {
  return `${siteOrigin()}${path}`;
}
