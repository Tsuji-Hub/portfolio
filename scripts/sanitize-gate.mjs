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
