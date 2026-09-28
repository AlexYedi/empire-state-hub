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
//   speakers  People on the event with Role Context ∩ {speaker, host, organizer}: name · title ·
//             company · LinkedIn URL. Empty Role Context = dropped + reported (fail closed).
//   takeaways post_event_brief sections Quick Take · The Thesis · first 5 Insights · Tools Mentioned.
//             Quote Bank / Hot Takes / Anecdotes / Speaker Map / People & Outreach / Open Loops are
//             never read into the output. Quote blocks and quote-led lines are dropped.
//   posts     Content Drafts of type linkedin_post_{post,pre,synthesis} with Content Status =
//             published AND a Published URL. Per post: its carousel (a content-drafts/<dir>/*.pdf the
//             draft names, copied from the pipeline's COMMITTED tree) and its `## First comment`
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
export const OFF_RECORD = /off the record|stays in the room|don['’]t post|not public|confidential/i;
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
      return withLinks && href && !text.includes(href) ? `${text} (${href})` : text;
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
  if (OFF_RECORD.test(t) || EMAIL.test(t)) {
    report.phraseDrops++;
    return null;
  }
  return t;
}

export async function extractTakeaways(blocks, source, report) {
  const secs = await sections(blocks, source);
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
      else pub++;
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
const CAROUSEL_REF = /content-drafts\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+\.pdf)/g;

export function carouselFor(relPath, committed) {
  if (!relPath || !committed.has(relPath)) return null;
  const dir = relPath.split("/").slice(0, -1).join("/");
  const previews = [...committed]
    .filter((f) => f.startsWith(dir + "/") && /\/(?:preview-[^/]*|carousel-preview)\.png$/.test(f))
    .sort();
  const pub = (p) => "/rooms/" + p.replace(/^content-drafts\//, "");
  return { pdf: pub(relPath), preview: previews[0] ? pub(previews[0]) : null, _src: [relPath, previews[0]].filter(Boolean) };
}

function carouselFromText(texts, committed) {
  for (const t of texts)
    for (const m of t.matchAll(CAROUSEL_REF)) {
      const c = carouselFor(`content-drafts/${m[1]}/${m[2]}`, committed);
      if (c) return c;
    }
  return null;
}

// ---------- overlay ----------
export function validateOverlay(overlay) {
  if (!Array.isArray(overlay)) throw new Error("rooms.curated.json must be a JSON array");
  const seen = new Set();
  for (const r of overlay) {
    if (!r || typeof r.slug !== "string" || !SLUG.test(r.slug)) throw new Error(`overlay: bad slug ${JSON.stringify(r?.slug)}`);
    if (seen.has(r.slug)) throw new Error(`overlay: duplicate slug ${r.slug}`);
    seen.add(r.slug);
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
 * @param {Set<string>} o.committed  pipeline paths tracked in git (content-drafts/**)
 * @param {string}   o.now       ISO timestamp for generated_at
 */
export async function buildRooms({ overlay, source, committed, now }) {
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
      const companyId = relationIds(prop(p, "Company"))[0];
      const li = urlValue(prop(p, "LinkedIn URL"));
      speakers.push({
        name: titleOf(p),
        title: richText(prop(p, "Current Title")) || null,
        company: companyId ? titleOf(await page(companyId)) || null : null,
        linkedin: li && /^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(li) ? li : null,
        roles: pubRoles,
      });
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
    const companies = await titles(relationIds(prop(ev, "Companies")));

    // takeaways — newest post_event_brief on this event
    const onEvent = (d) => relationIds(prop(d, "Event")).includes(eventId);
    const brief = drafts
      .filter((d) => selectName(prop(d, "Content Type")) === "post_event_brief" && onEvent(d))
      .sort((a, b) => (b.last_edited_time ?? "").localeCompare(a.last_edited_time ?? ""))[0];
    let takeaways = null;
    if (brief) {
      r.brief = true;
      takeaways = await extractTakeaways(await source.getBlocks(brief.id), source, report);
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
      const url = urlValue(prop(d, "Published URL"));
      if (!kind || selectName(prop(d, "Content Status")) !== "published" || !url || !/^https:\/\//.test(url)) continue;
      const blocks = await source.getBlocks(d.id);
      const texts = [titleOf(d), ...blocks.map((b) => blockText(b, true))];
      const raw = await firstCommentLines(blocks, source);
      const firstComment = raw ? cleanFirstComment(raw, publishedVariant(texts), report) : null;
      const carousel = carouselFromText(texts, committed);
      if (firstComment) r.firstComments++;
      if (carousel) {
        r.carousels++;
        for (const s of carousel._src) assets.set(s, s.replace(/^content-drafts\//, ""));
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

    let roomCarousel = null;
    if (entry.carousel) {
      const c = carouselFor(entry.carousel, committed);
      if (c) {
        roomCarousel = { pdf: c.pdf, preview: c.preview };
        for (const s of c._src) assets.set(s, s.replace(/^content-drafts\//, ""));
      } else r.carouselMissing = entry.carousel;
    }

    const date = dateStart(prop(ev, "Event Date"));
    rooms.push({
      slug: entry.slug,
      name: entry.name || titleOf(ev),
      date: date ? date.slice(0, 10) : entry.slug.slice(0, 10),
      location: richText(prop(ev, "Location")) || null,
      status: selectName(prop(ev, "Event Status")),
      series: entry.series ?? null,
      what: entry.what ?? null,
      recapPending: !takeaways,
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
  return {
    phrases: (s.match(new RegExp(OFF_RECORD.source, "gi")) ?? []).length,
    emails: (s.match(new RegExp(EMAIL.source, "g")) ?? []).length,
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

export function committedFiles(pipelineDir) {
  try {
    const out = execFileSync("git", ["-C", pipelineDir, "ls-files", "content-drafts"], { encoding: "utf8" });
    return new Set(out.split("\n").filter(Boolean));
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
  const { data, report, assets } = await buildRooms({
    overlay,
    source: await notionSource(),
    committed,
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
  console.log(`phrase/contact lines dropped: ${report.phraseDrops}`);
  const scan = safetyScan(data);
  console.log(`output scan: ${scan.phrases} off-the-record phrase hit(s) · ${scan.emails} email literal(s)`);

  if (dry) {
    console.log("dry run — nothing written");
    return;
  }
  if (scan.phrases || scan.emails) {
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
