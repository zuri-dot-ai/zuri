# 12_DESIGN_SYSTEM.md — Zuri Design System

Single source of truth for typography, color, spacing, elevation, and component
treatment across **System A** (dashboard/admin, `dashboard.css`) and
**System B** (public/generated sites, `styles.css`). Both systems inherit
from the same token set below. No component should invent a raw px/rem/hex
value that isn't defined here — if it's not in this file, add it here first,
then use it.

---

## 1. Core Visual DNA (brand-level, inherited by everything)

Source: Zuri landing page (buildzuri.com marketing site).

| Token | Value | Notes |
|---|---|---|
| Base black | `#0A0806` (marketing) / `#0a0a0a` (System B shared) | Marketing page uses a very slightly warmer black than the app CSS; both are acceptable, System B's `#0a0a0a` is canonical for generated sites |
| Gold accent (site) | `#d4a656` | System B `--gold` |
| Gold accent bright (site) | `#f0c878` | System B `--gold-bright`, hover state |
| Gold accent (dashboard) | `#c99a4c` | System A `--gold` — intentionally a notch darker/more muted than site gold, appropriate for a functional UI |
| Gold accent bright (dashboard) | `#dfb56a` | System A `--gold-bright` |
| Gold usage rule | **Max 4 accent instances per section/view.** Never used as a large fill except on primary CTA buttons. | Applies to both systems |
| Motion | Subtle-to-medium AOS-style animations: fade-up + gentle stagger on scroll reveal. `.reveal`/`.reveal.in` pattern in System B is canonical. | Avoid anything bouncier than the button `:active{transform:scale(.94)}` micro-interaction |
| Design references | Linear.app (discipline/restraint) + Apple.com (whitespace) + Chronicle HQ (editorial quality) | Use as a gut-check for any new component: does it feel this restrained? |

---

## 2. Typography — The 3-Font System

**Global rule, no exceptions, applies to every archetype and every system:**

| Font | Role | Weight range | Where |
|---|---|---|---|
| **Cormorant Garamond** | Display / editorial | 300–500 | H1/H2/H3, hero text, plan prices, auth card headings, page-header titles, OTP digits, shop name, error-page code |
| **Montserrat** | Body / UI | 300 (desktop body) / 400 (mobile body, UI labels, nav) / 500 (buttons, eyebrows, badges) | Body copy, nav, buttons, form labels, footer, FAQ metadata, dashboard UI (replacing Inter) |
| **JetBrains Mono** | Numeric / data | 400–600 | Prices (₦), stats, order IDs, timestamps, table numeric columns, dashboard `.stat-value`, plan-price numerals |

### 2.1 Detailed mapping — System B (public sites)

| Element | Font | Size | Weight | Letter-spacing | Notes |
|---|---|---|---|---|---|
| Hero H1 | Cormorant Garamond | `clamp(2.2rem, 4.5vw, 3.4rem)` (inner pages) / 80–96px (landing hero) | 300–400 | 0.01em | |
| Section title | Cormorant Garamond | `clamp(1.6rem, 3vw, 2.2rem)` | 500 | 0.01em | |
| Eyebrow / section label | Montserrat | 0.72–0.78rem | 500 | **0.2–0.25em**, uppercase | Always gold |
| Body copy | Montserrat | 15–16px (0.95–1.05rem) | 300 desktop → **400 under 600px** | normal | Weight bump is a required premium fix, see §5.2 |
| Nav links | Montserrat | 0.95rem | 400 | 0.03em | |
| Buttons | Montserrat | 0.85rem | 500 | 0.05em, uppercase | |
| Plan price | Cormorant Garamond | 2.6rem | 400 | normal | `span` unit suffix at 1rem, chrome-dark |
| Prices/₦ amounts inline in prose | JetBrains Mono | inherit | 500 | normal | New rule — not yet in current CSS, add on next revision |
| Order IDs / timestamps | JetBrains Mono | 0.85–0.9rem | 400 | normal | |
| Auth card H1 | Cormorant Garamond | 1.7rem | 500 | normal | |
| OTP digits | Cormorant Garamond | 1.6rem | 500 | normal | |
| Legal/prose H2 | Montserrat (NOT Cormorant) | 1.4rem | 600 | normal | Prose blocks favor legibility over editorial tone |
| Error code (404) | Cormorant Garamond | `clamp(5rem, 15vw, 9rem)` | 400 | normal | Gold |

