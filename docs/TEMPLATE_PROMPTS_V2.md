# ZURI — TEMPLATE PROMPTS V2
# Supersedes TEMPLATE_PROMPTS.md in full. Read 00_SESSION_PROMPT_PREMIUM_OVERHAUL.md first.
# This is the complete specification for premium website template generation: the global
# design/technical rules every template must follow, the 8 archetype personality briefs
# with fixed font pairings, the shared module library, hard field-length limits, the
# animation standard, the Cloudinary image contract, and the meta-prompt system used to
# generate 10 templates per archetype (80 total) via Cursor Agent.

---

## 0. WHAT CHANGED FROM V1 (context)

| | V1 | V2 |
|---|---|---|
| Templates per archetype | 3 | 10 (target — see §7) |
| Fonts | Per-archetype pairing, unrestricted pool (Inter, Bebas Neue, Nunito, etc.) | Locked to exactly 9 fonts platform-wide, fixed pairing per archetype |
| Structure | Identical skeleton across all templates in a category | Module-toggle system — 2-3 structural variation points per template, resolved by data availability |
| Breakpoints | 2-3, inconsistently applied | 4, mandatory, tested down to 360px |
| Animation | Vanilla JS + IntersectionObserver only, opacity/translateY | GSAP + ScrollTrigger approved, richer motion vocabulary required |
| Field lengths | Unconstrained (`{{tagline}}`, `{{about_body}}` free text) | Hard word/character limits per field, enforced twice (prompt + code) |
| Images | picsum.photos placeholders → Unsplash/Pexels live calls (v1) or bare `data-image-slot` | Cloudinary-served, named transform presets, real curated stock library, aspect-ratio contract per slot |
| Services data | Flat string array, name only | Structured `{name, description}` per `01_ONBOARDING_V2.md` |
| Craft level | Inconsistent — some templates elegant, some generic | Uniform premium craft bar across all 8 archetypes, personality varies, quality does not |

Generation pipeline shape (`02_WEBSITE_BUILDER.md` §4) is unchanged — resolve
archetype → select template → fill placeholders → resolve images → validate
→ save. This document governs what the templates themselves must contain
and how Cursor should generate them; it does not change the pipeline's
control flow.

---

## 1. GLOBAL RULES (apply to every template, every archetype, no exceptions)

These supersede v1's 14 global rules. Read in full before generating any
template.

### 1.1 Output format

Single self-contained `.html` file. Inline `<style>` in `<head>`. Inline
`<script>` before `</body>`. Google Fonts via `<link>`. **GSAP is now
permitted** via CDN `<script>` tag (`https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js`
+ `ScrollTrigger.min.js` from the same CDN path) — this is the one
external-library exception, same pattern as the font `<link>` tag. No
other frameworks, no build step, no npm packages.

### 1.2 Font restriction (hard rule — no exceptions)

**Only these nine fonts may appear anywhere in any template, ever:**
Cormorant Garamond, Montserrat, Georgia, Poppins, Bodoni Moda, Cinzel,
Marcellus, Cormorant Infant, Tenor Sans.

- **Cinzel and Bodoni Moda are display-only** — hero headlines and
  wordmark-style logo text ONLY. Never body text, never nav links, never
  card titles at small sizes, never footer text.
- **The other seven are workhorse fonts** — usable for headings AND body
  text AND UI chrome (nav, buttons, form labels).
- **Georgia** is a system font (no Google Fonts `<link>` needed for it) —
  useful as a zero-latency fallback in a `font-family` stack, and
  acceptable as a primary body font in archetypes where its slightly
  more conventional serif character fits.
- See §3 for the exact fixed pairing per archetype. Do not mix pairings
  across archetypes, and do not introduce a font not on this list under
  any circumstance, including "just for a small decorative element."

### 1.3 Placeholder syntax (unchanged from v1, one addition)

`{{business_name}}`, `{{tagline}}`, `{{about_body}}`,
`{{service_1_name}}` / `{{service_1_description}}` through `_6` (renamed
from v1's `_title` to `_name` — matches the `ServiceEntry` shape from
`01_ONBOARDING_V2.md` exactly; slots 4-6 wrapped in `hidden
data-optional-slot="N"` exactly as v1 specified),
`{{testimonial_1_quote}}` / `_name` / `_role` (×3), `{{phone_number}}`,
`{{email_address}}`, `{{whatsapp_number}}`, `{{instagram_url}}`,
`{{address}}`. No `{{logo_url}}` — business name is always styled text,
confirmed permanent per Session Prompt Decision (not a v1 limitation).

**NEW**: `{{first_name}}` is available for templates that want a
founder-personalized touch (e.g. "Hi, I'm {{first_name}}" in an About
section) — sourced from the onboarding Step 10 answer, optional to use.

### 1.4 Field length limits (hard rule, enforced twice — see §6)

| Field | Limit | Rationale |
|---|---|---|
| `{{tagline}}` | Max 8 words | Hero headline — must never wrap past 2 lines at any breakpoint |
| `{{about_body_short}}` (hero subhead usage) | Max 22 words | One short paragraph, never a wall of text under a hero headline |
| `{{about_body_long}}` (dedicated About section usage) | Max 60 words | Distinct key from the hero-context version — see §6.1 |
| `{{service_N_name}}` | Max 5 words / 40 characters | Matches onboarding Step 2 limit exactly |
| `{{service_N_description}}` | Max 12 words / 70 characters | Matches onboarding Step 2 limit exactly |
| `{{testimonial_N_quote}}` | Max 30 words | Long enough to feel authentic, short enough to never break a card layout |
| `{{testimonial_N_name}}` | Max 4 words | Full name only |
| `{{testimonial_N_role}}` | Max 6 words | e.g. "Regular customer since 2023" |
| Category-specific fields (credentials, class schedule, property details) | Max 6 words each | Applies to any archetype-specific field not listed above |

### 1.5 Images — Cloudinary contract (replaces v1's picsum.photos rule entirely)

