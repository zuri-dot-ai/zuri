# ZURI — TEMPLATE_PROMPTS.md
# 24 production-ready HTML template generation prompts for Claude Sonnet
# 8 business categories x 3 templates each (Dark/Dark/Light per the agreed distribution)
# These are STATIC HTML templates (Handlebars-style {{placeholders}}) — the manual
# template library, distinct from (but sharing DNA with) the AI composition pipeline
# in 02_WEBSITE_BUILDER.md. Used for the Template Admin system.

---

## GLOBAL RULES (apply to every single prompt below — do not restate per-prompt, but Sonnet must follow all of these for every template)

1. **Output**: a single self-contained `.html` file. Inline `<style>` in `<head>`. Vanilla JS only, inline `<script>` before `</body>`. No build step, no external JS frameworks. Google Fonts via `<link>`. No other external dependencies except font CDN and placeholder images.
2. **Placeholder syntax**: `{{business_name}}`, `{{tagline}}`, `{{about_body}}`, `{{service_1_title}}`, `{{service_1_description}}` (through `_3`, with `_4`–`_6` present but wrapped in elements with `data-optional="true"` and `hidden` by default — see rule 6), `{{testimonial_1_quote}}`, `{{testimonial_1_name}}`, `{{testimonial_1_role}}` (x3), `{{phone_number}}`, `{{email_address}}`, `{{whatsapp_number}}`, `{{instagram_url}}`, `{{address}}`, `{{logo_url}}` is NOT used — business name is always styled text, never an image slot.
3. **Images**: every image tag uses `https://picsum.photos/[width]/[height]?random=[unique_int]` as the placeholder src, with a `data-image-slot="hero|about|gallery_1|..."` attribute so the editor can target and replace it later. Never use `{{image_url}}` template syntax for images — use the picsum URL directly plus the data attribute.
4. **Service cards**: always render exactly 6 card slots in the DOM. Cards 1–3 are visible by default. Cards 4–6 have `hidden data-optional-slot="4"` (etc.) and a small inline script that does nothing on load (visibility is toggled later by the editor, not by this template) — just make sure cards 4–6 are structurally identical to 1–3 so no CSS breaks when they're revealed.
5. **WhatsApp button**: floating button, bottom-right, fixed position, all templates. Wrap it in `<div id="whatsapp-float" data-whatsapp-number="{{whatsapp_number}}">`. Include this exact inline script at the end of body:
   ```html
   <script>
     (function(){
       var el = document.getElementById('whatsapp-float');
       var num = el.getAttribute('data-whatsapp-number');
       if (!num || num.trim() === '' || num.indexOf('{{') === 0) { el.remove(); }
       else { el.querySelector('a').href = 'https://wa.me/' + num.replace(/[^0-9]/g,''); }
     })();
   </script>
   ```
6. **Responsive**: 3 breakpoints — mobile ≤380px, larger phones 381-480px, tablet 481–1024px, desktop ≥1025px. Mobile-first CSS.
7. **Navigation**: sticky/fixed top on scroll, transparent-over-hero → solid-on-scroll (via scroll listener toggling a `.scrolled` class), hamburger menu on mobile/tablet that slides in as a drawer from the right. Business name as styled text logo (font per archetype), never an image.
8. **Animations**: use IntersectionObserver + CSS classes (`.reveal`, `.reveal.active`) for scroll-triggered reveals — no animation libraries. Subtle = opacity/translateY(20px) fade. Medium = staggered children with `transition-delay`, plus subtle slide-from-side on alternating sections.
9. **Testimonials**: quote + name + role only. No star ratings, no avatar images.
10. **Contact section**: simple form (name, email, message — no backend wiring needed, just markup with a `<form id="contact-form">` and a JS handler that shows a static "Message sent" state on submit, no actual POST).
11. **Footer**: business name, tagline, social links (Instagram via `{{instagram_url}}`, wrapped the same optional-hide way as WhatsApp if empty), small "Powered by Zuri" text link bottom center, muted/small.
12. **Accessibility**: semantic HTML5 landmarks, alt text on all images using the relevant placeholder text, sufficient color contrast (4.5:1 minimum body text), visible focus states.
13. **CSS variables**: define all colors as CSS custom properties on `:root` so the editor can theme-swap later — `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-accent-text` (text color to use ON the accent, for contrast).
14. **Section order flexibility is per-template** (already varies below) — but always: Nav → Hero → [category-specific + about/services in whatever order fits] → Testimonials → Contact → Footer, with WhatsApp float persisting throughout.

