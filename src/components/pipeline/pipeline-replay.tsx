"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useLens } from "@/components/lens-provider";
import { REPLAY } from "@/data/replay";
import { SYSTEM } from "@/data/architecture";
import { pageFigure } from "@/data/diagrams";
import { Figure } from "@/components/diagram/figure";

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

const STAGES = [
  { n: 1, key: "invite", ed: "The invite", tech: "01 · intake" },
  { n: 2, key: "triage", ed: "Sorting the room", tech: "02 · entity triage" },
  { n: 3, key: "fanout", ed: "Four researchers, at once", tech: "03 · parallel fan-out" },
  { n: 4, key: "synthesis", ed: "Making sense of it", tech: "04 · synthesis" },
  { n: 5, key: "output", ed: "What shipped", tech: "05 · writes → post" },
] as const;

export function PipelineReplay() {
  const { lens } = useLens();
  const ed = lens === "editorial";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-20">
      {/* Header */}
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        {ed ? "One real night, end to end" : "pipeline replay · real run"}
      </p>
      <h1
        className={
          ed
            ? "mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl"
            : "mt-4 font-mono text-3xl font-semibold tracking-tight sm:text-4xl"
        }
      >
        {REPLAY.event.name}
      </h1>
      <p className="mt-2 text-sm text-muted">{REPLAY.event.date}</p>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
        {ed ? REPLAY.event.editorialLede : REPLAY.event.technicalLede}
      </p>

      {/* Stages */}
      <div className="mt-16 space-y-16">
        {STAGES.map((stage) => (
          <section key={stage.key}>
            <Reveal>
              <div className="mb-5 flex items-baseline gap-3">
                <span className="font-mono text-xs text-accent">
                  {ed ? `0${stage.n}` : ""}
                </span>
                <h2
                  className={
                    ed
                      ? "font-display text-2xl tracking-tight"
                      : "font-mono text-sm uppercase tracking-widest text-muted"
                  }
                >
                  {ed ? stage.ed : stage.tech}
                </h2>
              </div>
            </Reveal>
            <StageBody stageKey={stage.key} editorial={ed} />
          </section>
        ))}
      </div>

      {/* Footer note */}
      <Reveal>
        <p className="mt-16 border-t border-border pt-6 text-[11px] leading-relaxed text-muted/80">
          A frozen replay of one real run — entities, findings, and the published post are from the
          actual Notion records, public-figure and public-post content only. The live system writes
          to Notion + HubSpot; this site only reads.
        </p>
      </Reveal>
    </div>
  );
}

function StageBody({ stageKey, editorial }: { stageKey: string; editorial: boolean }) {
  switch (stageKey) {
    case "invite":
      return <InviteStage editorial={editorial} />;
    case "triage":
      return <TriageStage />;
    case "fanout":
      return <FanOutStage editorial={editorial} />;
    case "synthesis":
      return <SynthesisStage editorial={editorial} />;
    case "output":
      return <OutputStage editorial={editorial} />;
    default:
      return null;
  }
}

