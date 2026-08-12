# Privacy Policy Page — Implementation Plan

## Context
The marketing site is a set of static HTML pages in `marketing-site/`, deployed separately from the Next.js app. Existing legal/informational pages:
- `marketing-site/terms.html` — Terms of Service (currently combined with Privacy Policy)
- `marketing-site/faq.html` — FAQ

Shared assets: `marketing-site/assets/css/styles.css`, `marketing-site/assets/js/script.js`

## Goal
Create a dedicated Privacy Policy page at `buildzuri.com/privacy.html` matching the existing static marketing site theme, using the draft policy content provided by the user.

## What Needs to Happen

### 1. Create `marketing-site/privacy.html`
- Static HTML file using the same structure/nav/footer as `terms.html` and `faq.html`
- Uses shared CSS classes: `.page-header`, `.page-eyebrow`, `.reveal`, `.prose`, `.last-updated`
- Fonts: Cormorant Garamond (headings) + Montserrat (body) via Google Fonts
- Full privacy policy content provided by user
- Meta tags / OG tags matching the pattern in existing pages

### 2. Update `marketing-site/terms.html`
- Remove the "Privacy Policy" section (Section 2)
- Update title/meta from "Terms & Privacy" to "Terms of Service"
- Keep Terms sections only

### 3. Update footer links across marketing pages
- Split "Terms & Privacy" into separate "Terms" and "Privacy" links in:
  - `marketing-site/terms.html`
  - `marketing-site/faq.html`
  - Any other marketing HTML files that have the combined link

### 4. Update `marketing-site/sitemap.xml`
- Add `<url><loc>https://buildzuri.com/privacy.html</loc>...</url>`

### 5. Fix inconsistent `/privacy` references in app code
Some components link to `/privacy` (no extension) while others use `/privacy.html`. After adding the static file, these should be normalized to `/privacy.html`:
- `src/components/custom-site/Step4Signup.tsx:189` — `marketingUrl("/privacy")` → `marketingUrl("/privacy.html")`
- `src/lib/email/templates/BaseEmailLayout.tsx:159` — `${APP_URL}/privacy` → `${APP_URL}/privacy.html`

## Unresolved Decision

**Where should the Privacy Policy page live?**

The codebase has TWO marketing surfaces:
- Static HTML in `marketing-site/` (served at `buildzuri.com`) — contains `terms.html`, `faq.html`, etc.
- Next.js pages in `src/app/(marketing)/` (served from the app domain)

Existing legal/informational pages are static HTML. The user explicitly asked to match "the theme from the other marketing site pages." The architecture doc (`docs/00_LANDING_SITE_ARCHITECTURE.md`) shows `/privacy.html` in the static site tree.

**Recommended answer:** Create `marketing-site/privacy.html` as a static HTML file, matching the existing static marketing pages. This keeps the marketing site self-contained and consistent with `terms.html` and `faq.html`.

**Alternative considered:** A Next.js page at `src/app/(marketing)/privacy/page.tsx` would use the `(marketing)` layout (different navbar/footer from the static site) and serve a clean `/privacy` URL, but would be inconsistent with the rest of the marketing site which is all static HTML.

## Open Questions
- None pending the location decision above.
