import Link from "next/link";

// The operator cockpit. Always the technical register (exempt from the marketing lens):
// data-lens="technical" pins the dark/mono tokens for this whole subtree.
const NAV = [
  { href: "/ops", label: "Overview" },
  { href: "/ops/content", label: "Content" },
  { href: "/ops/rigor", label: "Rigor" },
  { href: "/ops/events", label: "Events" },
  { href: "/ops/ideas", label: "Ideas" },
  { href: "/ops/learning-path", label: "Learning Path" },
  { href: "/ops/backlog", label: "Backlog" },
  { href: "/ops/entities", label: "Entities" },
  { href: "/ops/market-intel", label: "Market Intel" },
  { href: "/ops/toolbox", label: "Toolbox" },
];

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-lens="technical" className="min-h-screen bg-bg font-mono text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3 text-sm">
          <Link href="/ops" className="shrink-0 font-semibold tracking-tight">
            empire-state <span className="text-muted">//ops</span>
          </Link>
          <nav className="flex flex-wrap gap-1 text-muted">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-2 py-1 transition-colors hover:bg-surface hover:text-fg"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="ml-auto hidden shrink-0 text-[10px] uppercase tracking-widest text-muted sm:block">
            operator cockpit
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
