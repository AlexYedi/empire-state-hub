"use client";

import { useLens } from "@/components/lens-provider";
import type { ContentDraft } from "@/lib/content-drafts";

const BUCKETS = [
  { key: "posts", label: "LinkedIn posts", types: ["linkedin_post_pre", "linkedin_post_post"] },
  { key: "synthesis", label: "Two-thesis synthesis", types: ["linkedin_post_synthesis"] },
  { key: "briefs", label: "Research & post-event briefs", types: ["research_brief", "post_event_brief"] },
];

export function WorkShowcase({ items }: { items: ContentDraft[] }) {
  const { lens } = useLens();
  const ed = lens === "editorial";

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        {ed ? "Selected work" : "output"}
      </p>
      <h1
        className={
          ed
            ? "mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
            : "mt-4 font-mono text-3xl font-semibold tracking-tight sm:text-4xl"
        }
      >
        {ed ? "What the attention turns into." : "Output inventory."}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
        {ed
          ? "Every event becomes a researched brief, posts that share what happened, and the notes to follow up. A selection of the output — the briefs are internal data stores, the posts are what reaches the feed."
          : "Showcase-grade content drafts only (posts, synthesis, briefs — no outreach/PII). Live from Notion; status is the Notion field (a proxy)."}
      </p>

      <div className="mt-12 space-y-10">
        {BUCKETS.map((bucket) => {
          const bucketItems = items.filter((i) => i.type && bucket.types.includes(i.type));
          if (bucketItems.length === 0) return null;
          return (
            <section key={bucket.key}>
              <h2 className="mb-3 flex items-baseline gap-2 text-xs uppercase tracking-widest text-muted">
                {bucket.label}
                <span className="text-muted/60">({bucketItems.length})</span>
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {bucketItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-lg border border-border bg-surface p-4"
                  >
                    <p className="text-sm leading-snug text-fg">{item.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                      {item.phase && <span className="text-muted/70">{item.phase}</span>}
                      {item.status && (
                        <span className="rounded border border-border px-1.5 py-0.5">
                          {item.status}
                        </span>
                      )}
                      {item.publishedUrl && (
                        <a
                          href={item.publishedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent hover:underline"
                        >
                          ↗ live
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