Every image element uses a Cloudinary-served URL, never picsum.photos,
never a raw Unsplash/Pexels URL. Every `<img>` carries a
`data-image-slot="hero|about|gallery_1|..."` attribute exactly as v1
specified, for the editor to target later.

**Source URL pattern** (built from the constants already defined in the
Session Prompt §5):

```html
<img
  src="https://res.cloudinary.com/dzuvmw4l/image/upload/c_fill,g_auto,w_1600,h_900,f_auto,q_auto:good/{{hero_image_public_id}}"
  data-image-slot="hero"
  alt="{{business_name}}"
  loading="eager"
/>
```

The `{{hero_image_public_id}}` placeholder is filled by the pipeline at
generation time — either a curated `zuri-stock/{archetype}/{slot}/...`
path (if the user skipped upload) or a `zuri-user-uploads/{user_id}/...`
path (if they uploaded a real photo) — the template never needs to know
which source it came from, only which named transform to request. This
is exactly what makes graceful degradation invisible at the template
level.

**Transform selection per slot type** (which of the five presets to
request):

| Slot type | Transform | Notes |
|---|---|---|
| `hero` | `hero` (1600×900) | Desktop; see §1.6 for mobile hero handling |
| `about`, `founder` | `square` (1200×1200) | |
| `gallery_N`, `work_N` | `square` (1200×1200) or `card` (600×450) | Card for dense grids, square for masonry/generous grids |
| `before_N`, `after_N` | `square` (1200×1200) | Only rendered when real user data exists — see §5.3 |
| `case_study` | `hero` (1600×900) | |
| `property_N` | `card` (600×450) | |

**Never hard-code a transform string inline per-image in a template** —
always use the exact five preset strings from the Session Prompt §5
constants, copied verbatim. This keeps every template's image handling
centrally changeable later.

### 1.6 Hero treatment — image vs typography-only balance

Per the agreed direction, templates within an archetype should include a
deliberate mix of **image-backed heroes** and **typography-only heroes**
(no hero image at all — confident large type on a solid/gradient
background instead) — not every template defaults to needing a photo.

- Typography-only heroes are the **safer default for archetypes where
  hero image quality risk is higher** (e.g. `authority-minimal`, where a
  bad stock "office" photo reads as generic) and should appear more
  often in that archetype's 10-template set.
- Image-backed heroes remain the default for archetypes where the visual
  itself carries most of the emotional weight (`warm-sensory`,
  `luxury-aspirational`, `portfolio-dramatic`).
- Aim for roughly a **60/40 image-to-typography split across each
  archetype's 10 templates**, adjusted per archetype personality — see
  §3 for the exact recommended split per archetype.
- A typography-only hero still needs real craft: this is not "just text
  on a plain background." Use the archetype's accent color as a subtle
  gradient mesh, a large decorative numeral/mark, generous negative
  space, and confident type scale to make it feel intentional, not empty.

### 1.7 Responsive breakpoints (hard rule — 4 required, not 2-3)

Mobile-first CSS. Exactly these four breakpoints, tested at each:

| Breakpoint | Range | Design intent |
|---|---|---|
| `small-mobile` | ≤ 360px | The genuine floor — small Android devices common in Nigeria. Nothing may overflow, clip, or require horizontal scroll here. |
| `mobile` | 361px – 480px | Standard phone. |
| `tablet` | 481px – 1024px | |
| `desktop` | ≥ 1025px | |

Every template must be manually checked (or Cursor must reason through
layout at each) at 360px specifically — this is the breakpoint v1's
templates silently ignored, and it's the one most likely to actually
break for real users.

**Hard requirement — four distinct `@media` blocks, not three plus a
patch:** every template file must contain four distinct, clearly-ordered
CSS tiers:

1. Base / mobile-first styles with **no** media query at all — this is
   what small-mobile (≤360px) actually renders, so it must already be
   tight enough that nothing overflows, clips, or wraps awkwardly at
   360px without needing a separate override block bolted on afterward.
2. `@media (min-width:361px)` — the `mobile` tier (361–480px).
3. `@media (min-width:481px)` — the `tablet` tier (481–1024px).
4. `@media (min-width:1025px)` — the `desktop` tier (≥1025px).

A `@media (max-width:360px)` patch layered on top of base styles does
**not** satisfy this rule by itself — v1/early-V2 drafts did this and it
silently collapsed the 361–480px tier into an untested no-op inherited
from base styles. Each of the four tiers above must contain at least one
real, meaningful adjustment (type-scale step, grid column count, gap
spacing, nav treatment, etc.) — not just a duplicate of the previous
tier's rule.

### 1.8 Animation standard (GSAP + ScrollTrigger, replaces v1's vanilla-only rule)

Load GSAP core + ScrollTrigger via CDN. Every template must include, at
minimum:

