# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **pure static website** for *Symo Print*, a French professional printing company. There is no build system, no package manager, no framework, and no bundler. All files are served directly as-is. The site is deployed via GitHub Pages (CNAME: `symoprint.com`). All content is in French.

## Development Workflow

Since there is no build step, development consists of editing HTML/CSS/JS files directly and previewing them in a browser. To serve locally:

```bash
# Any static file server works, e.g.:
python3 -m http.server 8080
# or
npx serve .
```

There are no lint, test, or compile commands.

## Architecture

### File/CSS Loading Per Page Type

Each page type loads a specific CSS combination — never add a stylesheet that belongs to another page type:

| Page type | HTML location | CSS loaded |
|---|---|---|
| Homepage | `index.html` | `css/style.css` |
| Category pages | `grand-format/`, `papeterie/`, `signaletique/`, `textile-objets/` | `css/style.css` + `css/category.css` |
| Devis (quote) | `devis/` | `css/style.css` + `css/devis.css` |
| Contact | `contact/` | `css/style.css` + `css/contact.css` |
| Legal pages | `mentions-legales.html`, `cgv.html`, `politique-confidentialite.html` | `css/style.css` + `css/legal.css` |

Subpages use `../css/` (relative) to reference stylesheets. The homepage uses `css/` directly.

### JavaScript per Page Type

Each JS file is an IIFE (`(function() { 'use strict'; ... })()`) with local `$`, `$$`, `on` helpers:

- `js/main.js` — homepage only: cookie RGPD banner, navbar scroll, mobile hamburger menu, mega-menu mobile toggle, animated counters (IntersectionObserver), scroll-reveal, testimonials carousel with touch/keyboard/auto-play, smooth scroll, newsletter form simulation.
- `js/category.js` — category pages: sticky subnav with active link tracking, FAQ accordion with keyboard arrow-key navigation, scroll-reveal.
- `js/contact.js` — contact page: inline form validation with blur/input events, RGPD checkbox, honeypot anti-bot field, sanitization via `sanitize()`.
- `js/devis.js` — quote page: 3-step multi-step form (category → product options → contact + file upload). State is tracked in a `state` object. File upload validates by extension AND MIME type; accepts PDF, TIF, TIFF, AI, JPG, JPEG, EPS, PNG; max 50 MB per file, 250 MB total, 5 files. CSRF token placeholder generated client-side.

### CSS Design System

All design tokens live in `:root` in `css/style.css`:

- Primary (teal): `--primary: #1F7A8C` and variants (`--primary-dark`, `--primary-light`, etc.)
- CTA (orange): `--cta: #F4A62A` — **used exclusively for action buttons**, never for decorative elements
- Text dark: `--text-primary: #0D1F2D`
- Font: Inter (Google Fonts CDN)
- Icons: Font Awesome 6.5.0 (CDN)

Responsive breakpoints: `1100px` (tablet layouts), `900px` (mobile nav — hamburger replaces desktop menu), `640px` (mobile layouts), `380px` (extra small).

### Scroll-Reveal Pattern

Elements animated on scroll receive `data-reveal` and `data-reveal-delay="1|2|3|4"` attributes, either in HTML directly or injected by `addRevealAttributes()` / `addReveal()` in the JS. CSS in `style.css` handles the transition from `opacity:0; translateY(28px)` to `revealed` state via IntersectionObserver.

## Key Conventions

### Security — XSS Prevention
All user-supplied or dynamic text is inserted via **`textContent`** only, never `innerHTML`. The `sanitize()` function in `contact.js` and `escapeHtml()` in `devis.js` exist as additional guards. Maintain this pattern strictly when adding any dynamic DOM content.

### Honeypot Anti-Bot
Both the contact form and the devis form include a hidden honeypot field (`#contactHoneypot`, `#honeypotField`). If the field is non-empty on submit, the bot is silently shown a fake success rather than an error (to avoid revealing the defence).

### Navigation Links vs. Folder Names
The navbar links textile to `textile/index.html` but the actual folder on disk is `textile-objets/`. Be aware of this discrepancy when editing nav links or adding pages in that section.

### Relative Paths in Subpages
All subpages (one directory deep) reference assets with `../`. The homepage references them without prefix. Never use absolute paths.

### Mega-Menu Structure
Desktop mega-menus open on `:hover`/`:focus-within` via pure CSS. Mobile toggles are handled in `main.js` by adding `.open-mobile` to `.nav-item.has-mega`. The promo block inside `.mega-col:last-child` is hidden on mobile via `display: none` in CSS.

### Schema.org Structured Data
Each page includes JSON-LD structured data in `<script type="application/ld+json">`. The homepage has `LocalBusiness`. Category pages have `BreadcrumbList` + `FAQPage`. Contact has `LocalBusiness` + `BreadcrumbList`. Keep these consistent when adding or renaming pages.

### Form Simulation
The devis and newsletter form submissions are currently **simulated** (no real API call). The contact form is also simulated. Comments in the code mark where real API calls should be added (`// ICI : Appel API réel...`).
