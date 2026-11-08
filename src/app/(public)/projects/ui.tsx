"use client";

// Shared pieces for the In Flight index and the project page.
import type { Milestone, Project } from "@/lib/projects";
import { cn } from "@/lib/cn";

export const HEALTH: Record<Project["health"], { label: string; dot: string }> = {
  "on-track": { label: "On track", dot: "bg-emerald-500" },
  "at-risk": { label: "At risk", dot: "bg-amber-500" },
  "off-track": { label: "Off track", dot: "bg-red-500" },
};

export const STATUS: Record<Project["status"], string> = {
  active: "In flight",
  blocked: "Blocked",
  paused: "Paused",
  archived: "Archived",
};

export const KIND: Record<Project["kind"], string> = {
  project: "Project",
  sprint: "Sprint",
  "sub-project": "Sub-project",
};

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function progress(milestones: Milestone[]): { done: number; total: number } {
  return { done: milestones.filter((m) => m.status === "done").length, total: milestones.length };
}

/** The milestone the work is on now: the first active one, else the first next one. */
export function nowMilestone(milestones: Milestone[]): Milestone | undefined {
  return milestones.find((m) => m.status === "active") ?? milestones.find((m) => m.status === "next");
}

export function HealthPill({ project }: { project: Project }) {
  if (project.status === "archived") {
    return <Pill>{STATUS.archived}</Pill>;
  }
  const h = HEALTH[project.health];
  return (
    <Pill>
      <span className={cn("inline-block h-1.5 w-1.5 rounded-full", h.dot)} aria-hidden />
      {project.status === "active" ? h.label : STATUS[project.status]}
    </Pill>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 font-mono text-[11px] text-muted">
      {children}
    </span>
  );
}

export function ProgressBar({ milestones }: { milestones: Milestone[] }) {
  const { done, total } = progress(milestones);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${done} of ${total} milestones done`}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 font-mono text-[11px] text-muted">
        {done} of {total} milestones done
      </p>
    </div>
  );
}
