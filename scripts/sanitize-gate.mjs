#!/usr/bin/env node
// Pre-deploy sanitization gate (spec section 4.4).
// Fails the build (exit 1) if any forbidden token appears in dist/.
// Case-sensitive, matching `grep -E` default.

import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

// 'dist' is the deployed output. 'resume-src' is the HTML the resume PDF is
// generated from — scanned because the PDF itself is binary and can't be, so
// this is where a leaked phone number / employer name would have to enter.
const SCAN_DIRS = [
  { dir: 'dist', required: true },
  { dir: 'resume-src', required: false },
];
const FORBIDDEN = /CNA|192\.168\.|duckdns|justicemedia|justicerequests|815-886|Romeoville/;
const SCAN_EXT = new Set(['.html', '.css', '.js', '.mjs', '.svg', '.xml', '.txt', '.json', '.webmanifest']);

async function walk(dir, required) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    if (required) {
      console.error(`sanitize-gate: cannot read ${dir}. Run the build first.`);
      process.exit(1);
    }
    return [];
  }
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full, required)));
    else if (SCAN_EXT.has(extname(e.name))) files.push(full);
  }
  return files;
}

const files = [];
for (const { dir, required } of SCAN_DIRS) {
  files.push(...(await walk(dir, required)));
}
const hits = [];

for (const file of files) {
  const text = await readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = line.match(FORBIDDEN);
    if (m) hits.push(`${file}:${i + 1}  matched "${m[0]}"`);
  });
}

if (hits.length) {
  console.error('\nSANITIZE GATE FAILED — forbidden tokens found in dist/:\n');
  for (const h of hits) console.error('  ' + h);
  console.error(`\n${hits.length} hit(s). Deploy blocked.\n`);
  process.exit(1);
}

console.log(`sanitize-gate: clean (${files.length} files scanned).`);

// ---------------------------------------------------------------------------
// CSP gate. The policy is style-src 'self'; script-src 'self' with no
// unsafe-inline, so the browser drops inline style="" attributes and inline
// <script> bodies. It does this SILENTLY — no console error — so a violation
// looks like a working page with a mysteriously-ignored rule. This caught a
// real one: style="margin-top:3rem" shipped for days and never applied.
const CSP_VIOLATIONS = [];
for (const file of files.filter((f) => f.endsWith('.html'))) {
  const text = await readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/style="[^"]*"/g)) {
      CSP_VIOLATIONS.push(`${file}:${i + 1}  inline style attribute → ${m[0]}`);
    }
    // an inline <script> body (a <script src=...> is fine)
    for (const m of line.matchAll(/<script(?![^>]*\ssrc=)[^>]*>\s*\S/g)) {
      CSP_VIOLATIONS.push(`${file}:${i + 1}  inline <script> body → ${m[0].slice(0, 40)}`);
    }
  });
}

if (CSP_VIOLATIONS.length) {
  console.error('\nCSP GATE FAILED — the policy would silently drop these:\n');
  for (const v of CSP_VIOLATIONS) console.error('  ' + v);
  console.error(
    `\n${CSP_VIOLATIONS.length} violation(s). Move styles to a stylesheet and scripts to public/js/. Deploy blocked.\n`
  );
  process.exit(1);
}

console.log('csp-gate: clean (no inline styles or inline script bodies).');