### 2.2 Detailed mapping — System A (dashboard)

| Element | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Page/topbar title | Montserrat | 1.05–1.4rem | 600 | Replaces current Inter |
| `.stat-label` | Montserrat | 0.78rem | 500 | uppercase optional |
| `.stat-value` | **JetBrains Mono** | 1.5rem | 600 | **Change from current spec** — this is the single highest-impact typography fix in the whole system |
| `.stat-delta` | JetBrains Mono | 0.78rem | 500 | numeric delta, keep color logic (green/red) |
| Table numeric columns (prices, IDs, counts, dates) | JetBrains Mono | 0.86rem | 400 | Table text columns (names, statuses) stay Montserrat |
| `table.data-table th` | Montserrat | 0.75rem | 500 | uppercase, letter-spacing 0.03em |
| Buttons | Montserrat | 0.85rem | 500 | |
| Sidebar link | Montserrat | 0.88rem | 500 | |
| Form labels | Montserrat | 0.8rem | 500 | uppercase optional, letter-spacing 0.05em |
| Badge text | Montserrat | 0.72rem | 600 | |
| Empty-state h3 | Montserrat | 1.05rem | 600 | |

**Implementation note for Cursor:** replace every `font-family:'Inter',...` in
`dashboard.css` with `font-family:'Montserrat',sans-serif`, then add a new
utility class `.mono` / apply `font-family:'JetBrains Mono',monospace` directly
to `.stat-value`, `.stat-delta`, and any table cell rendering a price, ID,
count, or date.

---

## 3. Color Tokens

### 3.1 System B (public/generated sites) — full token set

```css
:root{
  --black:#0a0a0a;
  --chrome-light:#f5f5f5;
  --chrome-mid:#c9ced6;
  --chrome-dark:#6b7178;
  --gold:#d4a656;
  --gold-bright:#f0c878;
}
```

**Required upgrade (per §9 of project summary — light-mode support):**
Trust-professional and some template themes default to light mode (Theme 3
is "often light mode to offer variety" per the template spec). System B
currently has NO light-mode variables — everything is hardcoded to
`--black`/`--chrome-light`. This must be refactored to a `[data-theme]`
pattern matching System A's approach:

```css
:root{
  --gold:#d4a656;
  --gold-bright:#f0c878;
}
[data-theme="dark"]{
  --bg:#0a0a0a;
  --surface:#141414;      /* gradient panels currently hardcoded as linear-gradient(160deg,#141414,#0a0a0a) */
  --surface-alt:#101010;  /* form fields, inputs */
  --border:#222222;
  --border-mid:#262626;
  --text:#f5f5f5;         /* chrome-light */
  --text-mid:#c9ced6;     /* chrome-mid */
  --text-dim:#6b7178;     /* chrome-dark */
}
[data-theme="light"]{
  --bg:#faf8f5;           /* warm off-white, not pure white, to match brand warmth */
  --surface:#ffffff;
  --surface-alt:#f3f0ea;
  --border:#e8e3d8;
  --border-mid:#ddd6c6;
  --text:#18140f;
  --text-mid:#5c5648;
  --text-dim:#948d7a;
}
```

Every hardcoded `#0a0a0a`, `#141414`, `#101010`, `#1c1c1c`, `#222`, `#262626`,
`var(--black)`, `var(--chrome-light)`, `var(--chrome-mid)`, `var(--chrome-dark)`
reference across `styles.css` needs to become a `var(--bg)` / `var(--surface)`
/ `var(--text)` etc. reference so the same stylesheet serves both dark
templates (Obsidian, The Firm, Naija Street, Launchpad, Lens, Iron...) and
light templates (Advisor, Sanctuary, Clarity, Canvas, Flow, Meridian,
Estate...). `--gold` and `--gold-bright` stay theme-independent.

