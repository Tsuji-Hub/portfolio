# ethan.justice portfolio

Static portfolio. Astro 7 + React islands + Tailwind v4 + GSAP + lucide + shadcn-style primitives.

- `npm run dev` local dev on :4321
- `npm run build` static output to `dist/`
- `npm run preview` serve the build

## Rules baked in

- No third-party requests. Fonts are self-hosted (`@fontsource-variable`).
- Strict CSP: Astro hashes every inline script/style (`security.csp` in `astro.config.mjs`). The one hand-written inline script has its hash pinned there; recompute if you change it.
- All motion is gated on `prefers-reduced-motion`. No JS = everything still visible and readable.
- Sanitized content only: no employer name, no hosts, no addresses, no phone. `public/resume.pdf` is the web variant (no phone number).

## Layout

```
src/
  components/    Nav, Hero, TopologyCanvas, Bento, Footer, ui/ (button, card)
  data/          projects.ts is the content source of truth for /projects/*
  layouts/       Base.astro (head, CSP-hashed js flag, nav, footer)
  pages/         index, about, 404, projects/[slug]
  styles/        global.css (tokens via @theme, utilities)
public/          _headers (Cloudflare Pages), favicon.svg, resume.pdf
```

Deploy: Cloudflare Pages, build command `npm run build`, output `dist`. Set `site` in `astro.config.mjs` once the domain exists.
