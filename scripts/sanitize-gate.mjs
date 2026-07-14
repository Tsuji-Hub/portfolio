#!/usr/bin/env node
// Pre-deploy sanitization gate (spec section 4.4).
// Fails the build (exit 1) if any forbidden token appears in dist/.
// Case-sensitive, matching `grep -E` default.

import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const DIST = 'dist';
const FORBIDDEN = /CNA|192\.168\.|duckdns|justicemedia|justicerequests|815-886|Romeoville/;
const SCAN_EXT = new Set(['.html', '.css', '.js', '.mjs', '.svg', '.xml', '.txt', '.json', '.webmanifest']);

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    console.error(`sanitize-gate: cannot read ${dir}. Run the build first.`);
    process.exit(1);
  }
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else if (SCAN_EXT.has(extname(e.name))) files.push(full);
  }
  return files;
}

const files = await walk(DIST);
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