- **Scroll-triggered section reveals** using `ScrollTrigger` (replaces
  v1's IntersectionObserver pattern) — stagger children within a section
  rather than fading the whole block at once
- **Hero entrance choreography** — headline, subhead, and CTA animate in
  with sequential delay (not simultaneous), on page load not scroll
- **At least one signature motion moment per template**, chosen from
  (not exhaustive — Cursor may propose others that fit the archetype):
  text-reveal-by-word or by-character on the hero headline, a magnetic
  button effect on the primary CTA, a horizontal marquee strip (e.g.
  scrolling service names or client logos), a `clip-path` wipe transition
  between sections, parallax on hero background layers via GSAP's
  `scrollTrigger.scrub`, a pinned section during scroll
- **Motion timing matches archetype personality** — see §3 per-archetype
  motion specs (e.g. `luxury-aspirational` uses slow, generous easing;
  `community-vibrant` uses tighter, punchier timing with slight
  overshoot)
- **`stats-strip` marquee is a named required pattern, not optional** —
  whenever a template includes the `stats-strip` module, its signature
  motion moment must be a horizontal auto-scrolling marquee: a single flex
  track (`white-space:nowrap`) containing the stat items duplicated
  back-to-back for seamless wraparound, animated with
  `gsap.to(track, { xPercent: -50, duration: <archetype-appropriate>, repeat: -1, ease: 'none' })`.
  Never lay stats out as a static multi-column grid — large stat numbers
  in 2-4 columns collide/overflow at narrow mobile widths (≤360px). The
  container needs `overflow:hidden`.
- Respect `prefers-reduced-motion` — wrap GSAP animations in a check and
  fall back to instant/near-instant state changes (no scroll-jacking, no
  parallax, minimal fade only) when the media query matches. For the
  `stats-strip` marquee specifically, the reduced-motion fallback is a
  static single-pass row with `overflow-x:auto` (so nothing is lost if a
  user needs to scroll it manually) — never fall back to a multi-column
  grid, which is exactly the layout that breaks at narrow widths.

### 1.9 Service cards, WhatsApp float, contact form, footer, accessibility

Unchanged from v1 rules 4, 5, 9, 10, 11, 12 — carry forward exactly as
specified in `TEMPLATE_PROMPTS.md` (6 card slots with 4-6 hidden by
default, the exact WhatsApp float script, testimonials with no star
ratings/avatars, contact form with static "Message sent" state,
footer with "Powered by Zuri" and conditional Instagram, semantic HTML5 +
4.5:1 contrast + visible focus states). No changes needed to these
mechanics — they were already correct.

### 1.10 CSS variables (unchanged from v1 rule 13)

`--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`,
`--color-accent`, `--color-accent-text` on `:root`. Unchanged.

### 1.11 Section order (unchanged principle from v1 rule 14)

Nav → Hero → [archetype-specific + about/services per module selection] →
Testimonials → Contact → Footer, WhatsApp float persisting throughout.
The module-toggle system (§4) determines what fills the middle, not this
overall shape.

---

## 2. THE MODULE LIBRARY (new — replaces v1's "one unique section per
category" model with a shared, toggleable system)

### 2.1 Why a shared library instead of per-archetype unique sections

V1 gave each archetype exactly one bolted-on "unique section" (Opening
Hours strip, Before/After row, Masonry grid). This was the single biggest
cause of templates within a category feeling identical to each other —
every warm-sensory template had to include the same Opening Hours strip
in the same position. V2 instead defines a **shared pool of modules**,
each archetype gets a **whitelist** of which modules it may draw from,
and each of the 10 templates in that archetype selects a **different
subset and order** from its whitelist. This is what creates real
variation between templates in the same category without needing 10x the
unique-section design effort.

### 2.2 The module pool

| Module | What it needs (data dependency) | Typical position |
|---|---|---|
| `gallery` | ≥ 3 uploaded or curated images | After About, before Testimonials |
| `masonry-work` | ≥ 4 uploaded or curated images (varied aspect ratios OK) | Centerpiece, often right after Hero |
| `before-after` | ≥ 1 real uploaded pair — NEVER stock-filled (Session Prompt Decision 10) | After About |
| `stats-strip` | Always available (Gemini generates plausible stats from business context) — **implement as a horizontal auto-scrolling marquee (GSAP infinite loop with duplicated content for seamless wraparound), never a static multi-column grid** — grids of large stat numbers collide/overflow at narrow mobile widths | Directly under Hero, or as a divider before Services |
| `credentials-bar` | Always available (Gemini generates plausible trust markers) | Directly under Hero |
| `class-schedule` | User-provided hours/schedule data, or omitted entirely if absent | After Services |
| `opening-hours-cta` | User-provided hours, or omitted if absent | Directly under Hero |
| `featured-property` | ≥ 1 uploaded property image + details | Replaces generic Services grid where used |
| `case-study-spotlight` | ≥ 1 uploaded work image + Gemini-generated case copy | After masonry-work |
| `faq-accordion` | Always available (Gemini generates plausible Q&A from business context) | Before Contact |
| `founder-split` | Founder/about photo (curated or uploaded) | After Hero, alternative to generic About |

### 2.3 Per-archetype module whitelist

| Archetype | Allowed modules (pick 2-4 per template, vary across the 10) |
|---|---|
| warm-sensory | `opening-hours-cta`, `gallery`, `stats-strip`, `faq-accordion` |
| authority-minimal | `stats-strip`, `credentials-bar`, `faq-accordion`, `founder-split` |
| luxury-aspirational | `before-after`, `gallery`, `founder-split`, `stats-strip` |
| editorial-bold | `masonry-work`, `gallery`, `stats-strip` |
| clean-modern | `stats-strip`, `faq-accordion`, `credentials-bar` |
| portfolio-dramatic | `masonry-work`, `case-study-spotlight`, `founder-split` |
| community-vibrant | `before-after`, `class-schedule`, `stats-strip`, `gallery` |
| trust-professional | `credentials-bar`, `stats-strip`, `faq-accordion`, `founder-split` |

`authority-minimal` also permits `featured-property` specifically for
real-estate-flavored templates within that archetype (matching v1's
Template 2.3 precedent).

### 2.4 Module selection logic (Gemini Flash call, same stage as template selection)

```typescript
// src/lib/website/module-selector.ts

async function selectModules(
  brand: BusinessProfile,
  template: TemplateMetadata,
  availableData: {
    imageCount: number;
    hasBeforeAfterPair: boolean;
    hasScheduleData: boolean;
    hasPropertyData: boolean;
  }
): Promise<string[]> {
  // The template itself declares which module "slots" it has (1-2 for
  // most templates, occasionally 3) and which subset of the archetype
  // whitelist it's pre-wired to support structurally (a template's HTML
  // has conditional blocks for its declared modules only — Cursor builds
  // 2-4 real module blocks per template at generation time, not all 11
  // library modules in every file).

  // This function's job: given what data actually exists for this
  // business, pick the best-fitting subset of the template's supported
  // modules, in the best order. It is a small, cheap, near-zero-latency
  // decision — not creative copywriting.

  const eligibleModules = template.supportedModules.filter((moduleId) => {
    switch (moduleId) {
      case "gallery": return availableData.imageCount >= 3;
      case "masonry-work": return availableData.imageCount >= 4;
      case "before-after": return availableData.hasBeforeAfterPair; // NEVER true from stock
      case "class-schedule": return availableData.hasScheduleData;
      case "featured-property": return availableData.hasPropertyData;
      case "case-study-spotlight": return availableData.imageCount >= 1;
      // stats-strip, credentials-bar, faq-accordion, founder-split,
      // opening-hours-cta: always eligible (Gemini fills plausible content)
      default: return true;
    }
  });

  // If fewer than 1 eligible module remains, the template still renders
  // — it just runs a leaner section order. Never block generation on
  // module availability. See Graceful Degradation principle, Session
  // Prompt §4.
  return eligibleModules;
}
```

This confirms the principle from the Session Prompt: **module inclusion
is always data-driven, never random or purely stylistic**, and a module
never half-renders with insufficient data — it's either fully included
with real content, or excluded entirely.

---

## 3. THE EIGHT ARCHETYPE BRIEFS

Each brief below is the authoritative creative direction for that
archetype's 10 templates. Cursor must read the relevant brief before
generating any template in that category, in addition to the global
rules in §1 and the module whitelist in §2.3.

### 3.1 warm-sensory (Food / Restaurant / Bakery / Catering)

**Fonts**: Cormorant Garamond (headings, weight 600, large display scale)
+ Montserrat (body, weight 400/500).

**Personality**: Sensory warmth without cliché. Avoid the "rustic
chalkboard menu" trap entirely — this should feel like a restaurant a
design magazine would feature, not a generic food-blog template. Warm,
confident, a little indulgent.

**Palette temperature**: Warm neutrals (near-black-brown, cream, warm
white) with one bold warm accent (terracotta, burnt gold, deep amber) —
never more than one accent color per template.

**Motion**: Bold, appetite-driven — slightly faster than luxury/authority
archetypes, food photography deserves energetic reveals (scale-up on
image entrance, staggered menu-card reveals).

**Hero image/typography split**: 70% image-backed (food/restaurant
photography carries real weight here), 30% typography-only for templates
targeting a more minimalist fine-dining positioning.

**What makes this NOT generic**: real texture in the type system (large
Cormorant display numerals for menu prices, hairline rules between
courses), confident use of negative space around food photography rather
than cramming, and Montserrat kept restrained (never competing with the
Cormorant headlines for attention).

---

### 3.2 authority-minimal (Consultant / Lawyer / Accountant / Coach / Real Estate)

**Fonts**: Cormorant Garamond (headings, weight 500-600) + Tenor Sans
(body) — this replaces v1's Montserrat pairing; Tenor Sans's quiet
geometric character reads as more distinctly premium and less
"corporate-SaaS-default" than Montserrat at body size.

**Personality**: Understated confidence. The most restrained archetype
in the system — whitespace is the primary design tool, not color or
imagery. This is the flagship "Zuri DNA" category.

**Palette temperature**: Near-black or near-white base, ONE gold or
bronze accent used on 2-3 elements maximum per template (eyebrow text,
one underline, primary CTA).

**Motion**: Slow, elegant, longest transition durations in the system
(600-900ms). Nothing should ever feel urgent in this archetype.

**Hero image/typography split**: 55% typography-only (this archetype is
where confident type-only heroes work best and where a mediocre stock
"office" photo does the most damage), 45% image-backed for templates
using a founder portrait or workspace photo with genuine quality.

**What makes this NOT generic**: extreme restraint that never tips into
emptiness — every whitespace decision should feel deliberate. Use
Cormorant's italic weight for a distinctive wordmark treatment. Never use
generic "handshake" or "boardroom" stock imagery — if a template uses a
hero image, it should be a genuine environmental portrait, not a stock
cliché.

---

### 3.3 luxury-aspirational (Beauty / Spa / Salon / Fashion / Jewellery)

**Fonts**: Cormorant Garamond (headings, weight 400, light/elegant scale)
+ Marcellus (body) — Marcellus's slightly more decorative serif character
distinguishes this archetype's body text from authority-minimal's Tenor
Sans, while staying in the same elegant register.

**Personality**: Editorial fashion-magazine restraint, not "spa brochure"
softness. Confident, a little cool/aloof, aspirational rather than
merely pleasant.

**Palette temperature**: Deep charcoal/near-black OR blush-white
(archetype spans both dark and light comfortably), champagne-gold or
rose-gold accent, used with real restraint.

**Motion**: Slowest, most deliberate motion in the entire system —
matches authority-minimal's timing philosophy but with more graceful
easing curves (favor `power2.inOut` or similar in GSAP over linear/sharp
easing).

**Hero image/typography split**: 75% image-backed — this archetype
depends on strong photography more than any other; the small remainder
of typography-only templates should lean hard into Cormorant's light
weight at very large scale to compensate for the absence of imagery.

**What makes this NOT generic**: never default to "spa candle and stones"
stock imagery. Editorial portraiture, genuine texture (fabric, skin,
light) over prop photography. Before/After modules (when real data
exists) should be presented with a quiet, confident divider — not a
loud "TRANSFORMATION!" treatment.

---

### 3.4 editorial-bold (Retail / Streetwear / Creative Agency)

**Fonts**: Cinzel (hero display headlines ONLY, per §1.2's display-only
rule) + Poppins (body, headings below hero scale, UI chrome).

**Personality**: Confident, high-contrast, magazine-cover energy. This
is the one archetype explicitly permitted to feel loud — but loud
through typographic scale and color contrast, never through clutter.

**Palette temperature**: High contrast — true black or true white base,
one genuinely bold saturated accent (not a muted "safe" version of a
bold color).

**Motion**: Confident and quick, with real presence — scale-in reveals,
bold stagger, a signature marquee or clip-path moment is especially
well-suited to this archetype specifically (per §1.8's suggested motion
vocabulary).

**Hero image/typography split**: 50/50 — this archetype is genuinely
suited to both approaches; a huge Cinzel headline on a bold color field
can carry a hero as confidently as strong product/streetwear photography
can.

**What makes this NOT generic**: Cinzel at genuinely large scale
(nothing timid) paired with Poppins kept clean and unfussy underneath it
— the contrast between the two fonts' character IS the design signature
here. Avoid generic "urban grunge texture" clichés; let color and scale
do the bold work instead.

---

### 3.5 clean-modern (Tech / SaaS / Fintech / Logistics)

**Fonts**: Poppins (headings, weight 600) + Georgia (body) — this is a
deliberate, distinctive choice: pairing a geometric sans display font
with a classic serif body text breaks the "generic SaaS site" pattern
(which is almost always sans-on-sans) while staying completely legible
and professional. This is likely the single most differentiating font
decision in the whole system.

**Personality**: Precise, systematic, confident — but warmer and more
considered than typical fintech-template starkness, specifically because
of the Georgia body text softening what would otherwise read as cold.

**Palette temperature**: Cool neutrals (navy-black, cool white/gray), one
confident accent (blue-violet, deep teal) — restrained, not playful.

**Motion**: Crisp and fast (250-350ms), everything feels instant and
responsive — this archetype is the one place in the system where speed
of motion IS the brand message.

**Hero image/typography split**: 65% typography-only (gradient mesh
backgrounds, per v1's precedent, work well here and sidestep generic
"team at whiteboard" stock entirely), 35% image-backed for templates
using genuine product screenshots or team photography.

**What makes this NOT generic**: the Poppins/Georgia pairing itself is
the primary differentiator — resist the urge to default back to an
all-sans system just because "that's what tech sites look like." Gradient
mesh should feel considered (2-3 soft blobs, archetype accent color only,
low opacity) not like a leftover Webflow template default.

**Typography-only heroes still need a background photo**: even for the
65% typography-led split above, a pure flat-color background behind the
gradient mesh reads as empty/unfinished. Include a real photo from the
archetype's `hero/` stock folder as a low-opacity (≈20-25%) background
layer with a dark gradient overlay (fading to `--color-bg` top and
bottom) behind the mesh blobs — the mesh should remain the dominant
visual, with the photo providing subtle atmosphere/texture rather than
reading as a standard photo hero.

---

### 3.6 portfolio-dramatic (Photography / Videography / Music / Art)

**Fonts**: Bodoni Moda (hero display headlines ONLY, per §1.2's
display-only rule — its extreme stroke contrast is genuinely dramatic at
large scale) + Cormorant Infant (body, headings below hero scale).

**Personality**: Gallery-exhibition restraint — the work IS the design,
type gets out of the way except at the one moment (hero) where it needs
to command attention.

**Palette temperature**: True black or gallery-white, single
stark/minimal accent color — deliberately the most color-restrained
archetype alongside authority-minimal.

**Motion**: Slow, cinematic — images fade in with scale (1.05→1.0), long
duration, real patience in the pacing. This archetype should feel like
the slowest-paced browsing experience in the system, intentionally.

**Hero image/typography split**: 80% image-backed — the archetype
literally exists to showcase visual work, a typography-only hero here
should be rare and reserved specifically for a videographer/musician
template where a single still image can't represent motion/audio work
well.

**What makes this NOT generic**: Bodoni Moda's dramatic stroke contrast
used genuinely large (this is the one archetype where a hero headline
can be enormous and it still works), masonry-work module given real
asymmetric rhythm (not a uniform grid), Cormorant Infant kept quiet and
small in body contexts so it never competes with the imagery.

---

### 3.7 community-vibrant (Fitness / Gym / Sport / Wellness / Yoga)

**Fonts**: Poppins (headings, weight 700) + Montserrat (body, weight
400/500) — the one archetype using two geometric sans fonts together,
differentiated by weight contrast rather than character contrast, which
suits this archetype's energetic-but-still-premium brief.

**Personality**: Energetic and premium simultaneously — this is the
hardest balance in the system (per Decision 13 in the Session Prompt:
eliminate the "generic factor" even here). Not Nunito-rounded-bouncy
anymore. Confident, athletic, sharp.

**Palette temperature**: Either dark charcoal or bright white base, ONE
genuinely energetic accent (vibrant green, hot coral) used boldly but not
chaotically — still just one accent color, the energy comes from motion
and scale, not from color chaos.

**Motion**: Punchy and quick, slight bounce/overshoot easing
(`back.out` in GSAP) appropriate here specifically — this is the one
archetype where a little playful overshoot in the easing curve fits the
brand energy, unlike anywhere else in the system where restraint rules.

**Hero image/typography split**: 70% image-backed (genuine action
photography carries real energy), 30% typography-only for templates
positioned toward premium boutique fitness/wellness rather than
high-energy gym branding.

**What makes this NOT generic**: Poppins at real weight/scale
confidence rather than shrinking to feel "safe," the before-after module
(when real data exists) treated with athletic confidence rather than
either clinical or gimmicky framing, class-schedule module given genuine
typographic care (not an afterthought table).

---

### 3.8 trust-professional (Medical / Dental / Pharmacy / Real Estate — clinic-focused)

**Fonts**: Georgia (headings, weight 700) + Montserrat (body) — Georgia
at heading scale reads as credible and calm rather than sterile, a
deliberate contrast with the more common sans-only "medical SaaS" look.

**Personality**: Reassuring, credible, calm — never gimmicky, never
flashy. This archetype's premium feeling comes entirely from restraint
and precision, not from boldness.

**Palette temperature**: Clinical white or calm navy-charcoal, ONE
muted-but-confident accent (teal, deep blue) — never a "medical green,"
which reads as generic/dated.

**Motion**: Crisp and fast, minimal (250-300ms) — patients/clients want
calm, not flashy motion; this archetype has the most restrained
animation vocabulary in the system alongside clean-modern.

**Hero image/typography split**: 60% typography-only (a bad stock
"doctor smiling" photo does more brand damage here than almost anywhere
else in the system), 40% image-backed for templates using a genuine
practice/clinic environment photo or an authentic practitioner portrait.

**What makes this NOT generic**: Georgia's calm authority at heading
scale is the primary differentiator — resist defaulting to a sans-only
system here even though that's the near-universal pattern for this
category. Credentials-bar module should read as genuinely reassuring
(real specificity in the Gemini-generated trust markers, not generic
"Licensed & Accredited" boilerplate — push the copy prompt for
specificity).

---

## 4. FONT PAIRING SUMMARY TABLE (quick reference)

| Archetype | Headings | Body | Display-only accent |
|---|---|---|---|
| warm-sensory | Cormorant Garamond | Montserrat | — |
| authority-minimal | Cormorant Garamond | Tenor Sans | — |
| luxury-aspirational | Cormorant Garamond | Marcellus | — |
| editorial-bold | Poppins | Poppins | Cinzel (hero only) |
| clean-modern | Poppins | Georgia | — |
| portfolio-dramatic | Cormorant Infant | Cormorant Infant | Bodoni Moda (hero only) |
| community-vibrant | Poppins | Montserrat | — |
| trust-professional | Georgia | Montserrat | — |

Every one of the 9 approved fonts is used at least once. Cormorant
Garamond appears in 3 archetypes but is never paired identically (body
font differs each time), which is what keeps it from feeling repetitive
across the system despite the restricted palette — confirmed as the
deliberate mitigation for Decision 12 in the Session Prompt.

---

## 5. IMAGE SLOT DATA CONTRACT (per archetype, for template authors)

This table tells Cursor exactly which `data-image-slot` values a given
archetype's templates may use, matching 1:1 to the Cloudinary
`zuri-stock/{archetype}/{slot}/` folders that are already seeded (Session
Prompt §5).

| Archetype | Available slot types |
|---|---|
| warm-sensory | `hero`, `about`, `gallery_1`–`gallery_4`, `menu_item_1`–`menu_item_3` |
| authority-minimal | `hero`, `about`, `founder` |
| luxury-aspirational | `hero`, `about`, `before_1`–`before_3`, `after_1`–`after_3` (before/after only populate from real uploads — §5.3) |
| editorial-bold | `hero`, `about`, `gallery_1`–`gallery_4` |
| clean-modern | `hero` (optional — see §3.5 typography split), `about`, `team` |
| portfolio-dramatic | `hero`, `work_1`–`work_6`, `case_study` |
| community-vibrant | `hero`, `about`, `results_before_1`–`results_before_3`, `results_after_1`–`results_after_3` |
| trust-professional | `hero`, `about` (no stock imagery for `credential_icon` — see §5.4) |

### 5.1 Aspect ratio contract per slot

Enforced at the curation/upload stage (already true of the seeded
library), and assumed by every template's CSS:

| Slot type | Required source aspect | Served via transform |
|---|---|---|
| `hero` | ≥ 1600×900 (16:9 or wider) | `hero` |
| `about`, `founder`, `team` | ≥ 1200×1200 (crop-safe square) | `square` |
| `gallery_N`, `menu_item_N`, `work_N` | ≥ 1200×1200 | `square` or `card` per layout |
| `before_N` / `after_N`, `results_before_N` / `results_after_N` | ≥ 1200×1200 | `square` |
| `case_study` | ≥ 1600×900 | `hero` |

### 5.2 Fallback behavior (unchanged principle from `02_WEBSITE_BUILDER.md` §4.5)

`resolveTemplateImages()` must never leave a slot unfilled. If a
particular archetype/slot combination has zero rows in `category_images`
(a genuine possibility for thinly-populated folders), fall through to the
same-archetype `hero` or `about` fallback image before ever falling
through to a cross-archetype generic fallback — staying within the
correct visual world matters more than exact slot-type matching in a
worst-case scenario.

### 5.3 Before/After — hard exception to stock fallback

Confirmed from Session Prompt Decision 10: `before_N`/`after_N` and
`results_before_N`/`results_after_N` slots **never** pull from
`category_images`, regardless of fallback logic elsewhere. If
`onboarding_uploaded_images` has no real pair for this business, the
`before-after` module is excluded from that generation's module
selection entirely (§2.4) — the template's HTML for that module simply
isn't rendered, not filled with mismatched stock.

### 5.4 Credentials — never photography

`credential_icon` slots (trust-professional archetype) are rendered as
inline SVG badge/line icons authored directly in the template, never as
photographs. Cursor should design 4-6 simple, elegant line-icon SVGs
per template (shield, checkmark-circle, certificate, etc.) styled with
the archetype's accent color, rather than requesting a Cloudinary image
for this slot type at all.

---

## 6. FIELD LENGTH ENFORCEMENT (the "twice" in "enforced twice")

### 6.1 Prompt-level (Gemini Pro placeholder-filling call)

The `fillPlaceholders()` prompt (per `02_WEBSITE_BUILDER.md` §4.3) must
state every limit from §1.4 explicitly, and must disambiguate
`about_body`'s dual usage:

```
FIELD LENGTH LIMITS (hard requirements, not suggestions):
- tagline: maximum 8 words. This is a hero headline — it must read as a
  single confident line, never a sentence.
- about_body_short (used in hero subhead context): maximum 22 words.
- about_body_long (used in dedicated About section context): maximum 60
  words.
- service_N_name: maximum 5 words / 40 characters.
- service_N_description: maximum 12 words / 70 characters.
- testimonial_N_quote: maximum 30 words.
- testimonial_N_name: maximum 4 words.
- testimonial_N_role: maximum 6 words.
- Any category-specific field (credentials, schedule, property details):
  maximum 6 words.

If you cannot say something meaningful within these limits, say less —
brevity is the deliverable, not a constraint to work around.
```

Note the split of `about_body` into `about_body_short` and
`about_body_long` as two distinct placeholder keys — this replaces v1's
single overloaded `{{about_body}}` used at two different lengths in
different templates, which was itself part of why hero layouts broke.
Templates must use the correctly-scoped key for their context, never
reuse `about_body_long` in a hero subhead position.

### 6.2 Code-level (post-generation validation/truncation guard)

```typescript
// src/lib/website/validate-field-lengths.ts

const FIELD_LIMITS: Record<string, { maxWords?: number; maxChars?: number }> = {
  tagline: { maxWords: 8 },
  about_body_short: { maxWords: 22 },
  about_body_long: { maxWords: 60 },
  service_name: { maxWords: 5, maxChars: 40 },
  service_description: { maxWords: 12, maxChars: 70 },
  testimonial_quote: { maxWords: 30 },
  testimonial_name: { maxWords: 4 },
  testimonial_role: { maxWords: 6 },
};

function fieldKeyToLimitKey(fieldKey: string): string | null {
  // Maps "service_1_description" -> "service_description", etc.
  // "testimonial_2_quote" -> "testimonial_quote", etc.
  const match = fieldKey.match(/^(service|testimonial)_\d+_(name|description|quote|role)$/);
  if (match) return `${match[1]}_${match[2]}`;
  if (fieldKey in FIELD_LIMITS) return fieldKey;
  return null;
}

export function validateAndTruncateFields(
  fields: Record<string, string>
): { fields: Record<string, string>; truncated: string[] } {
  const truncated: string[] = [];
  const result = { ...fields };

  for (const [key, value] of Object.entries(fields)) {
    const limitKey = fieldKeyToLimitKey(key);
    if (!limitKey) continue;
    const limit = FIELD_LIMITS[limitKey];
    if (!limit) continue;

    let out = value;

    if (limit.maxWords) {
      const words = out.trim().split(/\s+/);
      if (words.length > limit.maxWords) {
        out = words.slice(0, limit.maxWords).join(" ");
        truncated.push(key);
      }
    }

    if (limit.maxChars && out.length > limit.maxChars) {
      out = out.slice(0, limit.maxChars).trim();
      truncated.push(key);
    }

    result[key] = out;
  }

  return { fields: result, truncated };
}
```

Called in the generation pipeline immediately after `fillPlaceholders()`
returns, before `applyPlaceholders()` writes the values into the HTML.
If any field required truncation, log it (same `needs_review` flag
pattern as `02_WEBSITE_BUILDER.md` §6) — a truncation happening at all
signals the prompt-level instruction was ignored and is worth knowing
about, even though the truncation itself keeps the site from breaking.

---

## 7. THE META-PROMPT SYSTEM (generating 10 templates per archetype via Cursor)

### 7.1 Why a meta-prompt instead of 80 hand-written prompts

Given the 10-per-archetype target (80 templates total), hand-writing each
prompt individually the way v1 did (24 full prompts) doesn't scale and
risks exactly the drift v1 already showed (fonts ignored, rules
inconsistently applied). Instead, Cursor is given **one master prompt
template** per archetype with a small set of variable slots, and
generates the 10 variants by varying those slots systematically.

### 7.2 Master prompt template (fill the bracketed variables per archetype
and per variant)

