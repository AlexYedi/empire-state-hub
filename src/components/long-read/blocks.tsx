import Link from "next/link";
import type { LongReadBlock } from "@/lib/long-reads";

// One component per E-02 v1 block type (spec Phase 3). Server components — the
// blocks carry no interactivity. House styles come from the lens tokens in globals.css.

export function HeadingBlock({ text }: { text: string }) {
  return <h2 className="mt-12 font-display text-2xl leading-tight tracking-tight">{text}</h2>;
}

export function ParagraphBlock({ text }: { text: string }) {
  return <p className="mt-6 text-[17px] leading-[1.75] text-fg/90">{text}</p>;
}

// Pull-quotes get an acid-green left rule... in the technical lens that is the
// accent teal; `border-accent` follows the live token either way (spec Phase 2).
export function QuoteBlock({ text, attribution }: { text: string; attribution: string }) {
  return (
    <blockquote className="mt-8 border-l-2 border-accent pl-5">
      <p className="font-display text-xl leading-relaxed sm:text-2xl sm:leading-relaxed">“{text}”</p>
      <footer className="mt-2 text-xs uppercase tracking-widest text-muted">{attribution}</footer>
    </blockquote>
  );
}

// Lazy-loaded static assets with captions (spec Phase 2); plain <img> like the
// room view, since the sources are committed files in /public.
export function ImageBlock({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="mt-10">
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset in /public */}
      <img src={src} alt={alt} loading="lazy" className="w-full rounded-lg border border-border bg-surface" />
      {caption && <figcaption className="mt-2 text-xs leading-relaxed text-muted">{caption}</figcaption>}
    </figure>
  );
}

// Large mono number, label and source beneath (spec Phase 2).
export function StatBlock({ value, label, source }: { value: string; label: string; source: string }) {
  return (
    <div className="mt-10 rounded-lg border border-border bg-surface p-6">
      <p className="font-mono text-4xl tracking-tight text-accent">{value}</p>
      <p className="mt-2 text-sm leading-relaxed">{label}</p>
      <p className="mt-1 text-xs text-muted">Source: {source}</p>
    </div>
  );
}

export function CalloutBlock({ title, text }: { title?: string; text: string }) {
  return (
    <aside className="mt-10 rounded-lg border border-border bg-surface p-5 text-sm leading-relaxed text-fg/90">
      {title && <p className="mb-1 font-medium">{title}</p>}
      <p>{text}</p>
    </aside>
  );
}

// Numbered list at the end (spec Phase 2). Site-relative URLs render as internal
// links; absolute ones open in a new tab.
export function SourcesBlock({ items }: { items: { label: string; url?: string }[] }) {
  return (
    <section className="mt-12 border-t border-border pt-6">
      <h2 className="text-xs uppercase tracking-widest text-muted">Sources</h2>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-fg/80">
        {items.map((s, i) => (
          <li key={i}>
            {s.url ? (
              s.url.startsWith("/") ? (
                s.url.match(/\.(pdf|png|jpe?g)$/) ? (
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    {s.label}
                  </a>
                ) : (
                  <Link href={s.url} className="text-accent hover:underline">
                    {s.label}
                  </Link>
                )
              ) : (
                <a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  {s.label} ↗
                </a>
              )
            ) : (
              s.label
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function BlockRenderer({ block }: { block: LongReadBlock }) {
  switch (block.type) {
    case "heading":
      return <HeadingBlock text={block.text} />;
    case "paragraph":
      return <ParagraphBlock text={block.text} />;
    case "quote":
      return <QuoteBlock text={block.text} attribution={block.attribution} />;
    case "image":
      return <ImageBlock src={block.src} alt={block.alt} caption={block.caption} />;
    case "stat":
      return <StatBlock value={block.value} label={block.label} source={block.source} />;
    case "callout":
      return <CalloutBlock title={block.title} text={block.text} />;
    case "sources":
      return <SourcesBlock items={block.items} />;
  }
}
