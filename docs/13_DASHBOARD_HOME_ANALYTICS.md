# 13_DASHBOARD_HOME_ANALYTICS.md — System A Premium Direction + Page Specs

Revises `DESIGN_SYSTEM.md` §3.2/§6 for System A (dashboard). Per project
decision (July 2026): the dashboard moves away from its original
functional-generic-SaaS palette toward the same premium chrome/gold DNA as
the marketing site and generated templates — Linear.app discipline + Apple.com
whitespace + Chronicle HQ editorial quality, adapted to a working product UI
rather than a marketing surface.

---

## 1. REVISED SYSTEM A PALETTE (supersedes DESIGN_SYSTEM.md §3.2 hex values)

The *token names* and *mechanism* (light/dark via `html[data-theme]`) don't
change — only the actual hex values, to align with the marketing site's
richer chrome/gold rather than the old muted functional palette.

```css
:root{
  --gold:#d4a656;          /* was #c99a4c — now matches marketing site exactly */
  --gold-bright:#f0c878;   /* was #dfb56a */
  --radius:10px;           /* was 8px — slightly more generous, matches elevated premium feel */
}
html[data-theme="dark"]{
  --bg:#0e0e10;             /* was #121214 — closer to marketing site's #0a0a0a, not identical (dashboard stays a notch lighter so it doesn't read as "the same screen" as a published site) */
  --surface:#1a1a1d;        /* unchanged */
  --surface-alt:#1f1f22;    /* unchanged */
  --border:#2b2b2f;         /* unchanged */
  --text:#f2f2f3;           /* unchanged */
  --text-mid:#a7a8ad;       /* unchanged */
  --text-dim:#6d6e73;       /* unchanged */
  --sidebar-bg:#141416;     /* was #17171a, slightly richer to match new --bg */
  --logo-color:var(--gold-bright); /* from brand-mark.css, confirmed consistent */
}
html[data-theme="light"]{
  --bg:#faf8f5;             /* was #f6f6f7 — warm off-white matching marketing site's light-mode templates, not sterile gray */
  --surface:#ffffff;        /* unchanged */
  --surface-alt:#f3f0ea;    /* was #fafafa — warm-tinted to match new --bg */
  --border:#e8e3d8;         /* was #e6e6e8 — warm-tinted */
  --text:#18140f;           /* was #16171a — warm near-black */
  --text-mid:#5c5648;       /* was #5b5d63 — warm-tinted */
  --text-dim:#948d7a;       /* was #9a9ca3 — warm-tinted */
  --sidebar-bg:#ffffff;     /* unchanged */
  --logo-color:#0a0a0a;
}
```

Rationale: this is the same warm-vs-neutral shift already applied to System
B's light-mode refactor in `DESIGN_SYSTEM.md` §3.1 — bringing System A in
line so the whole product feels like one brand, not two.

## 2. TYPOGRAPHY — unchanged mechanism, one addition

`DESIGN_SYSTEM.md` §2.2 already specifies Montserrat + JetBrains Mono for
System A. **New addition:** page-level H1s (Dashboard Home greeting,
Analytics page title) now use **Cormorant Garamond**, matching the marketing
site's editorial headline treatment — this is the one place System A borrows
the display font, specifically for large page titles, not body UI text.

```css
.page-head h1{
  font-family:'Cormorant Garamond',serif;
  font-weight:500;
  font-size:1.8rem; /* up from 1.4rem — bigger, more editorial */
}
```

Everything else (nav, buttons, table text, form labels) stays Montserrat per
the existing rule. Stat values stay JetBrains Mono per the existing rule.

## 3. ELEVATION — apply what DESIGN_SYSTEM.md §5 already specified

This was speced but never implemented (no Cursor session ran it). Apply
`--elevation-1/2/3` (with the dark-mode inset highlight) to `.stat-card`,
`.card`, `.notif-panel` now, per that section — no changes to the spec
itself, just confirming it's now actually in scope for this session.

---

## 4. DASHBOARD HOME — page spec

**Purpose:** the business owner's daily landing point. Answers "what does my
business need from me today?" in the first screen, before anything else —
this is the single highest-leverage page for the "no accountability, no
ready-made content" problem the marketing site's own copy names as the core
pain point. It should not read as a generic analytics-first SaaS home.

