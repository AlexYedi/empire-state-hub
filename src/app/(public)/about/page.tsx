"use client";

import { useLens } from "@/components/lens-provider";

export default function AboutPage() {
  const { lens } = useLens();
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-20">
      {lens === "editorial" ? <EditorialAbout /> : <TechnicalAbout />}
    </div>
  );
}

function EditorialAbout() {
  return (
    <article className="max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">About</p>
      <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
        I sell, I build, and I write down what I see.
      </h1>
      <div className="mt-8 space-y-5 text-lg leading-relaxed text-muted">
        <p>
          Twelve years in enterprise B2B SaaS — account management, new business, customer success
          at Meltwater, Bazaarvoice, Cohley, and now leading enterprise accounts at GKY. The thread
          through all of it is the same: understand a market deeply enough to be useful in the room.
        </p>
        <p>
          Lately that means building. This site, and the pipeline behind it, are me working out
          what &ldquo;full-stack GTM&rdquo; actually looks like when one person can research, write,
          design, and ship with AI as leverage — not as a buzzword.
        </p>
        <p>
          I&apos;m looking for the next thing: an AI-native company, or an enterprise AI/software
          team, where commercial instinct and the ability to build are the same job.
        </p>
        <p className="text-fg">
          If that&apos;s you, I&apos;d like to talk —{" "}
          <a
            href="mailto:alex.e.yedi@gmail.com"
            className="text-accent underline-offset-4 hover:underline"
          >
            alex.e.yedi@gmail.com
          </a>
          .
        </p>
      </div>
    </article>
  );
}

function TechnicalAbout() {
  const stack = [
    "Claude / Agent SDK",
    "Next.js · TypeScript · Tailwind",
    "Notion + HubSpot (MCP)",
    "Linear",
    "Vercel",
    "PostHog",
    "n8n",
    "Supabase",
  ];

  return (
    <div className="max-w-2xl font-mono">
      <p className="text-xs uppercase tracking-widest text-muted">about</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Commercial operator who ships.
      </h1>
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-muted">
        <p>
          12 years enterprise B2B SaaS (Meltwater, Bazaarvoice, Cohley, GKY). Now building at the
          intersection of AI and go-to-market — the kind of work where understanding the buyer and
          building the tool are the same skill.
        </p>
        <p>
          This hub is built the way I&apos;d build internal tooling: typed read layer, schema
          validation at the boundary, secrets server-only, PII designed out, and honest metrics
          (no vanity numbers, proxies labeled as proxies).
        </p>
      </div>

      <div className="mt-8">
        <p className="text-xs uppercase tracking-widest text-muted">Stack</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stack.map((item) => (
            <span key={item} className="rounded border border-border bg-surface px-2 py-1 text-xs">
              {item}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-8 text-sm text-muted">
        Open to AI-native product and enterprise AI/software roles.{" "}
        <a
          href="mailto:alex.e.yedi@gmail.com"
          className="text-accent underline-offset-4 hover:underline"
        >
          alex.e.yedi@gmail.com
        </a>
      </p>
    </div>
  );
}
