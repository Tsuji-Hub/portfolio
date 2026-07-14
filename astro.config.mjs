import { defineConfig } from 'astro/config';

// Static output (default). Emit external CSS files instead of inline <style>
// so the site can run under a strict CSP with style-src 'self' (no unsafe-inline).
export default defineConfig({
  site: 'https://portfolio.pages.dev',
  build: {
    inlineStylesheets: 'never',
    format: 'directory',
  },
  compressHTML: true,
  devToolbar: { enabled: false },
});
