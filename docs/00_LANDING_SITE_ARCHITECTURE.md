# ZURI — MARKETING SITE ARCHITECTURE (addendum to 00_MASTER_PROMPT.md and 09_DEPLOYMENT.md)
# Settles the split between the static marketing site and the Next.js app
# before Session 2 (website builder) begins, per project decision July 2026.

---

## 1. THE SPLIT

Two independently deployed properties, not one Next.js app serving both:

| Property | Pages | Tech | Domain |
|---|---|---|---|
| **Marketing site** | Home, Pricing, About, Privacy, Terms, 404 | Static HTML + shared CSS + shared JS (no framework, no build step) | `buildzuri.com` (apex) + `www.buildzuri.com` (redirect to apex) |
| **App** | Auth (login/signup), Onboarding, Dashboard, Website Editor, Admin, generated user sites | Next.js 15 App Router | `app.buildzuri.com` (the app itself) + `*.buildzuri.com` wildcard (generated user sites, e.g. `handle.buildzuri.com`) |

**Assumption flagged for confirmation:** this is written as two separate
Vercel projects/deployments, each owning its own domain assignment, rather
than one Next.js project handling both via internal routing. This matches
"root domain serves static pages, app.buildzuri.com is the separate Next.js
app" as you specified it. If you actually want a single Vercel project with
domain-based routing instead (Next.js serving the static pages from `/public`
and using middleware to decide root-vs-subdomain), say so and I'll rewrite
this section — the two approaches have different tradeoffs (see §5).

---

## 2. WHY THIS SPLIT (rationale, for anyone reading this later)

- The marketing site needs to load instantly and hit Lighthouse 100s for the
  GeminiXprize judging criteria (competitive: agencies competing on
  "Business Viability" will have polished landing pages) — plain static
  HTML/CSS/JS with 3D animations you've hand-tuned is the fastest path to
  that, no framework hydration cost.
- The Next.js app doesn't need to know or care about marketing content at
  all — cleaner separation of concerns, smaller Next.js bundle, faster app
  cold starts.
- The generated user sites (`handle.buildzuri.com`) and the marketing site
  are structurally the same *kind* of thing (static-feeling HTML pages) but
  serve completely different purposes and audiences — keeping them on
  separate infrastructure (marketing = its own static deploy; user sites =
  served through the Next.js app's `/sites/[handle]` route per
  `02_WEBSITE_BUILDER.md` §7) avoids conflating the two systems.

---

## 3. FILE STRUCTURE (marketing site repo/folder)

You already have the HTML and CSS files built. Recommended structure once
ingested:

```
/marketing-site
  /index.html          (Home)
  /pricing.html
  /about.html
  /privacy.html
  /terms.html
  /404.html
  /assets
    /css/styles.css     (shared — the System B stylesheet you already showed me,
                          which already has .pricing-vault, .faq-item, .prose,
                          .error-page, etc. — this IS the shared marketing CSS)
    /js/script.js        (shared — scroll reveal, nav drawer, FAQ accordion,
                          any 3D animation logic)
    /fonts or Google Fonts <link> tags (Cormorant Garamond + Montserrat, per
                          DESIGN_SYSTEM.md — marketing site is one of the two
                          surfaces the 3-font rule governs)
    /images
  vercel.json           (or equivalent static-hosting config)
```

This mirrors the same "shared stylesheet across pages" pattern as
`dashboard.css`, not the "one self-contained file per page" pattern used by
the 24 generated-site templates — correct, since these are two different
systems with different constraints (marketing site pages share nav/footer;
generated templates must be self-contained so they can be filled independently).

---

## 4. DEPLOYMENT

- **Marketing site**: deploy as a Vercel static project (or any static host —
  Vercel is simplest given the rest of the stack is already there). Attach
  `buildzuri.com` (apex) as the primary domain, `www.buildzuri.com` as a
  redirect to apex.
