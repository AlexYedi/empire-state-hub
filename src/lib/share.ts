// X share intent (E-06 item 1): a plain intent link — no SDK, no widget, no tracking
// script (spec "Must not"). The prefill is deliberately only the page title; no
// drafted copy from the pipeline's X content contract (E-05) is ever surfaced here,
// so flagged draft copy can never be presented as approved.
export function xShareUrl({ title, url }: { title: string; url: string }): string {
  const params = new URLSearchParams({ text: title, url });
  return `https://x.com/intent/post?${params.toString()}`;
}
