// "Share on X" (E-06 item 1) — a plain anchor to the X intent URL. No hooks, so it
// renders in both server and client trees; the href is built server-side from
// siteOrigin() and passed in (the origin env vars are not available client-side).
export function ShareOnX({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-xs uppercase tracking-widest text-muted hover:text-accent"
    >
      Share on X ↗
    </a>
  );
}