function InviteStage({ editorial }: { editorial: boolean }) {
  const { speakers, host, topics } = REPLAY.pipelineBlock;
  return (
    <Reveal delay={0.05}>
      {editorial && (
        <p className="mb-4 text-base leading-relaxed text-muted">
          It starts the way every event does — a calendar invite. The only manual step is tagging
          who&apos;s speaking and what it&apos;s about. The machine takes it from there.
        </p>
      )}
      <div className="rounded-lg border border-border bg-surface p-5 font-mono text-xs leading-relaxed">
        <div className="text-muted">PIPELINE</div>
        <div className="mt-2">
          <span className="text-accent">Speakers:</span>
          <ul className="mt-1 space-y-0.5 text-fg">
            {speakers.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        </div>
        <div className="mt-2">
          <span className="text-accent">Host:</span> <span className="text-fg">{host}</span>
        </div>
        <div className="mt-2">
          <span className="text-accent">Topics:</span>{" "}
          <span className="text-fg">{topics.join(" · ")}</span>
        </div>
      </div>
    </Reveal>
  );
}

function TriageStage() {
  const tone: Record<string, string> = {
    NEW: "text-emerald-400 border-emerald-400/30",
    REFRESH: "text-amber-400 border-amber-400/30",
    SKIP: "text-zinc-500 border-zinc-500/30",
  };
  return (
    <Reveal delay={0.05}>
      <div className="space-y-2">
        {REPLAY.triage.map((t) => (
          <div
            key={t.entity}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm"
          >
            <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-mono ${tone[t.path]}`}>
              {t.path}
            </span>
            <span className="w-20 shrink-0 text-[11px] uppercase tracking-widest text-muted">
              {t.type}
            </span>
            <span className="min-w-0 flex-1 truncate text-fg">{t.entity}</span>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

function FanOutStage({ editorial }: { editorial: boolean }) {
  return (
    <div>
      <Reveal delay={0.05}>
        <p className="mb-5 text-base leading-relaxed text-muted">
          {editorial
            ? "Four specialists go to work in parallel — one on the companies, one on the people, one on the topics, one scanning for what just changed in the market."
            : "The parent thread launches four research subagents simultaneously, then a synthesizer converges their returns."}
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <Figure {...pageFigure("replay", "replay-fanout")} />
      </Reveal>

      {/* 4 agents, near-simultaneous */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {REPLAY.fanout.map((f, i) => (
          <motion.div
            key={f.agent}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: 0.15 + i * 0.1 }}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs text-accent">{f.agent}</span>
              <span className="text-[10px] text-muted">{f.scope}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">{f.finding}</p>
          </motion.div>
        ))}
      </div>


      {/* The credibility beat */}
      <Reveal delay={0.1}>
        <div className="mt-8 rounded-lg border border-accent/40 bg-surface p-5">
          <h3 className="font-mono text-xs font-semibold text-accent">{SYSTEM.constraint.title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted">{SYSTEM.constraint.body}</p>
        </div>
      </Reveal>
    </div>
  );
}

function SynthesisStage({ editorial }: { editorial: boolean }) {
  const { quickTake, documentarianAngle, successSignals } = REPLAY.synthesis;
  return (
    <Reveal delay={0.05}>
      <div className="space-y-5">
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Quick take</p>
          <p className="mt-2 text-sm leading-relaxed text-fg">{quickTake}</p>
        </div>
        <div className="rounded-lg border border-accent/40 bg-surface p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-accent">
            {editorial ? "The angle" : "documentarian angle"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-fg">{documentarianAngle}</p>
        </div>
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            Success signals
          </p>
          <ul className="space-y-1.5 text-sm text-muted">
            {successSignals.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-accent">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  );
}

function OutputStage({ editorial }: { editorial: boolean }) {
  const { output } = REPLAY;
  return (
    <div className="space-y-6">
      {/* write DAG */}
      <Reveal delay={0.05}>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          {editorial ? "Filed, in order" : "dependency-ordered writes → Notion"}
        </p>
        <Figure {...pageFigure("replay", "replay-writes")} />
      </Reveal>

      {/* the published post */}
      <Reveal delay={0.1}>
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
              published
            </span>
            <span className="font-mono text-xs text-muted">{output.type}</span>
          </div>
          <h3
            className={
              editorial
                ? "mt-3 font-display text-xl tracking-tight"
                : "mt-3 font-mono text-base font-semibold"
            }
          >
            &ldquo;{output.title}&rdquo;
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">{output.excerpt}</p>
          <a
            href={output.carouselUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-xs text-accent underline-offset-4 hover:underline"
          >
            ↗ the 5-slide carousel that shipped with it
          </a>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="flex flex-wrap items-center gap-4 pt-2 text-sm">
          <Link
            href="/architecture"
            className="rounded-full bg-accent px-5 py-2.5 font-medium text-bg transition-opacity hover:opacity-90"
          >
            See the whole system
          </Link>
          <span className="text-muted">
            flip to <span className="text-fg">{editorial ? "Technical" : "Editorial"}</span> to read
            this {editorial ? "as engineering" : "as a story"} →
          </span>
        </div>
      </Reveal>
    </div>
  );
}
