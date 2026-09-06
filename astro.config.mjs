// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Update when the custom domain is purchased (used for canonical + OG URLs).
  site: 'https://portfolio-site.pages.dev',
  output: 'static',
  integrations: [react()],
  // No code blocks on the site; Shiki's inline styles would conflict with the CSP.
  markdown: { syntaxHighlight: false },
  vite: {
    plugins: [tailwindcss()],
    // Never inline assets as data: URIs; the CSP allows fonts/images from 'self' only.
    build: { assetsInlineLimit: 0 },
  },
  security: {
    // Astro hashes every inline script/style it emits, so no 'unsafe-inline' is ever needed.
    // frame-ancestors cannot live in a <meta> CSP; it is set in public/_headers instead.
    csp: {
      algorithm: 'SHA-256',
      // Hash of the one hand-written inline script in Base.astro (adds the `js` class to <html>).
      // Recompute if that script changes: printf "%s" "<script body>" | openssl dgst -sha256 -binary | base64
      scriptDirective: {
        hashes: ['sha256-Du+OJKJSbdUgz5nrHeWWINvez6XKDDU/tyj/5c2uvwo='],
      },
      directives: [
        "default-src 'none'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "base-uri 'none'",
        "form-action 'none'",
        "manifest-src 'self'",
      ],
    },
  },
});