```
Generate a single-file HTML template for a premium [ARCHETYPE_BUSINESS_DESCRIPTION]
website called "[TEMPLATE_DISPLAY_NAME]."

You MUST read and follow TEMPLATE_PROMPTS_V2.md in full before generating this
file — every rule in §1 (Global Rules) is mandatory, not optional. Pay specific
attention to:
- §1.2: font restriction — ONLY [ARCHETYPE_HEADING_FONT] for headings and
  [ARCHETYPE_BODY_FONT] for body text[ARCHETYPE_DISPLAY_FONT_CLAUSE]. No other
  fonts, ever.
- §1.4: field length limits — hard caps, do not exceed them in any placeholder
  usage within the template's own hardcoded copy (nav labels, button text, etc.)
- §1.5: Cloudinary image contract — every <img> uses the exact URL pattern and
  data-image-slot attributes specified
- §1.7: exactly 4 responsive breakpoints (360px, 480px, 1024px, desktop),
  tested specifically at 360px for overflow
- §1.8: GSAP + ScrollTrigger animation, matching the [ARCHETYPE_NAME] motion
  spec: [ARCHETYPE_MOTION_DESCRIPTION]

STYLE for this specific variant:
- Mode: [MODE — dark or light]
- Hero treatment: [HERO_TYPE — image-backed or typography-only], per §1.6's
  recommended split for this archetype
- Palette: [SPECIFIC_HEX_VALUES — background, surface, text, text-muted, accent,
  accent-text — following the archetype's palette temperature described in
  TEMPLATE_PROMPTS_V2.md §3]
- Personality notes specific to this archetype: [PASTE THE FULL "Personality"
  and "What makes this NOT generic" paragraphs from the relevant §3 archetype
  brief]

MODULES for this variant (from the archetype's whitelist in §2.3):
Build real, working HTML/CSS for exactly these [2-4] modules: [MODULE_LIST].
Each module must be wrapped in a container with a data attribute
(data-module="gallery" etc.) and structured so the generation pipeline's
module-selector (§2.4) can determine at runtime whether this module has
enough backing data to render — do NOT hardcode assumptions about data
existing; every module must degrade gracefully if its data-image-slots
receive no image at all (though in practice the pipeline guarantees a slot
is only included in the template's rendered output when the module was
selected — build the module as if it will always have real data, since
selection already happened before this HTML is filled).

SECTION ORDER for this variant:
Nav → Hero → [MODULE_1] → [MODULE_2] → [MODULE_3, if applicable] →
Testimonials → Contact → Footer, WhatsApp float persisting throughout.

Follow ALL rules in TEMPLATE_PROMPTS_V2.md §1 exactly, in addition to
everything specified above. Output only the HTML file, no explanation.
```

