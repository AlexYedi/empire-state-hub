export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Empire State — field notes from NYC&apos;s AI rooms, and the system behind them.</span>
        <nav className="flex items-center gap-3">
          <a href="/changelog" className="transition-colors hover:text-fg">
            Changelog
          </a>
          <span className="text-muted/40">·</span>
          <span className="font-mono text-[11px] text-muted/70">Built by Alex Yedibalian · NYC</span>
        </nav>
      </div>
    </footer>
  );
}