---

## CATEGORY 1 — WARM & SENSORY (Food / Restaurant / Bakery / Catering)

**Archetype base**: fonts Playfair Display (headings) + Lato (body). Warm palette, bold accent. Unique section: **Opening Hours strip + Order/Reserve CTA bar**, placed directly under Hero.

### Template 1.1 — Dark, International-Premium
```
Generate a single-file HTML template for a premium restaurant/food business website called "Restaurant Dark Editorial."

STYLE: Dark mode. Background near-black (#0F0D0B), warm gold accent (#C9A24C), off-white text (#F2EDE6), muted warm gray for secondary text (#A89E92). Fonts: Playfair Display (700, headings, large scale) + Lato (400, body). International-premium feel — think a Michelin-guide restaurant site, zero cultural imagery markers, extreme restraint, Linear.app-level whitespace discipline with luxury editorial warmth layered on top.

ANIMATIONS: Medium — staggered fade+slide-up on scroll, hero text types in subtly or fades in with a slight delay cascade between headline/subhead/CTA.

SECTIONS (in order):
1. Nav: fixed/sticky, transparent over hero → solid dark on scroll. Logo = {{business_name}} in Playfair Display italic. Links: Menu, About, Gallery, Contact. Hamburger drawer on mobile.
2. Hero: full-bleed background image (picsum placeholder, data-image-slot="hero"), dark overlay gradient, centered content: eyebrow small-caps gold text "{{tagline}}", huge Playfair headline "{{business_name}}", subhead paragraph, two CTAs (gold filled "Reserve a Table" + thin-outline "View Menu").
3. Opening Hours + Reserve strip: horizontal bar directly below hero, dark surface color, left side shows {{opening_hours}} placeholder text, right side a gold "Order / Reserve" button linking to #contact.
4. About: two-column, image left (data-image-slot="about") / text right, headline + {{about_body}}, founder name/title optional line.
5. Menu Preview / Services: "ServicesCardGrid" pattern — headline + subheadline, 6-card grid (3 visible) using {{service_N_title}} / {{service_N_description}}, styled as menu category cards.
6. Gallery: 4-image grid, picsum placeholders, subtle hover zoom.
7. Testimonials: quote+name+role carousel, 3 slides, auto-rotate + manual arrows.
8. Contact: split layout — form left, {{address}}/{{phone_number}}/{{email_address}} + embedded map placeholder (styled div, no real map) right.
9. Footer + WhatsApp float per global rules.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 1.2 — Dark, African-Premium
```
Generate a single-file HTML template for a premium restaurant/food business website called "Restaurant Dark Heritage."

