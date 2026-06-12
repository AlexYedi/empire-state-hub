import type { PageObjectResponse } from "@notionhq/client";

type Properties = PageObjectResponse["properties"];
type Property = Properties[string];

// Typed, narrowing accessors for Notion property values. Each returns a clean
// primitive and never throws on the wrong type — keeps the read layer terse.
// Note: we deliberately expose NO accessor for email/phone — PII stays out by design.

export function titleText(prop: Property | undefined): string {
  if (prop?.type === "title") return prop.title.map((t) => t.plain_text).join("");
  return "";
}

export function selectName(prop: Property | undefined): string | null {
  if (prop?.type === "select") return prop.select?.name ?? null;
  return null;
}

export function urlValue(prop: Property | undefined): string | null {
  if (prop?.type === "url") return prop.url ?? null;
  return null;
}

export function dateStart(prop: Property | undefined): string | null {
  if (prop?.type === "date") return prop.date?.start ?? null;
  return null;
}

export function numberValue(prop: Property | undefined): number | null {
  if (prop?.type === "number") return prop.number ?? null;
  return null;
}

export function relationCount(prop: Property | undefined): number {
  if (prop?.type === "relation") return prop.relation.length;
  return 0;
}