### 3.2 System A (dashboard) — already token-based, keep as-is

```css
:root{
  --gold:#c99a4c;
  --gold-bright:#dfb56a;
  --radius:8px;
}
html[data-theme="light"]{
  --bg:#f6f6f7; --surface:#ffffff; --surface-alt:#fafafa;
  --border:#e6e6e8; --text:#16171a; --text-mid:#5b5d63; --text-dim:#9a9ca3;
  --sidebar-bg:#ffffff;
}
html[data-theme="dark"]{
  --bg:#121214; --surface:#1a1a1d; --surface-alt:#1f1f22;
  --border:#2b2b2f; --text:#f2f2f3; --text-mid:#a7a8ad; --text-dim:#6d6e73;
  --sidebar-bg:#17171a;
}
```

This is the reference pattern System B's refactor (§3.1) should follow.

### 3.3 Semantic/status colors (System A, reusable in System B admin contexts)

| Meaning | Color | Usage |
|---|---|---|
| Success/up | `#3fb96f` | `.stat-delta.up`, `.badge.green` |
| Danger/down | `#e2555a` | `.stat-delta.down`, `.badge.red`, `.btn-danger` |
| Warning/pending | `--gold` | `.badge.yellow` |
| Neutral/gray | `--text-dim` on `--surface-alt` | `.badge.gray` |

---

## 4. Spacing Scale (NEW — formalize across both systems)

Currently ad hoc rem values throughout both CSS files. Add this scale as
root-level custom properties in **both** stylesheets so Cursor sessions stop
inventing spacing per component:

```css
:root{
  --space-1: 0.25rem;   /*  4px — tight inline gaps, icon padding */
  --space-2: 0.5rem;    /*  8px — form field internal gaps, badge padding */
  --space-3: 0.75rem;   /* 12px — small component padding */
  --space-4: 1rem;      /* 16px — base unit, most gaps */
  --space-5: 1.5rem;    /* 24px — card padding (mobile), section gaps */
  --space-6: 2rem;      /* 32px — card padding (desktop), form stacks */
  --space-7: 3rem;      /* 48px — section-to-section, major card padding */
  --space-8: 6rem;      /* 96px — page-level vertical rhythm (approaches the "100px+" hero padding rule) */
}
```

