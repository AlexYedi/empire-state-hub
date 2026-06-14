import { getEntityCounts } from "@/lib/entities";

export const dynamic = "force-dynamic";

export default async function EntitiesPage() {
  const e = await getEntityCounts();

  const tiles = [
    { label: "people", value: e.people },
    { label: "companies", value: e.companies },
    { label: "topics", value: e.topics },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold">Entities</h1>
      <p className="mt-1 text-xs text-muted">The knowledge graph the pipeline has built.</p>

      <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {tiles.map((t) => (
          <div key={t.label} className="bg-surface px-4 py-5 text-center">
            <div className="text-2xl font-semibold tabular-nums">{t.value}</div>
            <div className="mt-1 text-[11px] uppercase tracking-widest text-muted">{t.label}</div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-muted/70">
        People are counted only — no names, emails, or contact details are surfaced (privacy by design).
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <EntityList title={`Companies (${e.companies})`} items={e.companyNames} />
        <EntityList title={`Topics (${e.topics})`} items={e.topicNames} />
      </div>
    </div>
  );
}

function EntityList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="mb-2 text-xs uppercase tracking-widest text-muted">{title}</h2>
      <div className="flex flex-wrap gap-1.5">
        {items.map((name) => (
          <span key={name} className="rounded border border-border bg-surface px-2 py-1 text-xs">
            {name}
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-muted/60">—</span>}
      </div>
    </section>
  );
}
