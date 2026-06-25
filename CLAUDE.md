# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## Project overview

This repository hosts the **Symo Print** website — a marketing/showcase site for a
French professional printing company ("imprimerie professionnelle"). Despite the
repository name (`1win-`), all content is the Symo Print website.

It is a **static, multi-page website**: hand-written HTML, CSS, and vanilla
JavaScript. There is **no build step, no framework, no package manager, and no
backend**. The site is served as-is (GitHub Pages — see the `CNAME` file pointing
to `symoprint.com`).

All user-facing copy is in **French** (`<html lang="fr">`). Keep new content in
French to match.

## How to run / preview

There is nothing to build. Preview by opening files in a browser or serving the
folder statically:

```bash
# From the repo root, any static server works, e.g.:
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

Use a server (not `file://`) so the root-relative behavior and relative asset
paths resolve the way they do in production.

There are **no tests, linters, or CI configured**. Validate changes by opening
the affected pages in a browser and checking layout, links, and the console.

## Repository structure

```
/
├── index.html                      # Homepage
├── cgv.html                        # Legal: terms of sale (CGV)
├── mentions-legales.html           # Legal: legal notice
├── politique-confidentialite.html  # Legal: privacy policy (RGPD)
├── preview-homepage.html           # Standalone single-file homepage preview (self-contained)
├── CNAME                           # GitHub Pages custom domain (symoprint.com)
│
├── contact/index.html              # Contact page
├── devis/index.html                # Multi-step quote ("devis") form with file upload
│
├── grand-format/index.html         # Category: large-format printing
├── papeterie/index.html            # Category: stationery
├── signaletique/index.html         # Category: signage
├── textile-objets/index.html       # Category: textile & promotional objects
│
├── css/
│   ├── style.css       # Core design system + shared layout (navbar, footer, hero…)
│   ├── category.css    # Category-page-specific styles
│   ├── devis.css       # Quote form styles
│   ├── contact.css     # Contact page styles
│   └── legal.css       # Shared styles for the legal pages
│
└── js/
    ├── main.js         # Shared: cookie banner, navbar scroll, mega-menu, mobile nav, etc.
    ├── category.js     # Category pages: sticky subnav, active-link, smooth scroll
    ├── devis.js        # Quote form: multi-step logic, validation, file-upload security
    └── contact.js      # Contact form: field validation + sanitization
```

### Asset path conventions (important)

Pages live at two depths, and relative paths differ accordingly:

- **Root-level pages** (`index.html`, `cgv.html`, legal pages) reference assets as
  `css/style.css`, `js/main.js`.
- **Subdirectory pages** (`grand-format/`, `devis/`, `contact/`, etc.) reference
  assets with `../`, e.g. `../css/style.css`, `../js/main.js`, and link to other
  pages with `../` (e.g. `../index.html`, `../devis/index.html`).

When adding or moving a page, double-check every `href`/`src` matches the page's
directory depth.

### Which CSS/JS each page loads

- Every page loads `css/style.css` (or `../css/style.css`) and `js/main.js`.
- Category pages additionally load `category.css` + `category.js`.
- `devis/` loads `devis.css` + `devis.js`. `contact/` loads `contact.css` +
  `contact.js`. Legal pages load `legal.css`.
- External CDNs: Google Fonts (**Inter**) and **Font Awesome 6.5.0** (icons via
  `<i class="fas fa-...">`).

## Design system

The design system is defined as CSS custom properties at the top of
`css/style.css` (`:root`). Always use these tokens rather than hard-coded values.

**Brand colors:**
- `--primary: #1F7A8C` (petrol blue) — primary brand color, plus `--primary-dark`,
  `--primary-deeper`, `--primary-light`, and alpha variants `--primary-50/100/200`.
- `--cta: #F4A62A` (orange) — **reserved for action buttons/CTAs only**, per the
  charte. Don't use orange for general accents.
- Neutrals: `--white`, `--light` (#F5F5F5), `--border`, `--border-dark`.
- Text: `--text-primary`, `--text-secondary`, `--text-muted`, plus light-on-dark
  variants `--text-light`, `--text-xlight`.

**Other tokens:** shadow scale (`--shadow-xs` → `--shadow-xl`), radii
(`--radius-sm` → `--radius-xl`), typography (`--font` = Inter), and motion
(`--ease`, `--dur`, `--dur-slow`).

Shared layout helpers: `.container` (max-width 1220px), `.section` (vertical
spacing), `.section-eyebrow`, `.section-title`, `.accent-text`,
`.visually-hidden`.

## Code conventions

### HTML
- Semantic, accessible markup: ARIA roles/labels (e.g. cookie banner
  `role="dialog"`), `aria-label` on icon-only links, `.visually-hidden` for
  screen-reader text.
- SEO is taken seriously: meta description/keywords, Open Graph tags, and
  Schema.org JSON-LD (`LocalBusiness`) in the homepage `<head>`. Preserve these
  when editing.
- Security meta tags are present (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`). The intended CSP is meant to be enforced server-side.
- Section banners use box-drawing comment blocks (`═══`) to delimit major
  regions — match this style when adding sections.

### CSS
- One concern per file (see structure above). Put shared/global styles in
  `style.css`; page-specific styles in the matching file.
- Files open with a banner comment; sections are separated by `── label ──`
  comments. Mirror the existing formatting.
- Mobile-responsive via media queries; keep new components responsive.

### JavaScript
- Vanilla JS only. Each file is wrapped in an **IIFE** with `'use strict';`.
- Common DOM helpers are redefined per file: `$` (querySelector), `$$`
  (querySelectorAll → array), `on` (addEventListener). Reuse them.
- Code is organized into small `init*()` functions called on load.
- **Security is a first-class concern**, especially in `devis.js` and
  `contact.js`:
  - Always render user input with `textContent`, **never** `innerHTML`, to
    prevent XSS. `contact.js` has a `sanitize()` helper for entity escaping.
  - Strict validation: type, length, and regex checks on every field
    (see `VALIDATORS` in `contact.js`).
  - File uploads (`devis.js`) are validated by extension **and** MIME type, with
    per-file (50 MB) and total (250 MB) size limits and a max file count — see
    `FILE_CONFIG`.
  - Anti-bot honeypot field and a placeholder anti-CSRF token are present; actual
    enforcement is expected server-side.
  - No `eval()` / dynamic code execution.
  - Cookie consent (RGPD) is stored in `localStorage` under
    `symoprint_cookie_consent` with a 6-month expiry.

When touching forms, preserve these protections — do not introduce `innerHTML`
with user data or weaken validation.

## Shared components

The **topbar**, **navbar + mega-menu**, **cookie banner**, and **footer** are
duplicated across pages (no templating engine). If you change one of these
shared components, **apply the same change to every page** that contains it so
they stay consistent. `js/main.js` wires up their behavior on all pages.

## Git workflow

- Active development branch for this work: **`claude/claude-md-docs-qadnm6`**.
  Develop, commit, and push here. Do not push to other branches without explicit
  permission.
- Commit messages follow **Conventional Commits** with a scope, e.g.
  `feat(homepage): ...`, `feat(devis): ...`, `feat(legal): ...`.
- Do not open a pull request unless explicitly asked.