Mapping existing values to the scale (for the eventual refactor pass):
- `.stat-card`/`.card` padding (`1.2–1.5rem`) → `--space-5`/`--space-6`
- `.auth-card`/`.onboarding-card` padding (`2.2–2.8rem`) → between `--space-6` and `--space-7`, custom value acceptable for these two hero-ish containers
- `main section` padding (`4rem...6rem`) → `--space-7`/custom (this is intentionally larger than the scale's top step to hit the "extreme whitespace" brand rule — keep as a documented exception, not a scale violation)
- `.page-header` top padding (`9rem`) → documented exception, same reasoning

---

## 5. Elevation / Shadow Scale (NEW)

### 5.1 Definitions

```css
:root{
  --elevation-1: 0 1px 2px rgba(0,0,0,.04);                    /* current dashboard default — resting cards, light mode */
  --elevation-2: 0 4px 16px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);  /* raised: dropdowns, notif panel, hover state */
  --elevation-3: 0 12px 32px rgba(0,0,0,.18);                  /* current .notif-panel value — modals, popovers */
}
[data-theme="dark"]{
  --elevation-1: 0 1px 2px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.02);
  --elevation-2: 0 4px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.03);
  --elevation-3: 0 16px 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.04);
}
```

The `inset 0 1px 0 rgba(255,255,255,.02–.04)` on dark mode is the "subtle
inner highlight" premium upgrade called out for `.stat-card`/`.card` — it
reads as a soft top-edge catch-light, which is the detail that separates
premium dark-UI from default dark-UI.

### 5.2 Where to apply

- `.stat-card`, `.card` → `--elevation-1` resting, `--elevation-2` on hover (new hover state, not currently present)
- `.notif-panel` → `--elevation-3` (already matches, just tokenize it)
- `.vault-panel`, `.auth-card`, `.onboarding-card` (System B) → equivalent of `--elevation-2`, adapted to dark-only values since System B panels are currently gradient-only with no shadow — add one
- Increase `--radius` usage: dashboard currently `8px` flat everywhere — for `--elevation-2`/`3` contexts (modals, notif panel), bump to `12px` to match the "larger radius" premium note

---

## 6. System A — Component Upgrade Specs

All changes below are additive/modifying to the existing `dashboard.css`.

1. **Fonts**: `Inter` → `Montserrat` everywhere; `.stat-value`, `.stat-delta`, and all numeric table cells → `JetBrains Mono` (see §2.2). This is the single highest-leverage change — do it first.
2. **Shadows**: replace flat `var(--shadow)` references with `--elevation-1` (resting) / `--elevation-2` (hover) per §5. Add inset highlight on dark mode.
3. **Badges**: add `box-shadow: inset 0 0 0 1px currentColor` at low opacity (e.g. wrap in `color-mix` or a precomputed rgba matching each badge's text color) — gives the pill a hairline inset border matching its text color instead of flat fill only.
   ```css
   .badge.green{ box-shadow: inset 0 0 0 1px rgba(63,185,111,.35); }
   .badge.yellow{ box-shadow: inset 0 0 0 1px rgba(201,154,76,.35); }
   .badge.red{ box-shadow: inset 0 0 0 1px rgba(226,85,90,.35); }
   .badge.gray{ box-shadow: inset 0 0 0 1px rgba(255,255,255,.06); }
   ```
4. **Bar chart**: `.bar-chart .bar` gets a more pronounced gradient (already has one, refine to 3-stop: `var(--gold) 0%, var(--gold-bright) 60%, var(--gold-bright) 100%`), keep `border-radius:3px 3px 0 0`, add a JS-driven hover tooltip showing the exact JetBrains-Mono-formatted value (new markup: `.bar-tooltip`, positioned absolute above the bar on `:hover`/`:focus`).
5. **Sidebar active state**: add a thin left-edge gold indicator:
   ```css
   .sidebar-link{ position:relative; }
   .sidebar-link.active::before{
     content:''; position:absolute; left:-1rem; top:50%; transform:translateY(-50%);
     width:3px; height:60%; background:var(--gold); border-radius:0 2px 2px 0;
   }
   ```
   (Adjust `left` offset to sidebar's actual padding so the bar sits flush against the sidebar's outer edge, not floating inside the link's own padding.)
6. **Avatar**: add a subtle ring for the active/current user:
   ```css
   .avatar.current{ box-shadow: 0 0 0 2px var(--surface), 0 0 0 3.5px var(--gold-bright), 0 0 12px rgba(223,181,106,.25); }
   ```

---

## 7. System B — Component Upgrade Specs

1. **Light/dark refactor**: implement `[data-theme]` variables per §3.1. Every template ships with `class`/attribute set to `theme-1`/`theme-2`/`theme-3` (per template spec's 3-color-theme system) — but underlying dark/light *mode* (background/text/surface) should map through the same `data-theme` mechanism System A already proves out. Recommendation: each of the 24 templates' 3 color themes picks both a hue variant (theme-specific gold/accent override, if templates ever diverge from brand gold) **and** a light/dark mode, expressed as `data-theme="dark"` or `data-theme="light"` on `<body>` alongside the existing `theme-1/2/3` class for the color pass.
2. **Mobile body weight**: 
   ```css
   @media (max-width:600px){
     body{ font-weight:400; }
   }
   ```
   Add this — currently missing. Keeps the editorial 300-weight feel on desktop, fixes readability on phones (majority of Nigerian SMB traffic).
3. **Keep as reference patterns, do not simplify**:
   - `.pricing-vault` clip-path/panel-offset reveal
   - `.faq-item` accordion (`max-height` + opacity transition)
   - `.product-grid` background-gap trick (`background:#1a1a1a` + `1.6px` grid gap simulating hairline dividers)
   - `.btn-ghost::before` clip-path border-reveal
   These four are genuinely premium-feeling and should be the quality bar new components are measured against.
4. **Image placeholders**: `.thumb`, `.thumb-sm`, `.pd-gallery-main`, `.product-card .thumb` all currently render as a flat `linear-gradient(160deg,#1c1c1c,#0d0d0d)`. This is correct as a *loading/empty* state only. Add:
   ```css
   .thumb img, .thumb-sm img, .pd-gallery-main img{ width:100%; height:100%; object-fit:cover; transition:transform .5s cubic-bezier(.16,1,.3,1); }
   .product-card:hover .thumb img{ transform:scale(1.04); }
   ```
   **Pipeline requirement** (flag to backend/editor spec, not just CSS): the template-fill pipeline and website editor must never leave an image placeholder unfilled at publish time — pull from `category_images` as a fallback if the user hasn't uploaded/chosen one.
5. **Formalize spacing/elevation**: replace ad hoc `rem` paddings/margins with `--space-*` tokens per §4, and add `--elevation-*` box-shadows to `.vault-panel`, `.auth-card`, `.onboarding-card`, `.otp-box:focus` per §5.2 (these currently have zero shadow, relying only on border + gradient — a soft `--elevation-2` under the gradient panels will make them feel less flat against the pure-black background).

---

## 8. Archetype Differentiation (post font-unification)

Per the summary, the 8 archetypes no longer get separate font pairs — all
use the 3-font system. Differentiation now comes purely from:

| Lever | Range/options |
|---|---|
| Weight | Cormorant 300 (airy/luxury) vs 500 (authoritative); Montserrat 300 (editorial) vs 500 (functional/trust) |
| Size | Hero scale varies — e.g. portfolio-dramatic can push hero type larger/bolder than authority-minimal |
| Letter-spacing | Wider tracking (0.2–0.3em) on eyebrows reads more luxury/editorial; tighter (0.03–0.05em) reads more modern/SaaS |
| Case | Uppercase nav/eyebrows = confident/modern; sentence case = softer/community-oriented |
| Layout rhythm | Extreme whitespace + centered = luxury/portfolio; denser grid + left-aligned = authority/trust-professional/clean-modern |
| Light vs dark mode | Trust-professional and community-vibrant skew light; warm-sensory, editorial-bold, portfolio-dramatic, clean-modern skew dark (per the 24-template plan in §7 of project summary) |
| Gold vs alternate accent | Default is Zuri gold `#d4a656` on all templates; template metadata *may* define one alternate accent per theme variant, but gold remains present as at least a secondary accent everywhere for brand consistency |

This table exists so template-generation prompts (`TEMPLATE_PROMPTS.md`) can
reference "differentiate via §8 levers" instead of re-explaining archetype
personality each time.

---

## 9. Open Items / Not Yet Decided

- Exact alternate-accent hex values per archetype (if any) — not yet specified, default to gold-only until template prompts are written
- Whether `data-theme` (light/dark) is chosen automatically per template or exposed as a 4th user-facing toggle in the editor (current spec says editor only lets users pick 1 of 3 preset color themes — light/dark is likely baked into which of the 3 themes they pick, not a separate control)
- JetBrains Mono weight availability — confirm 400/500/600 are all loaded (variable font vs static weights) before relying on 600 for `.stat-value`

---

*This file supersedes any font-pairing tables in the original per-archetype
specs. Wherever an older doc says "Playfair + Lato" or similar, defer to
§2 of this file instead.*
