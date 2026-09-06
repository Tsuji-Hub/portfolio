#!/usr/bin/env node
// Concatenate the page-chrome scripts into a single dist/js/site.js.
//
// Why: three <script src> tags cost three round trips, and on the home page
// that measured as a reproducible 1-point Lighthouse drop (99 vs 100) with
// LCP 1.8s instead of 1.7s. Merged, it is 11 requests instead of 13 and the
// score matches main exactly.
//
// This runs at BUILD time rather than being a hand-maintained merged file, so
// nav.js / reveal.js / topology.js stay the editable sources. A checked-in
// concatenation would rot the moment someone edited one of the parts and
// wondered why nothing changed.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SRC = 'public/js';
const PARTS = ['nav.js', 'reveal.js', 'topology.js'];
const OUT = join('dist', 'js', 'site.js');

const header =
  '// Built by scripts/bundle-chrome.mjs from: ' +
  PARTS.join(', ') +
  '\n// Edit those files, not this one.\n\n';

const bodies = await Promise.all(
  PARTS.map(async (p) => '/* ---- ' + p + ' ---- */\n' + (await readFile(join(SRC, p), 'utf8')))
);

await writeFile(OUT, header + bodies.join('\n'), 'utf8');
console.log(
  'bundle-chrome: ' + PARTS.length + ' files -> dist/js/site.js (' +
    (header + bodies.join('\n')).length + ' B)'
);