### 7.3 Variant matrix — how to derive 10 distinct fills per archetype

For each archetype, Cursor should generate 10 variants by systematically
varying:

| Variant axis | Options | How many of the 10 |
|---|---|---|
| Mode | Dark, Light | Roughly 6 dark / 4 light for most archetypes (adjust per archetype's stated preference in v1's original distribution table where still sensible — e.g. trust-professional should skew light) |
| Hero treatment | Image-backed, Typography-only | Per the archetype's specific split ratio stated in its §3 brief |
| Module combination | 2-4 modules from the archetype's whitelist | Ensure no two variants use the identical module set/order — this is the primary mechanism preventing within-category sameness |
| Accent color (within palette temperature) | 2-3 hex variations of the archetype's accent family | Small but real variation — e.g. warm-sensory might rotate between terracotta, burnt gold, and deep amber across its 10 |

Cursor should produce a **short variant plan table** (archetype, mode,
hero type, module set, accent hex) before generating any HTML, so the 10
templates are deliberately differentiated rather than accidentally
similar — review this table before proceeding to full generation.

### 7.4 Generation checklist per template (replaces v1's single checklist,
now more rigorous)

- [ ] Only the archetype's assigned fonts appear anywhere in the file —
      grep the output for any Google Fonts `<link>` referencing a font
      not in the approved list of 9
