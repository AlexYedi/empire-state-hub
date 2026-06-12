"use client";

import { motion } from "motion/react";
import { useLens } from "./lens-provider";
import { cn } from "@/lib/cn";
import type { Lens } from "@/lib/lens";

const OPTIONS: { value: Lens; label: string }[] = [
  { value: "editorial", label: "Editorial" },
  { value: "technical", label: "Technical" },
];

/** The defining control: flips the whole site between its two registers. */
export function LensToggle() {
  const { lens, setLens } = useLens();

  return (
    <div
      role="group"
      aria-label="Choose lens"
      className="relative inline-flex items-center rounded-full border border-border bg-surface p-0.5 font-mono text-xs"
    >
      {OPTIONS.map((option) => {
        const active = lens === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLens(option.value)}
            aria-pressed={active}
            className={cn(
              "relative z-10 rounded-full px-3 py-1.5 transition-colors",
              active ? "text-bg" : "text-muted hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId="lens-thumb"
                className="absolute inset-0 -z-10 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
