"use client";

import Link from "next/link";
import { useLens } from "@/components/lens-provider";
import { POST_KIND_LABEL, roomCarousels, type Room } from "@/lib/rooms";
import { fmtRoomDate } from "../rooms-index";

const URL_SPLIT = /(https?:\/\/[^\s)]+)/g;

/** First-comment lines are plain text with URLs; render the URLs as links, nothing else. */
function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_SPLIT).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all text-accent hover:underline">
            {part.replace(/^https?:\/\/(www\.)?/, "")}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-3 text-xs uppercase tracking-widest text-muted">{title}</h2>
      {children}
    </section>
  );
}

export function RoomView({ room }: { room: Room }) {
  const { lens } = useLens();
  const ed = lens === "editorial";
  const carousels = roomCarousels(room);
  const t = room.takeaways;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-20">
      <Link href="/rooms" className="font-mono text-xs uppercase tracking-widest text-muted hover:text-accent">
        ← {ed ? "All rooms" : "rooms"}
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <time className="font-mono text-[11px] uppercase tracking-widest text-muted">{fmtRoomDate(room.date)}</time>
        {room.series && (
          <Link
            href={`/rooms?series=${encodeURIComponent(room.series)}`}
            className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted hover:text-accent"
          >
            {room.series}
          </Link>
        )}
        {room.location && <span className="text-[11px] text-muted">· {room.location}</span>}
      </div>
      <h1
        className={
          ed
            ? "mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl"
            : "mt-3 font-mono text-2xl font-semibold tracking-tight sm:text-3xl"
        }
      >
        {room.name}
      </h1>
      {room.what && <p className="mt-4 text-lg leading-relaxed text-muted">{room.what}</p>}

      {room.speakers.length > 0 && (
        <Section title={ed ? "On stage" : `speakers (${room.speakers.length})`}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {room.speakers.map((s, i) => (
              <li key={`${s.name}-${i}`} className="rounded-lg border border-border bg-surface p-3">
                {s.linkedin ? (
                  <a href={s.linkedin} target="_blank" rel="noreferrer" className="text-sm font-medium hover:text-accent">
                    {s.name} <span className="text-[10px] text-muted">↗</span>
                  </a>
                ) : (
                  <span className="text-sm font-medium">{s.name}</span>
                )}
                <p className="mt-0.5 text-xs text-muted">
                  {[s.title, s.company].filter(Boolean).join(" · ")}
                  <span className="ml-1 font-mono text-[10px] text-muted/70">{s.roles.join(" / ")}</span>
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {t ? (
        <Section title={ed ? "What the room was working through" : "takeaways"}>
          <div className="space-y-5 text-sm leading-relaxed text-fg/90">
            {t.quickTake.length > 0 && t.quickTake.map((x, i) => <p key={`q${i}`}>{x}</p>)}
            {t.thesis.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">The thesis</h3>
                {t.thesis.map((x, i) => (
                  <p key={`t${i}`}>{x}</p>
                ))}
              </div>
            )}
            {t.insights.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">Insights</h3>
                <ol className="list-decimal space-y-1.5 pl-5">
                  {t.insights.map((x, i) => (
                    <li key={`i${i}`}>{x}</li>
                  ))}
                </ol>
              </div>
            )}
            {t.tools.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">Tools mentioned</h3>
                <ul className="list-disc space-y-1 pl-5">
                  {t.tools.map((x, i) => (
                    <li key={`o${i}`}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      ) : (
        <p className="mt-12 text-sm italic text-muted">Recap pending.</p>
      )}

      {carousels.length > 0 && (
        <Section title={ed ? "Carousel" : `carousels (${carousels.length})`}>
          <div className="grid gap-4 sm:grid-cols-2">
            {carousels.map((c) => (
              <a
                key={c.pdf}
                href={c.pdf}
                target="_blank"
                rel="noreferrer"
                className="group block overflow-hidden rounded-lg border border-border bg-surface hover:border-accent"
              >
                {c.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static asset in /public
                  <img src={c.preview} alt="First slide of the carousel" className="aspect-[4/5] w-full object-cover" />
                ) : (
                  <object data={c.pdf} type="application/pdf" className="pointer-events-none aspect-[4/5] w-full" aria-label="Carousel PDF">
                    <span className="block p-4 text-sm text-muted">PDF carousel</span>
                  </object>
                )}
                <span className="block p-3 text-xs text-muted group-hover:text-accent">Open the carousel (PDF) ↗</span>
              </a>
            ))}
          </div>
        </Section>
      )}

      {room.posts.length > 0 && (
        <Section title={ed ? "Alex's posts" : `posts (${room.posts.length})`}>
          <ul className="space-y-3">
            {room.posts.map((p) => (
              <li key={p.url} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
                    {POST_KIND_LABEL[p.kind]}
                    {p.roundup ? " · weekly roundup" : ""}
                  </span>
                  <a href={p.url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
                    Read on LinkedIn ↗
                  </a>
                </div>
                {p.firstComment && (
                  <div className="mt-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted">Sources from the first comment</p>
                    <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-fg/80">
                      {p.firstComment.map((line, i) => (
                        <li key={i}>
                          <Linkified text={line} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(room.topics.length > 0 || room.companies.length > 0) && (
        <Section title={ed ? "In the room" : "topics · companies"}>
          <div className="flex flex-wrap gap-1.5">
            {room.topics.map((x) => (
              <Link
                key={`t-${x}`}
                href={`/rooms?topic=${encodeURIComponent(x)}`}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted hover:text-accent"
              >
                {x}
              </Link>
            ))}
            {room.companies.map((x) => (
              <Link
                key={`c-${x}`}
                href={`/rooms?company=${encodeURIComponent(x)}`}
                className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted hover:text-accent"
              >
                {x}
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
