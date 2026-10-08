#!/usr/bin/env node
// gen-rooms.mjs — build src/data/rooms.json (+ public/rooms/** carousel PDFs) for the public /rooms
// archive. Facts come from Notion (Events · People · Companies · Topics · Content Drafts) through an
// ALLOWLIST; judgement (slug, series, `what`, publish) comes from src/data/rooms.curated.json.
// Spec: pipeline repo .claude/.state/rooms/SPEC.md §2 (the public-safe column is the contract) + §4.
//
// Run:  pnpm gen:rooms                       (node --env-file=.env.local; PIPELINE_DIR overrides the sibling default)
//       pnpm gen:rooms --dry-run             counts only — writes nothing
//       pnpm gen:rooms --overlay <file>      use another overlay (e.g. a scratch one for a dry run)
//
// What leaves Notion, and nothing else:
//   room      name · date · location · status (Events row). NEVER Event Description / Calendar ID.
//             Location is reduced to "Venue, City" (no street number, floor/suite, ZIP or access note);
//             an overlay `location` wins.
//   speakers  People on the event with Role Context ∩ {speaker, host, organizer}: name · title ·
//             company · LinkedIn URL. Empty Role Context = dropped + reported (fail closed). Overlay
//             `speaker_overrides` may null title/company/linkedin, never set them.
//   companies ONLY the exported speakers' companies — never the Event's Companies relation.
//   URLs      linkedin.com URLs lose their query string + fragment (tracking params).
//   takeaways OPT-IN per room (overlay `takeaways: true`). post_event_brief sections Quick Take · The Thesis · first 5 Insights · Tools Mentioned.
//             Quote Bank / Hot Takes / Anecdotes / Speaker Map / People & Outreach / Open Loops are
//             never read into the output. Quote blocks and quote-led lines are dropped.
//   posts     Content Drafts of type linkedin_post_{post,pre,synthesis} with Content Status =
//             published AND a Published URL. Per post: its carousel (an `Event Content/<dir>/*.pdf`, or a
//             legacy `content-drafts/<dir>/*.pdf` resolved through the pipeline's content-drafts-moves.json,
//             that the draft names, copied from the pipeline's COMMITTED tree) and its `## First comment`
//             lines that carry a public URL, with editor notes / unpublished-variant lines stripped.
// Every exported line is also checked against the off-the-record phrase list and dropped on a hit.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HUB = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------- the contract ----------
export const PUBLIC_ROLES = ["speaker", "host", "organizer"];
export const POST_KINDS = {
  linkedin_post_pre: "preview",
  linkedin_post_post: "recap",
  linkedin_post_synthesis: "synthesis",
};
export const OFF_RECORD = /off[- ]the[- ]record|stays in the room|don['’]t post|not public|confidential/i;
// A brief that states a no-record room norm anywhere (even outside the exported sections) exports
// NO takeaways for that room — the posts Alex chose to publish still show (fail closed, room level).
export const ROOM_NORM = /off[- ]the[- ]record|nothing is recorded|chatham house/i;
// Takeaway lines are internal brief prose: drop any line that reads as a working note rather than a
// public summary — confidence tags, timestamps, the author's own name/voice, recording references,
// money figures, brief cross-references.
const INTERNAL_LINE =
  /^\s*(?:HIGH|MED|LOW)\b|\(\s*(?:HIGH|MED|LOW)\b|~?\b\d{1,3}:\d{2}\b|\bAlex\b|\byour (?:exact|own)\b|\b(?:pre|post)-event brief\b|\bshipped as\b|\bpinned\b|\bsynthesis candidate\b|\bdocumentarian\b|\brecord(?:ed|ing)\b|\btranscri(?:pt|bed)\b|\bdon['’]t publish\b|\bunsourced\b|\$\s?\d/i;
/** Quoted speech: a double- or single-quoted span of 3+ words. Short scare-quoted terms pass. */
export function hasQuotedSpeech(s) {
  const spans = [
    ...s.matchAll(/["“]([^"“”]+)["”]/g),
    ...s.matchAll(/(?:^|[\s(—–-])['‘]([^'’]+?)['’](?=[\s.,;:)!?—–-]|$)/g),
  ];
  return spans.some((m) => m[1].trim().split(/\s+/).length >= 3);
}
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
// Hosts that are workspace-private or internal tooling — never a "source" for a public reader.
const PRIVATE_HOST =
  /(^|\.)(notion\.so|notion\.site|linear\.app|docs\.google\.com|drive\.google\.com|calendar\.google\.com|mail\.google\.com|gamma\.app|localhost|127\.0\.0\.1|supabase\.co|hubspot\.com|app\.granola\.ai|supercut\.ai)$/i;
const SLUG = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TAKEAWAY_SECTIONS = [
  { key: "quickTake", match: /^quick take\b/, max: 6 },
  { key: "thesis", match: /^the thesis\b/, max: 6 },
  { key: "insights", match: /^(?:substantive |ranked )?insights\b/, max: 5 },
  { key: "tools", match: /^tools(?: \/ companies)? mentioned\b/, max: 20 },
];

// ---------- small helpers ----------
export const normId = (id) => String(id).replace(/-/g, "").toLowerCase();
export const kebab = (s) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const collapse = (s) => s.replace(/\s+/g, " ").replace(/\s+([.,;:!?])(?=\s|$)/g, "$1").trim();
const rt = (arr = [], withLinks = false) =>
  arr
    .map((t) => {
      const text = t.plain_text ?? "";
      const href = t.href ?? t.text?.link?.url ?? null;
      if (!withLinks || !href) return text;
      // "clay.com/blog" linked to http://clay.com/blog already shows the link — don't append it twice
      // (the host-less text becomes the href itself, so the line still carries a real URL)
      if (text.includes(href)) return text;
      const bare = href.replace(/^https?:\/\/(?:www\.)?/i, "").replace(/\/+$/, "");
      if ((text.match(/https?:\/\/\S+/g) ?? []).some((u) => u.includes(bare))) return text;
      const i = bare ? text.toLowerCase().indexOf(bare.toLowerCase()) : -1;
      if (i < 0) return `${text} (${href})`;
      const start = text.slice(0, i).match(/(?:www\.)?$/i)[0].length;
      return text.slice(0, i - start) + href + text.slice(i + bare.length).replace(/^\/+/, "");
    })
    .join("");
const titleOf = (page) => {
  for (const p of Object.values(page?.properties ?? {})) if (p.type === "title") return collapse(rt(p.title));
  return "";
};
const prop = (page, name) => page?.properties?.[name];
const selectName = (p) => (p?.type === "select" ? (p.select?.name ?? null) : null);
const relationIds = (p) => (p?.type === "relation" ? [...new Set(p.relation.map((r) => normId(r.id)))] : []);
const richText = (p) => (p?.type === "rich_text" ? collapse(rt(p.rich_text)) : "");
const dateStart = (p) => (p?.type === "date" ? (p.date?.start ?? null) : null);
const urlValue = (p) => (p?.type === "url" ? (p.url ?? null) : null);
const multiNames = (p) => (p?.type === "multi_select" ? p.multi_select.map((o) => o.name) : []);
const blockText = (b, withLinks = false) => rt(b?.[b.type]?.rich_text ?? [], withLinks);
const isHeading = (b) => /^heading_[123]$/.test(b?.type ?? "");
const normHeading = (s) => collapse(s.replace(/^[^A-Za-z]+/, "")).toLowerCase();
const isQuoteLed = (s) => /^\s*["“”‘'«]/.test(s);

/** Split a block list into heading-delimited sections. ANY heading ends a section (fail closed:
 *  a sub-heading like "Quote Bank" nested under an allowed section never leaks into it). */
async function sections(blocks, source) {
  const out = [];
  let cur = null;
  for (const b of blocks) {
    if (isHeading(b)) {
      cur = { heading: normHeading(blockText(b)), blocks: [] };
      out.push(cur);
      // toggleable headings keep their body as children
      if (b.has_children) cur.blocks.push(...(await source.getBlocks(b.id)));
    } else if (cur) cur.blocks.push(b);
  }
  return out;
}

const PROSE_TYPES = new Set(["paragraph", "bulleted_list_item", "numbered_list_item"]);
const LIST_TYPES = new Set(["bulleted_list_item", "numbered_list_item"]);

/** A takeaway line passes when it is prose, not a quotation, and trips no phrase / contact check. */
function cleanTakeaway(s, report) {
  const t = collapse(stripEditorNotes(s));
  if (!t || isQuoteLed(t)) return null;
  if (INTERNAL_LINE.test(t) || hasQuotedSpeech(t)) {
    report.noteDrops = (report.noteDrops ?? 0) + 1;
    return null;
  }
  if (OFF_RECORD.test(t) || EMAIL.test(t)) {
    report.phraseDrops++;
    return null;
  }
  return t;
}

export async function extractTakeaways(blocks, source, report) {
  const secs = await sections(blocks, source);
  const allText = [...blocks, ...secs.flatMap((s) => s.blocks)].map((b) => blockText(b)).join("\n");
  if (ROOM_NORM.test(allText)) {
    report.normHeld = (report.normHeld ?? 0) + 1;
    return null;
  }
  const out = { quickTake: [], thesis: [], insights: [], tools: [] };
  for (const { key, match, max } of TAKEAWAY_SECTIONS) {
    const sec = secs.find((s) => match.test(s.heading));
    if (!sec) continue;
    const prose = sec.blocks.filter((b) => PROSE_TYPES.has(b.type));
    // Insights / tools are lists; prefer list items when present (skips the section's intro line).
    const pool = key === "insights" || key === "tools" ? prose.filter((b) => LIST_TYPES.has(b.type)) : prose;
    const src = pool.length ? pool : prose;
    for (const b of src) {
      if (out[key].length >= max) break;
      const t = cleanTakeaway(blockText(b), report);
      if (t) out[key].push(t);
    }
  }
  const any = Object.values(out).some((v) => v.length);
  return any ? out : null;
}

// ---------- URLs ----------
/** LinkedIn share links carry tracking params (?utm_…&rcm=…, which can identify the sharer): strip the
 *  query string and fragment from any linkedin.com URL. Other hosts pass through unchanged. */
export function cleanUrl(u) {
  if (!u) return u;
  try {
    const x = new URL(u);
    if (!/(^|\.)linkedin\.com$/i.test(x.hostname) && !/(^|\.)lnkd\.in$/i.test(x.hostname)) return u;
    x.search = "";
    x.hash = "";
    return x.toString();
  } catch {
    return u;
  }
}

// ---------- location (venue + city only; never a street address or access note) ----------
const STREET =
  /\b(?:st|street|ave|avenue|blvd|boulevard|broadway|pl|place|rd|road|ln|lane|dr|drive|way|plaza|sq|square|pkwy|parkway|hwy|ter|terrace)\b\.?/i;
const FLOOR = /\b(?:floor|fl|suite|ste|unit|room|rm)\b|\b\d+(?:st|nd|rd|th)\s+fl/i;
const ACCESS_NOTE = /address|invite|approval|rsvp|application|accepted|guests|bring|\bid\b|required|released|luma|https?:|\.com\b/i;
const CITY = { nyc: "New York", "new york": "New York", "new york city": "New York", brooklyn: "Brooklyn", queens: "Queens", manhattan: "New York" };
const STATE_ZIP = /^(?:NY|New York State)?\s*\d{5}(?:-\d{4})?$|^NY$/i;
/** True when a string still looks like a street address (house number + street word, or a ZIP). */
export function looksLikeAddress(s) {
  if (!s) return false;
  return (
    /\b\d{5}(?:-\d{4})?\b/.test(s) ||
    /\b\d+[A-Za-z]?\s+(?:[NSEW]\.?\s+|North\s+|South\s+|East\s+|West\s+)?[\w'.-]+(?:\s+[\w'.-]+){0,3}\s+(?:st|street|ave|avenue|blvd|broadway|pl|place|rd|road|ln|lane|dr|drive|way|plaza)\b/i.test(s) ||
    /(?:^|,\s*)\d+\s+\S/.test(s.trim())
  );
}
/** Reduce a Notion Location to "Venue, City": drop street numbers, suite/floor, ZIPs and every access
 *  note ("address released to…", "invite-only", RSVP/ID instructions, URLs). Fail closed: a part that
 *  still looks like an address is dropped. */
export function publicLocation(raw) {
  if (!raw) return null;
  let s = raw.split(/\s+[—–]\s+/)[0]; // " — invite-only, address released to…" and similar trailing notes
  s = s.replace(/https?:\/\/\S+/g, "");
  const parens = [];
  s = s.replace(/\s*\(([^()]*)\)/g, (_, inner) => {
    parens.push(inner.trim());
    return "";
  });
  const venue = [];
  let city = null;
  for (let part of s.split(/\s*[,/]\s*/)) {
    part = collapse(part);
    if (!part) continue;
    const c = CITY[part.toLowerCase()];
    if (c) {
      city ??= c;
      continue;
    }
    if (STATE_ZIP.test(part) || /^\d/.test(part) || STREET.test(part) || FLOOR.test(part) || ACCESS_NOTE.test(part) || looksLikeAddress(part)) continue;
    if (!venue.includes(part)) venue.push(part);
  }
  // a parenthetical names the venue only when nothing else did ("111 W 19th St, New York (Clay HQ)")
  if (!venue.length)
    for (const p of parens)
      if (p && !/^\d/.test(p) && !STREET.test(p) && !FLOOR.test(p) && !ACCESS_NOTE.test(p) && !looksLikeAddress(p) && !/^(?:online|virtual)$/i.test(p)) {
        venue.push(p);
        break;
      }
  const out = [...venue, city].filter(Boolean).join(", ");
  return out || null;
}

// ---------- speaker fields (People rows carry research notes inline) ----------
const TITLE_NOTE =
  /\b(?:confirm(?:ed)?|unconfirmed|unverified|verify|inferred|TBC|TBD|event page|invite listed|sources inconsistent|reported as|Alex)\b/i;
const TITLE_JUDGMENT = /per public records|personal brand/i;
/** Strip parenthetical / em-dash research notes from a title; null when a note is a judgment about the
 *  person or anything note-like survives the strip (fail closed). */
export function cleanTitle(raw) {
  if (!raw || TITLE_JUDGMENT.test(raw)) return null;
  let t = raw.replace(/\s*\(([^()]*)\)/g, (m, inner) => (TITLE_NOTE.test(inner) ? "" : m));
  t = t
    .split(/\s+—\s+/)
    .filter((seg, i) => i === 0 || !TITLE_NOTE.test(seg))
    .join(" — ");
  t = collapse(t);
  return !t || TITLE_NOTE.test(t) ? null : t;
}
/** A public speaker needs a full name: placeholders ("Michael (Datadog) — last name TBC", a first name
 *  plus a company in parentheses) are dropped. */
export function publicName(raw) {
  if (!raw || /\b(?:TBC|TBD|unknown)\b|—/i.test(raw)) return null;
  const bare = collapse(raw.replace(/\([^()]*\)/g, ""));
  return bare.split(" ").length >= 2 ? raw : null;
}

// ---------- first comment ----------
/** Remove editor notes: markdown links become "text (url)"; any other [bracketed] segment goes. */
export function stripEditorNotes(s) {
  return s
    .replace(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\((?:variant\s+[A-Z]\s+only|verify[^)]*|tbd|todo)\)/gi, "");
}

const VARIANT_ONLY = /(?:\[|\()\s*variant\s+([A-Z])\s+only\s*(?:\]|\))|^\s*variant\s+([A-Z])\s+only\b/i;
const URL_RE = /https?:\/\/[^\s<>)\]]+/g;

export function publishedVariant(texts) {
  const pats = [
    /PUBLISHED[^\]\n]{0,30}?\bVar(?:iant)?\.?\s*([A-Z])\b/i,
    /(?:SHIPPED|PUBLISHED|POSTED)[^.\n]{0,40}?\bVariant\s+([A-Z])\b/i,
    /\bVariant\s+([A-Z])\b[^.\n]{0,40}?\b(?:posted|went live|shipped|published)\b/i,
  ];
  for (const t of texts) for (const p of pats) {
    const m = t.match(p);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

/** Keep only lines that carry a public URL; drop editor notes, lines for an unpublished (or unknown)
 *  variant, private links, and anything tripping the phrase / contact check. Returns null if empty. */
export function cleanFirstComment(rawLines, variant, report) {
  // A code block often puts the label on one line and the bare URL on the next: rejoin them.
  const joined = [];
  for (const l of rawLines.map((x) => x.trim()).filter(Boolean)) {
    const prev = joined[joined.length - 1];
    if (/^https?:\/\/\S+$/.test(l) && prev && !/https?:\/\//.test(prev) && !VARIANT_ONLY.test(prev)) joined[joined.length - 1] = `${prev} ${l}`;
    else joined.push(l);
  }
  const out = [];
  for (let line of joined) {
    if (/^\(/.test(line)) continue; // "(Add: …)" — a parenthetical note to the editor, not copy
    if (/\bAlex['’]s\b|\boptional\b|\bswap\b|\bonce posted\b/i.test(line)) continue; // editor notes in third person
    const vm = line.match(VARIANT_ONLY);
    if (vm) {
      const v = (vm[1] || vm[2]).toUpperCase();
      if (!variant || v !== variant) continue; // fail closed when we can't tell which variant shipped
    }
    line = stripEditorNotes(line);
    const urls = (line.match(URL_RE) ?? []).map((u) => u.replace(/[.,;:!?'"’”]+$/, ""));
    let pub = 0;
    for (const u of urls) {
      let host = "";
      try {
        host = new URL(u).hostname;
      } catch {
        host = "";
      }
      if (!host || PRIVATE_HOST.test(host)) line = line.split(u).join("");
      else {
        const c = cleanUrl(u);
        if (c !== u) line = line.split(u).join(c);
        pub++;
      }
    }
    line = collapse(line.replace(/\(\s*\)/g, "").replace(/^[\s>*•\-–—→:]+/, ""));
    if (!pub || !line) continue;
    if (OFF_RECORD.test(line) || EMAIL.test(line)) {
      report.phraseDrops++;
      continue;
    }
    out.push(line);
  }
  return out.length ? out : null;
}

async function firstCommentLines(blocks, source) {
  const secs = await sections(blocks, source);
  const sec = secs.find((s) => /first comment/.test(s.heading) && !/tier\s*1/.test(s.heading));
  if (!sec) return null;
  const lines = [];
  for (const b of sec.blocks) {
    if (b.type === "code") lines.push(...blockText(b, true).split("\n"));
    else if (PROSE_TYPES.has(b.type) || b.type === "quote") lines.push(...blockText(b, true).split("\n"));
  }
  return lines;
}

// ---------- carousel (committed pipeline files only) ----------
// Two ref shapes. Legacy `content-drafts/<dir>/<file>.pdf` (what older Notion drafts name) keeps its public
// path /rooms/<dir>/<file> so published links stay stable; the file itself is found through MOVES (the
// pipeline moved content-drafts/ into Event Content/ on 2026-10-08). Current `Event Content/<dir…>/<file>.pdf`
// refs publish under a kebab-cased path (the folder names carry spaces, '#', commas).
const LEGACY_REF = /content-drafts\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+\.pdf)/g;
const EVENT_REF = /Event Content\/((?:(?:(?!\.pdf)[^/`\n"<>])+\/)+)([^/`\n"<>]+?\.pdf)/g;
export const MOVES_FILE = "Event Content/content-drafts-moves.json";

const urlSeg = (s) => s.replace(/\.pdf$/i, "").replace(/\.png$/i, "").split(/[^A-Za-z0-9]+/).filter(Boolean).join("-").toLowerCase();

/** pipeline ref -> { src: committed path, rel: public path under /rooms/ } (no existence check) */
function resolveRef(ref, moves) {
  if (ref.startsWith("content-drafts/")) return { src: moves.get(ref) ?? ref, rel: ref.slice("content-drafts/".length) };
  if (ref.startsWith("Event Content/")) {
    const segs = ref.slice("Event Content/".length).split("/");
    const file = segs.pop();
    return { src: ref, rel: [...segs.map(urlSeg), urlSeg(file) + ".pdf"].join("/") };
  }
  return null;
}

export function carouselFor(ref, committed, moves = new Map()) {
  const r = ref ? resolveRef(ref, moves) : null;
  if (!r || !committed.has(r.src)) return null;
  const dir = r.src.split("/").slice(0, -1).join("/");
  const relDir = r.rel.split("/").slice(0, -1).join("/");
  const preview = [...committed]
    .filter((f) => f.startsWith(dir + "/") && /\/(?:preview-[^/]*|carousel-preview)\.png$/.test(f))
    .sort()[0];
  const previewRel = preview ? relDir + "/" + urlSeg(preview.split("/").pop()) + ".png" : null;
  return {
    pdf: "/rooms/" + r.rel,
    preview: previewRel ? "/rooms/" + previewRel : null,
    _assets: [[r.src, r.rel], ...(preview ? [[preview, previewRel]] : [])],
  };
}

export function carouselFromText(texts, committed, moves = new Map()) {
  for (const t of texts) {
    const refs = [
      ...[...t.matchAll(LEGACY_REF)].map((m) => ({ at: m.index, ref: `content-drafts/${m[1]}/${m[2]}` })),
      ...[...t.matchAll(EVENT_REF)].map((m) => ({ at: m.index, ref: `Event Content/${m[1]}${m[2]}` })),
    ].sort((a, b) => a.at - b.at);
    for (const { ref } of refs) {
      const c = carouselFor(ref, committed, moves);
      if (c) return c;
    }
  }
  return null;
}

// ---------- overlay ----------
const SPEAKER_OVERRIDABLE = ["title", "company", "linkedin"];
export function validateOverlay(overlay) {
  if (!Array.isArray(overlay)) throw new Error("rooms.curated.json must be a JSON array");
  const seen = new Set();
  for (const r of overlay) {
    if (!r || typeof r.slug !== "string" || !SLUG.test(r.slug)) throw new Error(`overlay: bad slug ${JSON.stringify(r?.slug)}`);
    if (seen.has(r.slug)) throw new Error(`overlay: duplicate slug ${r.slug}`);
    seen.add(r.slug);
    if (r.location !== undefined && (typeof r.location !== "string" || !r.location.trim() || looksLikeAddress(r.location)))
      throw new Error(`overlay: ${r.slug} location must be "Venue, City" — never a street address`);
    if (r.speaker_overrides !== undefined) {
      const so = r.speaker_overrides;
      if (!so || typeof so !== "object" || Array.isArray(so)) throw new Error(`overlay: ${r.slug} speaker_overrides must be an object`);
      for (const [name, o] of Object.entries(so)) {
        if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error(`overlay: ${r.slug} speaker_overrides["${name}"] must be an object`);
        for (const [k, v] of Object.entries(o))
          // the overlay may REMOVE a published fact, never add or change one
          if (!SPEAKER_OVERRIDABLE.includes(k) || v !== null)
            throw new Error(`overlay: ${r.slug} speaker_overrides["${name}"].${k} — only null for ${SPEAKER_OVERRIDABLE.join("/")} is allowed`);
      }
    }
  }
  return overlay;
}

/** slug → event page. `notion_page_id` wins (renames, or a legacy event page living in Content
 *  Drafts); otherwise the one Events row on the slug's date, tie-broken by kebab(name). */
function resolveEvent(entry, events) {
  if (entry.notion_page_id) return { id: normId(entry.notion_page_id), via: "notion_page_id" };
  const date = entry.slug.slice(0, 10);
  const rest = entry.slug.slice(11);
  const onDate = events.filter((e) => (dateStart(prop(e, "Event Date")) ?? "").slice(0, 10) === date);
  // best token overlap between the slug's name part and each same-day event name
  const want = rest.split("-");
  const scored = onDate
    .map((e) => {
      const have = new Set(kebab(titleOf(e)).split("-"));
      return { e, score: want.filter((w) => have.has(w)).length / want.length };
    })
    .sort((a, b) => b.score - a.score);
  const [best, next] = scored;
  if (best && best.score >= 0.5 && (!next || best.score > next.score)) return { id: normId(best.e.id), via: "slug" };
  if (onDate.length === 1) return { id: normId(onDate[0].id), via: "date" };
  return { id: null, via: onDate.length ? `ambiguous (${onDate.length} events on ${date})` : `no event on ${date}` };
}

// ---------- the build ----------
/**
 * @param {object} o
 * @param {object[]} o.overlay   validated curated entries
 * @param {object}   o.source    { listEvents(), listDrafts(), getPage(id), getBlocks(id) }
 * @param {Set<string>} o.committed  pipeline paths tracked in git (Event Content/** + legacy content-drafts/**)
 * @param {Map<string,string>} [o.moves] legacy content-drafts path -> its Event Content path
 * @param {string}   o.now       ISO timestamp for generated_at
 */
export async function buildRooms({ overlay, source, committed, moves = new Map(), now }) {
  const report = { rooms: [], unresolved: [], held: [], phraseDrops: 0 };
  const assets = new Map(); // pipeline path -> public path
  const events = await source.listEvents();
  const drafts = await source.listDrafts();
  const pageCache = new Map();
  const page = async (id) => {
    const k = normId(id);
    if (!pageCache.has(k)) pageCache.set(k, await source.getPage(k));
    return pageCache.get(k);
  };

  const rooms = [];
  for (const entry of overlay) {
    if (entry.publish === false) {
      report.held.push(entry.slug);
      continue;
    }
    const { id: eventId, via } = resolveEvent(entry, events);
    if (!eventId) {
      report.unresolved.push(`${entry.slug} — ${via}`);
      continue;
    }
    const ev = await page(eventId);
    if (!ev) {
      report.unresolved.push(`${entry.slug} — page ${eventId} not readable`);
      continue;
    }
    const r = { slug: entry.slug, people: 0, noRole: 0, speakers: 0, posts: 0, firstComments: 0, carousels: 0, brief: false };

    // speakers — allowlisted roles only; never an email/phone accessor
    const speakers = [];
    for (const pid of relationIds(prop(ev, "People"))) {
      const p = await page(pid);
      if (!p) continue;
      r.people++;
      const roles = multiNames(prop(p, "Role Context"));
      if (!roles.length) {
        r.noRole++;
        continue;
      }
      const pubRoles = PUBLIC_ROLES.filter((x) => roles.includes(x));
      if (!pubRoles.length) continue;
      const name = publicName(titleOf(p));
      if (!name) {
        report.nameDrops = (report.nameDrops ?? 0) + 1;
        continue;
      }
      const companyId = relationIds(prop(p, "Company"))[0];
      const li = urlValue(prop(p, "LinkedIn URL"));
      speakers.push({
        name,
        title: cleanTitle(richText(prop(p, "Current Title"))),
        company: companyId ? titleOf(await page(companyId)) || null : null,
        linkedin: li && /^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(li) ? cleanUrl(li) : null,
        roles: pubRoles,
      });
    }
    // overlay speaker_overrides can only null a field (validated) — e.g. an unresolved employer
    const overrides = entry.speaker_overrides ?? {};
    for (const [name, o] of Object.entries(overrides)) {
      const s = speakers.find((x) => x.name === name);
      if (!s) {
        (report.overrideMisses ??= []).push(`${entry.slug} — ${name}`);
        continue;
      }
      for (const k of Object.keys(o)) s[k] = null;
    }
    speakers.sort((a, b) => PUBLIC_ROLES.indexOf(a.roles[0]) - PUBLIC_ROLES.indexOf(b.roles[0]) || a.name.localeCompare(b.name));
    r.speakers = speakers.length;

    const titles = async (ids) => {
      const out = [];
      for (const id of ids) {
        const t = titleOf(await page(id));
        if (t) out.push(t);
      }
      return [...new Set(out)].sort((a, b) => a.localeCompare(b));
    };
    const topics = await titles(relationIds(prop(ev, "Topics")));
    // Companies come ONLY from the exported speakers/hosts/organizers. The Event's own Companies relation
    // is never read: it also holds attendee employers and companies merely mentioned in the room.
    const companies = [...new Set(speakers.map((s) => s.company).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    // takeaways — newest post_event_brief on this event
    const onEvent = (d) => relationIds(prop(d, "Event")).includes(eventId);
    const brief = drafts
      .filter((d) => selectName(prop(d, "Content Type")) === "post_event_brief" && onEvent(d))
      .sort((a, b) => (b.last_edited_time ?? "").localeCompare(a.last_edited_time ?? ""))[0];
    // Briefs are private working documents (analyst notes, content strategy, job-search leads), so
    // takeaways are OPT-IN per room: `takeaways: true` in the overlay, set only after a human has read
    // that room's exported lines. Default = none leave Notion (fail closed).
    let takeaways = null;
    if (brief) {
      r.brief = true;
      if (entry.takeaways === true) takeaways = await extractTakeaways(await source.getBlocks(brief.id), source, report);
      else report.takeawaysOff = (report.takeawaysOff ?? 0) + 1;
    }

    // posts — published + URL, on the event or named in the overlay
    const extra = new Set((entry.extra_post_ids ?? []).map(normId));
    const candidates = drafts.filter((d) => onEvent(d) || extra.has(normId(d.id)));
    for (const id of extra) if (!candidates.some((d) => normId(d.id) === id)) {
      const d = await page(id);
      if (d) candidates.push(d);
    }
    const posts = [];
    for (const d of candidates) {
      const kind = POST_KINDS[selectName(prop(d, "Content Type"))];
      const url = cleanUrl(urlValue(prop(d, "Published URL")));
      if (!kind || selectName(prop(d, "Content Status")) !== "published" || !url || !/^https:\/\//.test(url)) continue;
      const blocks = await source.getBlocks(d.id);
      const texts = [titleOf(d), ...blocks.map((b) => blockText(b, true))];
      const raw = await firstCommentLines(blocks, source);
      const firstComment = raw ? cleanFirstComment(raw, publishedVariant(texts), report) : null;
      const carousel = carouselFromText(texts, committed, moves);
      if (firstComment) r.firstComments++;
      if (carousel) {
        r.carousels++;
        for (const [s, rel] of carousel._assets) assets.set(s, rel);
      }
      posts.push({
        kind,
        url,
        roundup: relationIds(prop(d, "Event")).length > 1,
        firstComment,
        carousel: carousel ? { pdf: carousel.pdf, preview: carousel.preview } : null,
      });
    }
    const order = Object.values(POST_KINDS);
    posts.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || Number(a.roundup) - Number(b.roundup) || a.url.localeCompare(b.url));
    r.posts = posts.length;

    // Carousels normally attach through a published post (above). The overlay `carousel` is only for a
    // carousel already posted publicly whose post can't be linked — never an unconfirmed one.
    let roomCarousel = null;
    if (entry.carousel) {
      const c = carouselFor(entry.carousel, committed, moves);
      if (c) {
        roomCarousel = { pdf: c.pdf, preview: c.preview };
        for (const [s, rel] of c._assets) assets.set(s, rel);
      } else r.carouselMissing = entry.carousel;
    }

    const date = dateStart(prop(ev, "Event Date"));
    rooms.push({
      slug: entry.slug,
      name: entry.name || titleOf(ev),
      date: date ? date.slice(0, 10) : entry.slug.slice(0, 10),
      location: entry.location ?? publicLocation(richText(prop(ev, "Location"))),
      status: selectName(prop(ev, "Event Status")),
      series: entry.series ?? null,
      what: entry.what ?? null,
      recapPending: !takeaways && !posts.some((p) => p.kind === "recap" && !p.roundup),
      speakers,
      topics,
      companies,
      takeaways,
      carousel: roomCarousel,
      posts,
    });
    r.via = via;
    report.rooms.push(r);
  }
  rooms.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  return { data: { generated_at: now, rooms }, report, assets };
}

/** The same checks verify-public-safe runs, applied before anything is written. */
export function safetyScan(json) {
  const s = typeof json === "string" ? json : JSON.stringify(json);
  const data = typeof json === "string" ? JSON.parse(json) : json;
  return {
    phrases: (s.match(new RegExp(OFF_RECORD.source, "gi")) ?? []).length,
    emails: (s.match(new RegExp(EMAIL.source, "g")) ?? []).length,
    addresses: (data.rooms ?? []).filter((r) => looksLikeAddress(r.location)).length,
    trackedLinks: (s.match(/https?:\/\/[a-z.]*linkedin\.com\/[^\s"]*[?#]/gi) ?? []).length,
  };
}

// ---------- Notion source (the only place the token is used) ----------
async function notionSource() {
  const { Client } = await import("@notionhq/client");
  const notion = new Client({ auth: process.env.NOTION_TOKEN, logLevel: "error" });
  // Notion allows ~3 req/s; pace calls so a full export never leans on the client's retry budget.
  let last = 0;
  const call = async (fn) => {
    const wait = last + 350 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    return fn();
  };
  const need = (k) => {
    if (!process.env[k]) throw new Error(`${k} is not set (run with --env-file=.env.local)`);
    return process.env[k];
  };
  const dsId = async (db) => (await call(() => notion.databases.retrieve({ database_id: db }))).data_sources[0].id;
  const queryAll = async (db, filter) => {
    const data_source_id = await dsId(db);
    const rows = [];
    let cursor;
    do {
      const res = await call(() => notion.dataSources.query({ data_source_id, filter, start_cursor: cursor, page_size: 100 }));
      rows.push(...res.results.filter((x) => x.object === "page" && x.properties));
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
    return rows;
  };
  return {
    listEvents: () => queryAll(need("NOTION_DB_EVENTS")),
    listDrafts: () =>
      queryAll(need("NOTION_DB_CONTENT_DRAFTS"), {
        or: [
          { property: "Content Status", select: { equals: "published" } },
          { property: "Content Type", select: { equals: "post_event_brief" } },
        ],
      }),
    getPage: async (id) => {
      try {
        return await call(() => notion.pages.retrieve({ page_id: id }));
      } catch (e) {
        // only a missing / unshared page is "absent"; anything else (rate limit, auth) must fail the run
        if (e?.code === "object_not_found") return null;
        throw e;
      }
    },
    getBlocks: async (id) => {
      const out = [];
      let cursor;
      do {
        const res = await call(() => notion.blocks.children.list({ block_id: id, start_cursor: cursor, page_size: 100 }));
        out.push(...res.results);
        cursor = res.has_more ? res.next_cursor : undefined;
      } while (cursor);
      return out;
    },
  };
}

/** legacy content-drafts path -> Event Content path, from the pipeline's committed move map */
export function committedMoves(pipelineDir) {
  try {
    const out = execFileSync("git", ["-C", pipelineDir, "show", `HEAD:${MOVES_FILE}`], { encoding: "utf8" });
    return new Map(Object.entries(JSON.parse(out)));
  } catch {
    return new Map();
  }
}

export function committedFiles(pipelineDir) {
  try {
    const out = execFileSync("git", ["-C", pipelineDir, "ls-files", "-z", "Event Content", "content-drafts"], { encoding: "utf8" });
    return new Set(out.split("\0").filter(Boolean));
  } catch {
    console.warn(`! pipeline repo not readable at ${pipelineDir} — no carousels will match`);
    return new Set();
  }
}

// ---------- CLI ----------
async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const flag = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
  const PIPELINE_DIR = process.env.PIPELINE_DIR || join(HUB, "..", "Empire_State_Events_Pipeline_Take_3");
  const overlayPath = flag("--overlay") || join(HUB, "src", "data", "rooms.curated.json");
  const outPath = flag("--out") || join(HUB, "src", "data", "rooms.json");
  const publicDir = join(HUB, "public", "rooms");

  const overlay = validateOverlay(JSON.parse(readFileSync(overlayPath, "utf8")));
  const committed = committedFiles(PIPELINE_DIR);
  const moves = committedMoves(PIPELINE_DIR);
  const { data, report, assets } = await buildRooms({
    overlay,
    source: await notionSource(),
    committed,
    moves,
    now: new Date().toISOString(),
  });

  console.log(`rooms: ${data.rooms.length} built · ${report.held.length} held (publish:false) · ${report.unresolved.length} unresolved`);
  console.log("slug".padEnd(58) + "via       people noRole spk posts 1stC car brief");
  for (const r of report.rooms)
    console.log(
      r.slug.padEnd(58) +
        String(r.via).padEnd(10) +
        [r.people, r.noRole, r.speakers, r.posts, r.firstComments, r.carousels].map((n) => String(n).padStart(5)).join("") +
        (r.brief ? "   yes" : "   —") +
        (r.carouselMissing ? `  (overlay carousel not committed: ${r.carouselMissing})` : ""),
    );
  for (const u of report.unresolved) console.log(`  ✗ unresolved: ${u}`);
  const gaps = report.rooms.filter((r) => r.noRole > 0);
  const t = (k) => report.rooms.reduce((n, r) => n + r[k], 0);
  console.log(
    `totals: speakers ${t("speakers")} · posts ${t("posts")} · first comments ${t("firstComments")} · carousels ${t("carousels")} · briefs ${report.rooms.filter((r) => r.brief).length} · assets ${assets.size}`,
  );
  console.log(`Role Context gaps: ${gaps.length} room(s), ${t("noRole")} linked people with no Role Context (dropped, fail closed)`);
  console.log(`phrase/contact lines dropped: ${report.phraseDrops} · working-note/quote takeaway lines dropped: ${report.noteDrops ?? 0} · rooms with takeaways held by a no-record room norm: ${report.normHeld ?? 0} · briefs not opted in (takeaways: true): ${report.takeawaysOff ?? 0} · placeholder-name speakers dropped: ${report.nameDrops ?? 0}`);
  const scan = safetyScan(data);
  console.log(
    `output scan: ${scan.phrases} off-the-record phrase hit(s) · ${scan.emails} email literal(s) · ${scan.addresses} address-like location(s) · ${scan.trackedLinks} linkedin URL(s) with a query/fragment`,
  );
  for (const m of report.overrideMisses ?? []) console.log(`  ! speaker_overrides name not among exported speakers: ${m}`);
  // eyeball aid: the same person across rooms (spot a wrong merge or a stale title)
  const seenIn = new Map();
  for (const room of data.rooms) for (const sp of room.speakers) seenIn.set(sp.name, [...(seenIn.get(sp.name) ?? []), room.slug]);
  const multi = [...seenIn].filter(([, slugs]) => slugs.length > 1).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  console.log(`speakers in more than one room: ${multi.length}`);
  for (const [name, slugs] of multi) console.log(`  ${name} → ${slugs.join(", ")}`);

  if (dry) {
    console.log("dry run — nothing written");
    return;
  }
  if (scan.phrases || scan.emails || scan.addresses || scan.trackedLinks) {
    console.error("✗ output failed the safety scan — nothing written");
    process.exit(1);
  }
  writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n");
  rmSync(publicDir, { recursive: true, force: true });
  for (const [src, rel] of assets) {
    const dest = join(publicDir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    // the committed blob, not the working tree — only what is already public in the pipeline repo
    writeFileSync(dest, execFileSync("git", ["-C", PIPELINE_DIR, "show", `HEAD:${src}`]));
  }
  console.log(`wrote ${outPath.replace(HUB + "/", "")} + ${assets.size} file(s) under public/rooms/`);
  if (!existsSync(outPath)) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => {
    console.error(`✗ gen-rooms: ${e.message}`);
    process.exit(1);
  });
}
