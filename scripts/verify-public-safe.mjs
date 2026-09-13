// verify-public-safe — ADR-9 tier 3, mechanically. The hub's PII discipline used to hold by absence
// (People are counted, never modeled). This makes that a failing check instead of a comment.
//
// Scans (1) every Zod schema file under src/lib for contact-PII field names on any shape, and
// (2) every committed data file under src/data for email / phone literals. Bot / no-reply addresses
// (git trailers) are allowed. Prose copy in .tsx is deliberately NOT scanned — the word "email" on the
// About page is not a leak; a modeled `email` field is.
//
// Run: node scripts/verify-public-safe.mjs      (wired into `npm run check`; exits 1 on any finding)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const FORBIDDEN_FIELD = /\b(e_?mail|phone(?:_?number)?|mobile|telephone|home_?address)\s*:\s*z\./i;
const EMAIL = /(?<![\w/])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(?![\w])/g;
const PHONE = /(?<![\w.+-])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}(?![\w])|(?<![\w.])\+\d{10,15}(?![\w])/g;
const ALLOWED_EMAIL = /^(?:noreply|no-reply|donotreply)@|@users\.noreply\.github\.com$/i;

const walk = (dir, exts) => {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, exts));
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
};

const findings = [];
const note = (file, line, msg) => findings.push(`${relative(ROOT, file)}:${line} — ${msg}`);

// (1) schemas: a modeled contact field on any Zod shape is a violation
for (const f of walk(join(ROOT, "src/lib"), [".ts"])) {
  const src = readFileSync(f, "utf8");
  if (!/z\.object/.test(src)) continue;
  src.split("\n").forEach((l, i) => {
    if (FORBIDDEN_FIELD.test(l)) note(f, i + 1, `Zod schema models a contact-PII field: ${l.trim()}`);
  });
}

// (2) data: literal addresses / numbers in anything the site ships as data
for (const f of walk(join(ROOT, "src/data"), [".ts", ".json"])) {
  const src = readFileSync(f, "utf8");
  src.split("\n").forEach((l, i) => {
    for (const m of l.matchAll(EMAIL)) if (!ALLOWED_EMAIL.test(m[0])) note(f, i + 1, `email literal: ${m[0]}`);
    for (const m of l.matchAll(PHONE)) note(f, i + 1, `phone literal: ${m[0]}`);
  });
}

// (3) secrets never reach the client: no NEXT_PUBLIC_ var may carry a key/token/secret
for (const f of walk(join(ROOT, "src"), [".ts", ".tsx"])) {
  const src = readFileSync(f, "utf8");
  src.split("\n").forEach((l, i) => {
    const m = l.match(/NEXT_PUBLIC_[A-Z0-9_]*(KEY|TOKEN|SECRET)[A-Z0-9_]*/);
    if (m) note(f, i + 1, `client-exposed secret-looking env var: ${m[0]}`);
  });
}

if (findings.length) {
  console.log(`✗ verify-public-safe: ${findings.length} finding(s) — ADR-9 tier 3 (the hub carries no contact PII)`);
  for (const x of findings) console.log("  " + x);
  process.exit(1);
}
console.log("✓ verify-public-safe: no contact-PII fields in schemas, no address/phone literals in data, no client-exposed secrets");
