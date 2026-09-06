#!/usr/bin/env node
// Static preview of dist/ that ACTUALLY APPLIES public/_headers.
//
// `astro preview` serves the files but ignores _headers, because that is a
// Cloudflare Pages feature. So the strict CSP is absent locally, and any check
// for "zero CSP violations" run against `astro preview` is meaningless — the
// policy under test is not there. This serves the same files with the real
// header parsed out of public/_headers, so the policy can be verified before
// anything is deployed.
//
// Usage: node scripts/csp-preview.mjs [port]

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

const PORT = Number(process.argv[2] || 4330);
const ROOT = resolve('dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
};

// Parse the `/*` block out of public/_headers: indented "Name: value" lines.
async function loadHeaders() {
  const raw = await readFile('public/_headers', 'utf8');
  const out = {};
  let inGlobal = false;
  for (const line of raw.split(/\r?\n/)) {
    if (/^\S/.test(line)) {
      inGlobal = line.trim() === '/*';
      continue;
    }
    if (!inGlobal) continue;
    const m = line.match(/^\s+([A-Za-z0-9-]+):\s*(.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const headers = await loadHeaders();
console.log('csp-preview: applying ' + Object.keys(headers).length + ' headers from public/_headers');
console.log('  ' + (headers['Content-Security-Policy'] || '(no CSP found!)'));

createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = join(ROOT, url);
  try {
    const s = await stat(file).catch(() => null);
    if (!s || s.isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, {
      ...headers,
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    });
    res.end(body);
  } catch {
    try {
      const body = await readFile(join(ROOT, '404.html'));
      res.writeHead(404, { ...headers, 'Content-Type': TYPES['.html'] });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  }
}).listen(PORT, () => console.log('csp-preview: http://localhost:' + PORT));