- [ ] Cinzel/Bodoni Moda (where used) appear ONLY in hero headline or
      wordmark contexts, never body/nav/card text
- [ ] All service/testimonial/tagline/about_body placeholder usages
      respect the §1.4 word/character limits in the surrounding HTML
      structure (i.e. the CSS won't break even at the maximum allowed
      length — test mentally against the longest permitted value, not
      just a short example)
- [ ] `about_body_short` and `about_body_long` used in their correct,
      distinct contexts — never the same key reused at two different
      intended lengths
- [ ] Every `<img>` uses the exact Cloudinary URL pattern from §1.5, with
      the correct named transform for its slot type per §5.1
- [ ] `before_N`/`after_N`/`results_before_N`/`results_after_N` slots (if
      this archetype/template includes that module) are structurally
      present but the template makes no visual assumption they'll always
      be filled from stock — confirmed this module is only ever
      data-driven per §5.3
- [ ] 4 responsive breakpoints implemented exactly as specified in §1.7,
      specifically verified at 360px for overflow/clipping
- [ ] GSAP + ScrollTrigger loaded via CDN, hero entrance choreography
      present, at least one signature motion moment present, timing
      matches the archetype's motion spec from §3, `prefers-reduced-motion`
      respected
- [ ] 6 service card slots present, 4-6 hidden by default (unchanged
      mechanic from v1)