### Sections, top to bottom:

**1. Greeting strip**
- `Good morning, {{first_name}}` in the new Cormorant Garamond page-head
  style, time-of-day aware (morning/afternoon/evening)
- Small subtext: current plan badge (Free/Pro/Growth/Premium) + website
  status badge (Preview/Published/Suspended)

**2. Today's Action card** — the centerpiece, full-width, elevated
(`--elevation-2`), sits directly under the greeting
- Pulls the single most relevant thing from the 90-day content plan due
  *today* — headline of the content piece, a short preview, one-line CTA
  ("Post this to Instagram", "Publish this blog draft")
- If nothing's due today: falls back to a lighter-weight prompt ("You're all
  caught up — check tomorrow's plan" or a suggestion to fill a content gap)
- If the website itself isn't published yet (status = preview): this card is
  replaced entirely by a "Publish your website" CTA — that's the actual
  highest-priority action for a brand-new user, content scheduling is
  irrelevant until the site is live

**3. Stat grid** (4-up, `--elevation-1`, JetBrains Mono values per existing rule)
- Website views (this month)
- Content pieces published (this month)
- Consistency streak (days) — the gamification element from the marketing
  copy ("Progress tracker") lives here as a real number, not just a promise
- Contact form submissions (this month)

**4. Consistency tracker visual** — a compact strip, not a full chart
- Simple day-by-day dot/bar row for the current week (or last 7 days)
  showing which days had a content piece published — filled gold dot for
  "done," hollow/dim for "missed," per `--gold`/`--text-dim`
- This is the visual anchor for the "gamified consistency tracker" promise —
  small, glanceable, not a heavy analytics chart (that's the Analytics
  page's job)

**5. Quick links row** (3-4 cards, `--elevation-1`, hover → `--elevation-2`)
- Edit website → `/dashboard/website/edit`
- View analytics → `/dashboard/analytics`
- Content calendar (full 90-day view) → `/dashboard/content`
- Agency marketplace → `/dashboard/agencies` (Growth+ only — show locked
  state with upgrade prompt on Free/Pro, don't hide it entirely; per
  established pattern of not hiding paid features outright)

**6. Recent activity feed** (compact list, reuses `.notif-item` styling)
- Last 5 events: content published, form submission received, plan
  changed, website published, etc.

---

## 5. ANALYTICS — page spec

**Purpose:** deeper performance view, for users who want to go beyond the
Home page's glanceable summary. This page can be denser/more data-forward —
that contrast (Home = calm and directive, Analytics = detailed) is
intentional, not an inconsistency.

### Sections, top to bottom:

**1. Page head** — "Analytics" in Cormorant Garamond page-head style, date
range selector top-right (Last 7 days / 30 days / 90 days / Custom)

**2. Stat grid** (4-up, same visual system as Home)
- Total pageviews (selected range)
- Unique visitors
- Contact form submissions
- Average session context — if real session-duration tracking isn't in
  scope yet (check `05_ANALYTICS.md` once domain-swept), substitute top
  traffic source share (e.g. "62% via Instagram") instead of inventing a
  metric that isn't actually tracked

**3. Traffic over time** — the existing `.bar-chart` component, upgraded per
`DESIGN_SYSTEM.md` §6 point 4 (3-stop gradient, hover tooltip), full range
matching the date selector above

**4. Top pages table** — reuses `.data-table`, columns: Page, Views,
Contact submissions from that page (if attributable)

**5. Traffic sources breakdown** — small horizontal bar list or donut-style
breakdown (Instagram / Direct / Google / WhatsApp / Other), gold-scale color
ramp (`--gold` at 100%, stepping down in opacity for lower shares — avoid
introducing unrelated chart colors that break the palette)

**6. Content performance** (Growth+ feature; Free/Pro see a locked-state
teaser card instead of nothing) — which of the 90-day plan's published
pieces drove the most traffic/submissions, tying analytics back to the
content strategy feature rather than treating them as separate systems

---

## 6. WHAT THIS DOESN'T COVER YET

Login, Onboarding, and any other in-app pages beyond Home + Analytics are
explicitly out of scope for this doc — per the agreed starting point. Do not
extend implementation beyond these two pages in the resulting Cursor session.
