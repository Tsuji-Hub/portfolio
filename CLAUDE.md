## Project rules (read first)

- Spec: `../Portfolio_Site-Spec_v1.md` (architecture, content drafts) and `../Portfolio_Site-Spec_v2.md` (the design pivot this shell implements). Voice rules: `E:\CLAUDE COWORK\ABOUT ME\anti-ai-writing-style.md`. No em dashes, no AI filler words.
- Sanitized content only. Never commit: employer name, real IPs, duckdns hostnames, VM/CT ids, drive serials, phone number, street-level location. Gate before every deploy: `grep -rEo "CNA|192\.168\.|duckdns|justicemedia|justicerequests|815-886|Romeoville" dist/` must return nothing.
- Zero third-party requests. Fonts via `@fontsource-variable`, icons via lucide-react or inline SVG. No CDN, no analytics.
- CSP is hashed by Astro (`security.csp`). Do not add `unsafe-inline`. No inline `style=""` attributes in server-rendered markup (use classes); React/GSAP CSSOM writes are fine. If you change the `js`-class inline script in `Base.astro`, recompute its hash in `astro.config.mjs`.
- Motion: every GSAP effect goes through `gsap.matchMedia()` with a `prefers-reduced-motion: reduce` branch that sets final state. Content must be fully visible with JS disabled.
- `public/resume.pdf` is the WEB variant (no phone). Do not replace it with the application resume.
- Content for /projects/* lives in `src/data/projects.ts`. Edit data, not templates, for copy changes.
- Progress notes go in `.claude/cowork-notes.md` (git-ignored) per the Cowork handoff convention.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