- [ ] WhatsApp float present with the exact conditional-hide script
      (unchanged from v1)
- [ ] Module selection matches this variant's planned module set from
      the variant plan table (§7.3) — no silent drift during generation
- [ ] No lorem ipsum, no real business names, only `{{placeholders}}` and
      generic structural labels
- [ ] File is self-contained, opens correctly standalone, zero console
      errors

### 7.5 Template metadata (accompanies each generated .html file)

Same `TemplateMetadata` shape as `02_WEBSITE_BUILDER.md` §3.1, with one
addition:

```typescript
interface TemplateMetadata {
  template_id: string;
  archetype: DesignArchetype;
  mode: "dark" | "light";
  hero_type: "image" | "typography";  // NEW
  supportedModules: string[];          // NEW — the 2-4 modules this specific
                                        // template has real HTML for, matches
                                        // §2.4's module-selector logic
  lean: "international" | "african";
  display_name: string;
  storage_path: string;
  color_themes: [ColorTheme, ColorTheme, ColorTheme];
  placeholder_fields: string[];
  image_slots: string[];
  has_unique_section: boolean;
  unique_section_name?: string;
}
```

---

## 8. GENERATION PIPELINE INTEGRATION NOTES (for `02_WEBSITE_BUILDER.md`)

These are the specific points where the existing pipeline (§4 of
`02_WEBSITE_BUILDER.md`) needs to change to consume V2 templates and V2
onboarding data. Flag these as required updates when next working in that
document:

1. **Stage 2 (`selectTemplate`)** must now also call `selectModules()`
   (§2.4 above) in the same Gemini Flash round-trip — combine into one
   call that returns both `template_id` and `selected_modules` to avoid
   a second API round-trip.
2. **Stage 4 (`fillPlaceholders`)** prompt must be rewritten to: (a) read
   `services` as `ServiceEntry[]` objects (name + description) instead of
   a flat string array, (b) request `about_body_short` and
   `about_body_long` as two distinct keys, (c) include the full field
   length instruction block from §6.1 above.
3. **New stage, immediately after Stage 4**: call
   `validateAndTruncateFields()` (§6.2) before proceeding to image
   resolution.
4. **Stage 5 (`resolveTemplateImages`)** must implement the
   before/after hard exception (§5.3) and the same-archetype-first
   fallback rule (§5.2), and must read from `onboarding_uploaded_images`
   / migrated `website_images` first before falling through to
   `category_images` stock.
5. **`applyServiceCardVisibility`** logic is unchanged in mechanism but
   now checks `service_N_name` (not `service_N_title`) for the renamed
   placeholder key.

---

## 9. IMPLEMENTATION ORDER

1. Confirm the 9-font Google Fonts `<link>` set and GSAP CDN URLs are
   finalized and identical across every template (no per-template
   variation in the loading mechanism itself)
2. Build the module HTML/CSS library as reusable reference snippets (11
   modules per §2.2) — Cursor should draft these once, well, and reuse
   the patterns across every template that includes that module, rather
   than reinventing each module's markup 80 times
3. Generate the archetype §3 briefs' variant plan tables (§7.3) for all 8
   archetypes before generating any actual HTML — review these 8 tables
   for genuine variation before proceeding
4. Generate templates archetype-by-archetype, 10 at a time, running the
   §7.4 checklist against each before moving to the next
5. Update `templates` DB table schema for the new `TemplateMetadata`
   fields (`hero_type`, `supportedModules`)
6. Implement `src/lib/website/module-selector.ts` (§2.4)
7. Implement `src/lib/website/validate-field-lengths.ts` (§6.2)
8. Apply the five pipeline integration changes from §8 above to the
   existing `02_WEBSITE_BUILDER.md` generation pipeline code
9. Seed/verify `category_images` folder coverage is sufficient for every
   `image_slots` value declared across all 80 templates' metadata — flag
   any archetype/slot combination with fewer than ~8 curated images as
   needing more sourcing before launch