- **App**: existing Next.js Vercel project. Attach `app.buildzuri.com` as a
  domain, plus the wildcard `*.buildzuri.com` for generated user sites — per
  `09_DEPLOYMENT.md`'s existing wildcard-subdomain plan, which still applies,
  just scoped to exclude the apex/www (those now belong to the marketing
  project's domain assignment instead).
- **DNS**: apex `buildzuri.com` → marketing project; `app.buildzuri.com`
  CNAME → app project; `*.buildzuri.com` CNAME → app project. Vercel supports
  assigning different domains/subdomains of the same root domain to different
  projects — this doesn't require buying/managing two separate domains.
- **Contact/waitlist forms on marketing pages, if any** (e.g. a "Get Started"
  email capture on Home): should POST to the app's API
  (`app.buildzuri.com/api/...`), same CORS pattern as the generated-site
  contact form in `02_WEBSITE_BUILDER.md` §10. The marketing site itself
  stays static — no server-side logic on that deployment.

---

## 5. TRADEOFF NOTE (why two projects vs. one)

| | Two separate projects (this spec) | One Next.js project, domain-routed |
|---|---|---|
| Marketing site load speed | Fastest possible — zero framework overhead | Slightly slower — even static-exported Next.js pages carry some framework weight |
| Deploy independence | Marketing site can be redeployed/edited without touching the app, and vice versa | Every marketing tweak goes through the same build/deploy pipeline as the app |
| Complexity | Two deployments to manage, two domains to wire in DNS | One deployment, one domain, middleware handles the split |
| Fits your existing hand-built HTML/CSS/JS with custom 3D animations | Yes, directly — drop the files in, done | Would need porting into Next.js pages/components first |

Given you already have hand-crafted HTML/CSS/JS with 3D animations, the
two-project approach lets you ship it as-is with zero porting work — which is
why this doc defaults to that approach.

---

## 6. WHAT THIS CHANGES IN EXISTING DOCS

- **`00_MASTER_PROMPT.md`**: the line "the Next.js app starts from the
  onboarding/login page" needs an explicit domain — it starts at
  `app.buildzuri.com/login` (or `/onboarding` post-signup), not at the apex
  domain. The apex domain never renders any Next.js route.
- **`09_DEPLOYMENT.md`**: needs a new top section describing the two-project
  split (this doc can be merged in directly), and its existing wildcard
  subdomain / custom domain instructions should be scoped explicitly to the
  app project, not "the Vercel project" singular.
- **`middleware.ts`** (in `02_WEBSITE_BUILDER.md` §7.2): no change needed to
  the matching logic itself, but worth a one-line comment noting the
  middleware will simply never see requests for the apex domain — those
  never reach this Vercel project at all, so no special-case handling is
  required inside the Next.js app for "am I on the marketing domain."

---

## 7. NEW CURSOR SESSION — MARKETING SITE INGESTION

Run this before or alongside Session 2A — fully independent of the website
builder track.

```
This session is independent of the Next.js app entirely. I have hand-built
HTML/CSS/JS files for Zuri's marketing site (Home, Pricing, About, Privacy,
Terms, 404) with custom 3D animations, already designed and ready. Read
@docs/00_LANDING_SITE_ARCHITECTURE.md in full before doing anything.

I will place the files at /marketing-site locally, following the structure
in section 3 of that doc (or close to it — inspect what's actually there and
tell me if it doesn't match before restructuring anything).

TASK:
1. Inspect the existing files. Confirm: do all pages correctly share the
   same styles.css / script.js, or does anything duplicate styles inline
   that should be pulled into the shared files? Report findings, don't fix
   without confirmation.
2. Set this up as a separate static-hosting Vercel project (not the existing
   Next.js app project) — vercel.json or equivalent config for a plain
   static site, no build step required unless you find one is already in use
   (e.g. a bundler for the JS) — check before assuming none exists.
3. If any page includes a form (e.g. email capture, contact) that needs to
   submit somewhere, flag it to me and do NOT wire it to a real endpoint yet
   — confirm the target endpoint with me first per section 4 of the doc.
4. Do not touch the existing Next.js app project in this session.

STOP AND CONFIRM the domain/DNS assignment plan (section 4 of the doc) with
me before actually attaching buildzuri.com to this new project — I want to
make sure app.buildzuri.com and the wildcard aren't accidentally disrupted.
```
