import { BOOK, STAGES } from "@/data/learning-path";

export const metadata = {
  title: "Learning Path — Empire State Ops",
};

export default function LearningPathPage() {
  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold">Learning Path — AI Agents & Applications</h1>
        <p className="text-xs text-muted">{STAGES.length} stages · engine → production</p>
      </div>

      <p className="mb-6 max-w-3xl text-sm text-muted">
        A personal, staged path for going from prompting to production agents — my own
        sequencing and my own GTM/events build projects, inspired by{" "}
        <span className="text-fg">{BOOK.title}</span> by {BOOK.author} ({BOOK.publisher}).{" "}
        {BOOK.note}
      </p>

      <div className="space-y-4">
        {STAGES.map((s) => (
          <section
            key={s.slug}
            className="rounded-lg border border-border bg-bg p-5"
          >
            <div className="mb-3 flex items-baseline gap-3">
              <span className="text-2xl font-semibold tabular-nums text-accent">
                {s.n}
              </span>
              <div className="flex-1">
                <h2 className="text-base font-semibold">{s.title}</h2>
                <p className="text-xs text-muted">{s.arc}</p>
              </div>
              <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
                {s.bookRef}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[10px] uppercase tracking-widest text-muted/70">
                  What you learn
                </p>
                <ul className="space-y-1 text-sm">
                  {s.learn.map((l, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-accent">·</span>
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded border border-border bg-surface p-3">
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-muted/70">
                    Build project
                  </p>
                  <p className="text-sm font-semibold">{s.project.name}</p>
                  <p className="mt-1 text-xs text-muted">{s.project.brief}</p>
                </div>

                <div>
                  <p className="mb-1.5 text-[10px] uppercase tracking-widest text-muted/70">
                    Backing skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.skills.map((sk) => (
                      <span
                        key={sk}
                        className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <p className="mt-6 text-[11px] text-muted/70">
        Spine: engine → chatbot → agent → multi-agent → MCP → production. Source:{" "}
        {BOOK.author}, {BOOK.title} ({BOOK.publisher}).
      </p>
    </div>
  );
}
