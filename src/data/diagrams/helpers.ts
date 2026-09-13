import type { DNode } from "@/components/diagram/types";

/** Terse node constructor for authoring specs. */
export const n = (id: string, label: string, o: Omit<DNode, "id" | "label"> = {}): DNode => ({ id, label, ...o });