STYLE: Dark mode. Background warm near-black (#150F0A), rich terracotta/gold accent (#D08A3E), warm cream text (#F5EAD9). Fonts: Playfair Display + Lato. African-premium direction — subtle mudcloth/kente-inspired geometric line pattern used ONLY as a low-opacity accent behind the About section (pure CSS pattern, not an image), warm earth-tone palette throughout, imagery keywords should evoke African culinary warmth. Do not overdo it — restraint is still premium.

ANIMATIONS: Subtle — clean fade+translateY(20px) on scroll reveal, no staggering needed beyond simple sequential delay on hero elements.

SECTIONS (in order): identical structural pattern to Template 1.1 (Nav → Hero → Opening Hours/Reserve strip → About → Menu Preview grid → Gallery → Testimonials → Contact → Footer), but:
- Hero CTA copy leans warmer: "Reserve Your Table" + "Explore Our Menu"
- About section background includes the subtle geometric pattern described above
- Gallery uses a 2x3 grid instead of a straight 4-grid, one image spanning 2 columns for visual rhythm

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 1.3 — Light
```
Generate a single-file HTML template for a premium restaurant/food business website called "Restaurant Light Airy."

STYLE: Light mode. Background warm off-white (#FBF7F0), text near-black warm gray (#2A241C), accent deep gold/amber (#B8823A) used sparingly, surface color soft cream (#F2E9DA) for card backgrounds. Fonts: Playfair Display + Lato. Airy, sunlit, café-bright feel — generous negative space, thin hairline dividers instead of heavy borders.

ANIMATIONS: Subtle fade+slide-up.

SECTIONS: same structural pattern as 1.1/1.2 (Nav → Hero → Opening Hours/Reserve strip → About → Menu Preview grid → Gallery → Testimonials → Contact → Footer). Hero uses a lighter overlay (rgba(0,0,0,0.25)) so the image reads brighter. Cards throughout use soft drop shadows instead of borders to separate from the light background.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

---

## CATEGORY 2 — AUTHORITY & MINIMAL (Consultant / Lawyer / Accountant / Coach / Real Estate)

**Archetype base**: fonts Cormorant Garamond (headings) + Montserrat (body) — this is the exact Zuri landing-page pairing, so these templates should feel closest to the Zuri DNA. Subtle accent, dark bg preferred. Unique section for the real-estate-flavored template (2.3): **Featured Property cards** (2 properties, image + price + location) replacing the generic services grid.

### Template 2.1 — Dark, International-Premium (Consultant/Coach)
```
Generate a single-file HTML template for a premium consulting/professional-services website called "Authority Dark Minimal."

STYLE: Dark mode, near-black background (#0A0806), gold accent (#C9A84C) used surgically on 2-3 elements only (eyebrow text, primary CTA, one underline detail), off-white text (#F5F0E8), muted gray secondary text. Fonts: Cormorant Garamond (large elegant headings, weight 600) + Montserrat (body, weight 400). This is the flagship Zuri-DNA template — extreme whitespace, Linear.app discipline meets luxury editorial. Eyebrow text: small caps, gold, wide letter-spacing (e.g. "STRATEGY · ADVISORY").

ANIMATIONS: Subtle only — slow, elegant fades, longer transition durations (600-800ms), no bold movement.

SECTIONS (in order):
1. Nav: fixed, transparent-to-solid on scroll, {{business_name}} in Cormorant italic, links About/Services/Contact, thin-outline "Book a Consultation" button in nav itself.
2. Hero: HeroTypographic style — no hero image, just a huge Cormorant headline "{{tagline}}", gold eyebrow above it, Montserrat subhead paragraph below, two-button CTA pattern (gold filled primary "Book a Consultation" + thin-outline secondary "Learn More").
3. About/Mission: centered, headline + {{about_body}} mission statement, generous line-height and max-width for readability.
4. Services: ServicesListElegant pattern — vertical list (not cards), 6 slots (3 visible), each with a thin gold rule above the title, {{service_N_title}} + {{service_N_description}}.
5. About Stats (optional but include): 3-4 stat blocks, {{stat_1_value}}/{{stat_1_label}} pattern, large Cormorant numerals.
6. Testimonials: quote+name+role, single large quote at a time, elegant fade transition between them, manual arrows only (no autoplay).
7. Contact: centered single-column form + contact details below it, no map.
8. Footer + WhatsApp float.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 2.2 — Dark, African-Premium (Legal/Financial Advisory)
```
Generate a single-file HTML template for a premium consulting/legal/financial advisory website called "Authority Dark Heritage."

STYLE: Same dark near-black base (#0A0806) and gold accent (#C9A84C) as Template 2.1, Cormorant Garamond + Montserrat. African-premium lean: a subtle thin gold geometric border pattern (pure CSS, low opacity) framing the About section image, otherwise restrained — this category should read as understated, not decorative.

ANIMATIONS: Subtle, same as 2.1.

SECTIONS: identical structure to 2.1 (Nav → Hero → About/Mission → Services list → Stats → Testimonials → Contact → Footer), but About section includes an image (data-image-slot="about") with the subtle framing pattern, positioned split-layout instead of centered-text-only.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 2.3 — Light (Real Estate)
```
Generate a single-file HTML template for a premium real estate/property advisory website called "Authority Light Real Estate."

STYLE: Light mode, warm white background (#FAF8F5), near-black text (#1C1A17), gold/bronze accent (#A87B3F) used sparingly, soft card surface (#F0ECE4). Fonts: Cormorant Garamond + Montserrat. Credible, high-trust feel appropriate for real estate — crisp, airy, confident.

ANIMATIONS: Subtle, crisp_modern feel (shorter transitions than 2.1/2.2, ~300-400ms, no slow elegance — real estate buyers want speed and clarity).

SECTIONS (in order):
1. Nav: same pattern, light solid-on-scroll state.
2. Hero: HeroSplit — headline + subhead + CTA left, large property image right (data-image-slot="hero").
3. About/Mission: brief agency intro.
4. **Featured Properties** (replaces generic services grid): 2 large property cards side by side, each with image (data-image-slot="property_1"/"property_2"), {{property_1_title}}, {{property_1_price}}, {{property_1_location}}, "View Details" link. Mobile: stack vertically.
5. Services list (secondary, smaller): the 6-slot ServicesListElegant pattern for "Buying", "Selling", "Advisory" etc.
6. Testimonials.
7. Contact: form + {{address}}/{{phone_number}}/{{email_address}}.
8. Footer + WhatsApp float.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

---

## CATEGORY 3 — LUXURY & ASPIRATIONAL (Beauty / Spa / Salon / Fashion / Jewellery)

**Archetype base**: fonts Cormorant Garamond (headings) + Raleway (body). Dark-leaning, subtle accent, luxurious tone. Unique section: **Before/After transformation row** (2 image-pair slots).

### Template 3.1 — Dark, International-Premium
```
Generate a single-file HTML template for a premium beauty/spa/salon website called "Luxury Dark Editorial."

STYLE: Dark mode, deep charcoal-black background (#12100E), champagne-gold accent (#D4B678), soft ivory text (#F3EEE6). Fonts: Cormorant Garamond (light/elegant weight 400 for large display headings) + Raleway (light weight 300 for body — very refined, spa-like). International-premium, editorial-fashion-magazine feel.

ANIMATIONS: Subtle, slow elegant fades, generous timing.

SECTIONS (in order):
1. Nav: fixed, {{business_name}} in Cormorant, links Services/About/Gallery/Contact.
2. Hero: HeroFullscreen with full-bleed image (data-image-slot="hero"), soft dark overlay, centered refined headline "{{tagline}}", subhead, two-button CTA "Book Your Experience" / "Explore Services".
3. About/Founder: split layout, image (data-image-slot="about") + founder story {{about_body}}, {{founder_name}}/{{founder_title}}.
4. **Before/After row**: section headline, 3 paired before/after image sets side by side (6 image slots total: before_1/after_1 through before_3/after_3), each pair shown as two adjacent images with a thin center divider line, small caption beneath.
5. Services: ServicesCardGrid, 6 slots (3 visible), elegant minimal cards (no heavy borders, just spacing + thin top rule).
6. Testimonials: quote+name+role carousel.
7. Contact: centered form, {{phone_number}}, {{address}}.
8. Footer + WhatsApp float.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 3.2 — Dark, African-Premium
```
Generate a single-file HTML template for a premium beauty/salon/fashion website called "Luxury Dark Heritage."

STYLE: Same base as 3.1 (#12100E background, #D4B678 champagne-gold accent, Cormorant Garamond + Raleway) but African-premium lean: warm terracotta undertone shift in the palette (#D4A574 as a secondary warm accent alongside the gold), a subtle woven-pattern texture (pure CSS, very low opacity) as a background treatment behind the Before/After section only.

ANIMATIONS: Subtle, slow elegant fades, generous timing.

SECTIONS: identical structure to 3.1 (Nav → Hero → About/Founder → Before/After row → Services → Testimonials → Contact → Footer) with the pattern treatment noted above.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 3.3 — Light
```
Generate a single-file HTML template for a premium beauty/spa/salon website called "Luxury Light Airy."

STYLE: Light mode, blush-white background (#FBF6F3), warm rose-gold accent (#C79A82), near-black warm text (#2B2622). Fonts: Cormorant Garamond + Raleway. Soft, dreamy spa-editorial feel — pastel undertones, extreme whitespace.

ANIMATIONS: Subtle fades.

SECTIONS: same structure as 3.1/3.2 (Nav → Hero → About/Founder → Before/After row → Services → Testimonials → Contact → Footer). Hero overlay lighter for brightness. Before/After section uses soft shadow cards instead of dark dividers.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

---

## CATEGORY 4 — EDITORIAL & BOLD (Retail / Streetwear / Creative Agency)

**Archetype base**: fonts Bebas Neue (headings) + DM Sans (body). Bold accent, dark bg. No unique category section — generic but styled with maximum visual impact.

### Template 4.1 — Dark, International-Premium
```
Generate a single-file HTML template for a bold retail/streetwear/agency website called "Editorial Dark Bold."

STYLE: Dark mode, true black background (#0A0A0A), electric accent color (#E8542A burnt-orange, high contrast bold choice), white text. Fonts: Bebas Neue (huge condensed display headings, weight 400, uppercase, tight letter-spacing) + DM Sans (body, weight 400). International-premium streetwear/agency energy — think a bold fashion drop site. Large type, high contrast, confident.

ANIMATIONS: Medium-to-bold — hero elements slide in from sides with stagger, section headlines scale in slightly (transform: scale(0.95) to scale(1)) as they enter viewport.

SECTIONS (in order):
1. Nav: fixed, bold uppercase {{business_name}} wordmark, minimal links, solid black on scroll.
2. Hero: HeroSplit — massive uppercase Bebas headline left ("{{tagline}}"), large image right (data-image-slot="hero"), single bold CTA "Work With Us" / "Shop Now" depending on tone (use generic "{{cta_primary_text}}" as placeholder text defaulting to "Get Started").
3. About/Founder: bold pull-quote style intro, {{about_body}}, image (data-image-slot="about").
4. Services/Work: ServicesCardGrid, 6 slots (3 visible), high-contrast cards with thick accent-colored top border on hover.
5. Gallery: full-bleed alternating large/small image grid (data-image-slot="gallery_1" through "gallery_4"), bold hover states (color overlay wipe).
6. Testimonials: quote+name+role, bold oversized quote marks as decorative element.
7. Contact: split, form + bold CTA statement.
8. Footer + WhatsApp float.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 4.2 — Dark, African-Premium
```
Generate a single-file HTML template for a bold retail/streetwear/agency website called "Editorial Dark Culture."

STYLE: Same bold base as 4.1 (#0A0A0A background, #E8542A accent, Bebas Neue + DM Sans) but African-premium lean: bold reference to Lagos/Nigerian street culture in copy tone and a secondary accent stripe pattern (thick diagonal color-blocked stripe, pure CSS, used once as a section divider between Services and Gallery) evoking Ankara-inspired geometric energy without being literal/decorative overload.

ANIMATIONS: Bold — same staggered slide-in as 4.1, Medium-to-bold — hero elements slide in from sides with stagger, section headlines scale in slightly (transform: scale(0.95) to scale(1)) as they enter viewport plus the diagonal stripe divider animates in with a wipe transition.

SECTIONS: identical structure to 4.1 (Nav → Hero → About → Services/Work grid → [diagonal stripe divider] → Gallery → Testimonials → Contact → Footer).

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 4.3 — Light
```
Generate a single-file HTML template for a bold retail/creative-agency website called "Editorial Light Bold."

STYLE: Light mode, stark white background (#FFFFFF), same electric burnt-orange accent (#E8542A) for high contrast pop against white, near-black text (#111111). Fonts: Bebas Neue + DM Sans. Bold-on-white gives a gallery/magazine feel rather than streetwear-dark — still confident and high-contrast, just inverted.

ANIMATIONS: Medium, same stagger pattern as 4.1( Medium-to-bold — hero elements slide in from sides with stagger, section headlines scale in slightly (transform: scale(0.95) to scale(1)) as they enter viewport) but slightly faster (crisp on white).

SECTIONS: same structure as 4.1/4.2 (Nav → Hero → About → Services/Work grid → Gallery → Testimonials → Contact → Footer), cards use bold accent-colored borders instead of dark backgrounds to keep contrast on white.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

---

## CATEGORY 5 — CLEAN & MODERN (Tech / SaaS / Fintech / Logistics)

**Archetype base**: fonts Inter (headings) + Inter (body). Minimal accent, dark bg preferred. No unique category section.

### Template 5.1 — Dark, International-Premium
```
Generate a single-file HTML template for a tech/SaaS/fintech website called "Clean Dark Modern."

STYLE: Dark mode, deep navy-black background (#0B0E14), electric blue-violet accent (#5B6FED), off-white text (#EDEFF5). Fonts: Inter throughout (700 for headings, 400 for body) — crisp, systematic, product-site feel. Minimal accent usage, lots of subtle gradient mesh backgrounds (pure CSS radial-gradient blobs, low opacity) behind the hero.

ANIMATIONS: Crisp/modern — fast fades (250-350ms), no dramatic movement, everything feels instant and responsive.

SECTIONS (in order):
1. Nav: fixed, solid on scroll, {{business_name}} wordmark in Inter bold, links, single accent CTA button "Get Started".
2. Hero: HeroGradient — no image, CSS gradient mesh background, headline "{{tagline}}", subhead, two-button CTA (filled + outline).
3. About/Stats: AboutStats pattern — headline + 3-4 stat blocks ({{stat_1_value}}/{{stat_1_label}}), clean grid.
4. Services: ServicesCardGrid, 6 slots (3 visible), icon placeholder (simple SVG circle) above each title, minimal card style with hairline border.
5. Testimonials: quote+name+role, simple grid of 3 (not carousel — static grid feels more "product-credible").
6. FAQ Accordion (include this — fits the category well): 4-5 Q&A pairs, {{faq_1_question}}/{{faq_1_answer}} pattern, expand/collapse via JS.
7. Contact: simple centered form, "Get Started" framing.
8. Footer + WhatsApp float.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 5.2 — Dark, African-Premium
```
Generate a single-file HTML template for a tech/fintech/logistics website called "Clean Dark Emerging."

STYLE: Same dark navy base as 5.1 (#0B0E14, #5B6FED accent, Inter) but African-premium lean: copy tone and image query keywords oriented toward "African tech / Lagos startup," plus a secondary warm accent (#E8A33D amber) used once as a highlight color in the Stats section only, nodding to the energy of the African tech scene without literal cultural motifs (this category stays internationally legible — the lean here is subtle, mostly in copy/imagery, not ornamentation).

ANIMATIONS: Crisp/modern, same as 5.1(Crisp/modern — fast fades (250-350ms), no dramatic movement, everything feels instant and responsive.).

SECTIONS: identical structure to 5.1 (Nav → Hero → About/Stats → Services → Testimonials → FAQ → Contact → Footer).

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 5.3 — Light
```
Generate a single-file HTML template for a tech/SaaS website called "Clean Light Modern."

STYLE: Light mode, near-white background (#F7F8FA), same blue-violet accent (#5B6FED), near-black text (#14171F). Fonts: Inter. Crisp product-site feel, subtle light gradient mesh in hero (soft pastel blobs).

ANIMATIONS: Crisp/modern, fast.

SECTIONS: same structure as 5.1/5.2 (Nav → Hero → About/Stats → Services → Testimonials → FAQ → Contact → Footer). Cards use soft shadow instead of border for separation on light background.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

---

## CATEGORY 6 — PORTFOLIO & DRAMATIC (Photography / Videography / Music / Art)

**Archetype base**: fonts Fraunces (headings) + Work Sans (body). Bold accent, dark bg. Unique section: **Full-width masonry work showcase grid** (6 image slots), functions as this category's Case Study spotlight.

### Template 6.1 — Dark, International-Premium
```
Generate a single-file HTML template for a photographer/videographer/artist portfolio website called "Portfolio Dark Dramatic."

STYLE: Dark mode, true black background (#000000), single stark white/silver accent (#E5E5E0) — deliberately minimal-color, letting imagery carry the drama. Fonts: Fraunces (large serif display headings with high contrast strokes, weight 600) + Work Sans (body, weight 400). Gallery-exhibition feel — the work IS the design.

ANIMATIONS: Slow, elegant — images fade in with a slight scale-up (1.05 to 1.0) as they enter viewport, very cinematic pacing.

SECTIONS (in order):
1. Nav: minimal, transparent always except a thin bottom border, {{business_name}} small and understated top-left, links top-right.
2. Hero: HeroFullscreen, full-bleed dramatic image (data-image-slot="hero"), minimal text overlay — just {{business_name}} and a one-line {{tagline}}, no CTA button in hero itself (scroll-cue arrow instead).
3. **Full-width masonry work grid**: the centerpiece section. Headline "Selected Work". 6 images (data-image-slot="work_1" through "work_6") in an asymmetric masonry layout (CSS grid with varying row-spans), each with a hover overlay showing a project title {{work_N_title}}.
4. About/Founder: split layout, {{about_body}}, portrait image (data-image-slot="about").
5. Case Study Spotlight (in addition to the grid): one large featured project — {{case_study_headline}}, {{case_study_body}}, {{case_study_result}}, single large image (data-image-slot="case_study"), "View Project" CTA.
6. Testimonials: single large quote, minimal, elegant fade transitions between 3 slides.
7. Contact: minimal centered "Start a Project" heading + simple form.
8. Footer + WhatsApp float.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 6.2 — Dark, African-Premium
```
Generate a single-file HTML template for a photographer/artist/creative portfolio website called "Portfolio Dark Expression."

STYLE: Same true-black base as 6.1 but African-premium lean via a warm accent shift (#D4915A copper instead of silver), image query/copy keywords oriented toward African creative/art/Lagos photography scene, and the masonry grid section given a subtle warm-toned border treatment on hover instead of plain white.

ANIMATIONS: Same slow elegant fade+scale as 6.1.

SECTIONS: identical structure to 6.1 (Nav → Hero → Masonry work grid → About/Founder → Case Study Spotlight → Testimonials → Contact → Footer).

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 6.3 — Light
```
Generate a single-file HTML template for a photographer/artist portfolio website called "Portfolio Light Gallery."

STYLE: Light mode, gallery-white background (#FAFAF8), near-black text (#161513), single muted accent (#8A7A6B warm taupe) used minimally. Fonts: Fraunces + Work Sans. Museum/white-cube gallery feel.

ANIMATIONS: Slow elegant fade, same pacing as 6.1/6.2.

SECTIONS: same structure as 6.1/6.2 (Nav → Hero → Masonry work grid → About/Founder → Case Study Spotlight → Testimonials → Contact → Footer). Masonry grid images get a subtle drop shadow to lift off the white background.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

---

## CATEGORY 7 — COMMUNITY & VIBRANT (Fitness / Gym / Sport / Wellness / Yoga)

**Archetype base**: fonts Nunito (headings) + Nunito (body). Bold accent, either bg. Unique section: **Results Transformation row + Class Schedule strip.**

### Template 7.1 — Dark, International-Premium
```
Generate a single-file HTML template for a fitness/gym/wellness website called "Community Dark Energy."

STYLE: Dark mode, deep charcoal background (#121212), high-energy accent color (#39D98A vibrant green, or offer #FF4757 energetic red as an alternative — use the green), white text. Fonts: Nunito throughout (800 weight headings — rounded, friendly, bold; 400 body). Energetic, motivational, community-first feel.

ANIMATIONS: Bold/energetic — elements scale in with a slight bounce-easing (cubic-bezier overshoot), staggered fast (100ms between siblings).

SECTIONS (in order):
1. Nav: fixed, bold rounded {{business_name}} wordmark, solid on scroll, prominent accent "Join Us Today" button in nav.
2. Hero: HeroFullscreen, energetic action image (data-image-slot="hero"), bold headline "{{tagline}}", subhead, primary CTA "Join Us Today" + secondary "See Classes".
3. About/Founder: split, {{about_body}}, trainer/founder image (data-image-slot="about"), {{founder_name}}/{{founder_title}}.
4. **Results Transformation row**: headline "Real Results", 3 before/after image pairs (6 slots: before_1/after_1 through before_3/after_3) in a horizontal scroll-snap row on mobile, grid on desktop, each with a short {{result_N_caption}}.
5. **Class Schedule strip**: horizontal table/strip showing {{class_1_name}} / {{class_1_time}} / {{class_1_day}} pattern, 5-6 rows, bold accent-colored day labels.
6. Services (memberships/programs): ServicesCardGrid, 6 slots (3 visible).
7. Testimonials: quote+name+role, energetic card grid (not carousel).
8. Contact: form + "Join Us Today" framing.
9. Footer + WhatsApp float.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 7.2 — Light
```
Generate a single-file HTML template for a fitness/gym/yoga website called "Community Light Vibrant."

STYLE: Light mode, energetic white/cream background (#FAFAF7), same vibrant green accent (#2FBE78, slightly deepened for light-bg contrast), near-black text. Fonts: Nunito. Bright, airy, welcoming — appeals to yoga/wellness crowd specifically.

ANIMATIONS: Bold/energetic, same bounce-easing stagger as 7.1.

SECTIONS: identical structure to 7.1 (Nav → Hero → About → Results row → Class Schedule strip → Services → Testimonials → Contact → Footer).

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 7.3 — Light
```
Generate a single-file HTML template for a fitness/wellness/sports website called "Community Light Active."

STYLE: Light mode, crisp white background (#FFFFFF), bold energetic orange-red accent (#FF6B4A) as a variant from 7.2's green (keeps the 3 templates visually distinct within category), near-black text. Fonts: Nunito. More "sports performance" than "yoga calm" — punchier accent, tighter spacing.

ANIMATIONS: Bold/energetic, same bounce stagger pattern, slightly faster timing than 7.2.

SECTIONS: same structure as 7.1/7.2 (Nav → Hero → About → Results row → Class Schedule strip → Services → Testimonials → Contact → Footer). Cards use a bold accent-colored corner tag instead of full border.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

---

## CATEGORY 8 — TRUST & PROFESSIONAL (Medical / Dental / Pharmacy / Real Estate — Clinic-focused)

**Archetype base**: fonts Source Serif 4 (headings) + Source Sans 3 (body). Subtle accent, light bg preferred (flipped distribution: Light/Light/Dark). Unique section: **Credentials/certifications trust bar below hero.**

### Template 8.1 — Light, International-Premium
```
Generate a single-file HTML template for a medical/dental/clinic website called "Trust Light Professional."

STYLE: Light mode, clean clinical white background (#FFFFFF), calm blue-teal accent (#2E7D6B), near-black text (#1A1D1C), soft gray surface (#F4F6F5). Fonts: Source Serif 4 (headings, weight 600 — reassuring, credible serif) + Source Sans 3 (body, weight 400 — clean, legible). Crisp, reassuring, never gimmicky — medical/legal-guarantee-free copy tone.

ANIMATIONS: Crisp/modern — fast, minimal fades (250-300ms), no dramatic movement (patients want calm, not flashy).

SECTIONS (in order):
1. Nav: fixed, solid light bg with subtle bottom border, {{business_name}} in Source Serif, links, "Book an Appointment" CTA button in nav.
2. Hero: HeroSplit — headline "{{tagline}}" + subhead + CTA left, reassuring image (data-image-slot="hero") right.
3. **Credentials/Certifications trust bar**: horizontal strip directly below hero, 4-5 small credential badges/logos in a row ({{credential_1_name}} through {{credential_5_name}}, simple text+icon pairs, e.g. "Licensed & Accredited", "10+ Years Experience" — placeholder text, not real logos).
4. About/Stats: AboutStats pattern, headline + 3-4 stats ({{stat_1_value}}/{{stat_1_label}}) — e.g. "500+ Patients Treated".
5. Services: ServicesListElegant, 6 slots (3 visible), calm list style with thin teal rule.
6. Testimonials: quote+name+role, simple 3-card grid.
7. FAQ Accordion: 4-5 Q&A pairs — common patient questions.
8. Contact: form + {{address}}/{{phone_number}}/{{email_address}} + a MapEmbed-style styled placeholder div (labeled "Map" visually, no real embed).
9. Footer + WhatsApp float.

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 8.2 — Light, African-Premium
```
Generate a single-file HTML template for a medical/dental/pharmacy website called "Trust Light Community Care."

STYLE: Same light clinical base as 8.1 (#FFFFFF background, #2E7D6B teal accent, Source Serif 4 + Source Sans 3) but African-premium lean via copy tone and image keywords oriented toward "Nigerian medical / Lagos healthcare / African clinic," plus a warmer secondary accent (#C98A4B soft amber) used once in the Credentials bar icons to add warmth without compromising clinical trust.

ANIMATIONS: Crisp/modern, same as 8.1.

SECTIONS: identical structure to 8.1 (Nav → Hero → Credentials bar → About/Stats → Services → Testimonials → FAQ → Contact → Footer).

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

### Template 8.3 — Dark
```
Generate a single-file HTML template for a medical/dental/real-estate professional website called "Trust Dark Professional."

STYLE: Dark mode (the outlier in this category — for real-estate-adjacent or more upscale private-practice positioning), deep navy-charcoal background (#12161A), same calm teal accent (#3D9385, brightened slightly for dark-bg contrast), off-white text (#EAEDEC). Fonts: Source Serif 4 + Source Sans 3. Still reassuring and calm, just positioned as a premium/private clinic or upscale real-estate advisory rather than a bright community clinic.

ANIMATIONS: Crisp/modern, same fast minimal fades as 8.1/8.2.

SECTIONS: same structure as 8.1/8.2 (Nav → Hero → Credentials bar → About/Stats → Services → Testimonials → FAQ → Contact → Footer).

Follow all 14 GLOBAL RULES exactly. Output only the HTML file, no explanation.
```

---

## GENERATION CHECKLIST (use this before marking any template "done")

- [ ] All {{placeholders}} match this doc's naming convention exactly — no invented placeholder names
- [ ] 6 service/work/property card slots present, 4–6 hidden by default
- [ ] WhatsApp float wrapped with the conditional-hide script
- [ ] Instagram/social links wrapped the same conditional way
- [ ] 3 responsive breakpoints implemented and tested visually
- [ ] Nav: sticky + transparent→solid + hamburger drawer all working
- [ ] Reveal animations use IntersectionObserver, not a library
- [ ] All colors as CSS custom properties on :root
- [ ] No lorem ipsum, no real business names, only {{placeholders}} and generic labels
- [ ] File is self-contained — opens correctly as a standalone .html file with no console errors
