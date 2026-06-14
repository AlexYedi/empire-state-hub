export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Empire State — field notes from NYC&apos;s AI rooms, and the system behind them.</span>
        <span className="font-mono text-[11px] text-muted/70">Built by Alex Yedibalian · New York</span>
      </div>
    </footer>
  );
}
