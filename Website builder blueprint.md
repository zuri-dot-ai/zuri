# AI Website Builder — Full Decision Tree Workflow

This document maps every major decision point in an AI website builder, starting from website type and cascading through intake, generation, editing, and the post-launch regeneration loop. Each node shows the user input/choice and the system outcomes that branch from it.

---

## ROOT: "What type of website do you want to build?"

The top-level classification. This single answer reshapes every downstream question, the page architecture, the AI's copywriting tone, and which functional modules get offered later.

1. **Business / Service Website** (agencies, consultants, local services, professional firms)
2. **E-commerce / Online Store**
3. **Portfolio / Personal Brand** (designers, photographers, freelancers, artists)
4. **Blog / Content / Publication**
5. **Restaurant / Hospitality / Food Service**
6. **Events / Booking-Based** (venues, classes, appointments, rentals)
7. **Nonprofit / Community / Cause-Based**
8. **Landing Page / Single-Product Launch** (SaaS, app, campaign, waitlist)

Each branch below follows the same skeleton: Goal → Audience/Style → Structure Proposal → Content Generation → Functional Modules → Editor/Regeneration Loop → Publish. Only the choices that meaningfully diverge per site type are spelled out in full; shared mechanics (the editor loop, publish flow) are detailed once at the end and apply universally.

---

## BRANCH 1: Business / Service Website

### 1.1 Core Goal (multi-select prompt)
- **"Generate leads / get contacts to call or email me"**
  → System weights generation toward: prominent phone number in header, contact form above the fold, "Request a Quote" CTAs, trust badges (certifications, years in business).
- **"Showcase my work / build credibility"**
  → System weights toward: case studies/portfolio section, testimonials, team bios, awards.
- **"Explain a complex service or process"**
  → System weights toward: "How it Works" step sections, FAQ blocks, process diagrams.
- **"Support an existing offline business (find us, see hours, menu/services)"**
  → System weights toward: map embed, hours widget, location page, less copy-heavy hero.

### 1.2 Industry Sub-type (free text or dropdown — affects vocabulary, imagery, compliance flags)
- Legal / Financial / Medical → triggers **compliance flag**: disclaimers, ADA-accessibility emphasis, restricted claim language in AI copywriting (e.g., no guaranteed outcomes).
- Home services (plumbing, HVAC, landscaping) → triggers **local SEO emphasis**: service-area pages, "near me" keyword targeting.
- Consulting / B2B → triggers **lead-gen emphasis**: gated content offers, newsletter capture, LinkedIn-style tone.
- Creative/agency → triggers **portfolio-emphasis** crossover with Branch 3 components.

### 1.3 Tone & Style Input
- **User uploads reference site(s) they like**
  → AI scrapes visual structure (not content) and extracts: color palette, font pairing style, layout density (minimal vs. dense), to seed the design system.
- **User picks from style presets** (e.g., Corporate/Trustworthy, Bold/Modern, Warm/Approachable, Minimal/Luxury)
  → Maps directly to a pre-trained design token set (color, type scale, spacing rhythm).
- **User skips style input entirely**
  → AI infers style from industry sub-type defaults (e.g., legal → conservative palette, navy/gray; wellness → soft, organic palette).

### 1.4 AI-Proposed Site Structure (presented for approval before generation)
Default proposal usually includes: Home, About, Services (or Services overview + individual service pages if 3+ services listed), Testimonials/Case Studies, Contact, sometimes Blog.

- **User approves as-is** → proceeds to full generation (see 1.5).
- **User removes a page** → architecture updates, internal nav and footer links regenerate to stay consistent, any cross-page CTAs pointing to the removed page get rerouted to the next logical page (usually Contact).
- **User adds a page** (e.g., "Add a Careers page") → AI asks one follow-up (what content should it contain, or should AI draft it) → page slots into nav in a sensible position.
- **User requests merging pages** (e.g., "combine About and Team") → sections are concatenated into one page with internal anchor navigation.

### 1.5 Content Generation Outcomes
For each approved page, the AI generates section-by-section. Key variable points:

- **If user provided real business details (name, services, location, differentiators)**
  → Copy is grounded in actual facts; AI does not fabricate claims, statistics, or testimonials — it either leaves placeholders flagged for user input or asks a clarifying question.
- **If user provided only vague/minimal input ("a plumbing business in Austin")**
  → AI generates plausible placeholder copy clearly editable, and flags fields like phone number, license number, and testimonials as "needs your input" rather than inventing them.
- **If user requests a specific word count or copy density** ("keep it short," "more detailed")
  → Adjusts section length and number of subsections accordingly.

### 1.6 Functional Module Offers (presented after base site generates)
- Contact form → **Connect to email / CRM?** Yes → OAuth or API key flow to (Gmail, HubSpot, Mailchimp, etc.). No → form submissions land in builder's internal inbox only.
- Booking/scheduling needed? → branches into shared **Booking Module** (see Branch 6.4).
- Multi-location business? → triggers **Location Pages Generator**: user inputs addresses, AI generates one sub-page per location with local schema markup.
- Live chat / chatbot? → Yes → choice of (AI-trained-on-site-content chatbot vs. simple contact-widget chatbot) → No → skip.

---

## BRANCH 2: E-commerce / Online Store

### 2.1 Core Goal
- **"Sell physical products"** → triggers inventory/shipping fields later.
- **"Sell digital products/downloads"** → triggers digital delivery setup, no shipping module.
- **"Sell services as bookable/purchasable packages"** → crosses into hybrid with Booking Module.
- **"Dropshipping / print-on-demand"** → triggers integration offers (Printful, Spocket, etc.) instead of manual inventory entry.

### 2.2 Catalog Size & Source Input
- **User has an existing catalog file (CSV, Shopify export, etc.)**
  → AI parses and imports; asks user to confirm category mapping; auto-generates product descriptions for any rows missing them (flagged as AI-written, editable).
- **User has products but no file — uploads photos one by one or in bulk**
  → AI extracts visual attributes (color, apparent category) to pre-fill draft listings; asks user to confirm/correct.
- **User has no products yet (pre-launch)**
  → AI generates a "Coming Soon" structure with placeholder product cards and pivots remaining flow toward a waitlist-capture landing page (crosses into Branch 8).

### 2.3 Storefront Structure Proposal
Default: Home, Shop/All Products, Category pages (auto-created per detected category), Product Detail Page template, Cart, Checkout, About, Contact, sometimes Size Guide/FAQ.

- **User has < 10 products** → AI may collapse "Shop" and "Home" into a single page to avoid thin navigation.
- **User has many categories (10+)** → AI proposes mega-menu navigation instead of flat top nav.
- **User wants a single hero product (flagship item)** → AI proposes a product-led homepage instead of catalog-grid homepage.

### 2.4 Commerce Configuration Branch
- **Payment processor choice**: Stripe / PayPal / other → triggers respective OAuth/API setup flow; if user defers, store publishes in "browse-only" mode with checkout disabled and a banner prompting setup.
- **Shipping model**:
  - Flat rate → user inputs one fee.
  - Calculated by carrier → triggers carrier API connection (USPS/UPS/etc.).
  - Local pickup only → disables shipping address fields at checkout.
  - Digital only → shipping module skipped entirely.
- **Tax handling**: Auto-calculated (via tax API) vs. Manual flat rate vs. "I'll handle this myself" (disables tax fields, adds disclaimer).
- **Inventory tracking**: On (out-of-stock states, low-stock warnings auto-generated in UI) vs. Off (simpler listings, no stock display).

### 2.5 Product Page Generation Outcomes
- **Sparse input (just a product name)** → AI drafts a description but flags price, SKU, and images as required before publish; product stays in "draft" state.
- **Rich input (specs, materials, sizing)** → AI generates a full structured detail page including a specs table and auto-suggests an FAQ block based on common questions for that product category.
- **User uploads only one photo per product** → AI offers (if enabled) AI-generated lifestyle/alternate-angle images as a premium add-on, clearly labeled as AI-generated.

### 2.6 Cross-sell/Upsell Module Offer
- Yes → AI auto-generates "You may also like" logic based on category similarity (no user effort needed) or user manually curates.
- No → standard linear product pages only.

---

## BRANCH 3: Portfolio / Personal Brand

### 3.1 Core Goal
- **"Get hired / land freelance clients"** → weights toward a prominent CTA ("Hire Me" / "Get a Quote"), process section, testimonials, downloadable resume.
- **"Showcase work for exposure, not direct sales"** → weights toward large visual gallery, minimal text, social links prioritized over contact form.
- **"Build a personal brand around myself as a public figure"** → weights toward bio-led homepage, press mentions, speaking/media section, newsletter signup.

### 3.2 Medium/Discipline Input (shapes gallery layout logic)
- Visual work (photography, design, illustration) → triggers **image-first masonry/grid layout**, lightbox viewer, minimal accompanying text per piece.
- Written work (writers, journalists) → triggers **list/excerpt layout** instead of image grid, with each entry linking to full piece or external publication.
- Performance/AV work (musicians, filmmakers, voice actors) → triggers **embedded media player** components (audio/video), with the homepage hero defaulting to a reel or featured track.
- Mixed/multidisciplinary → AI proposes a filterable portfolio (tag-based filtering across types) rather than a single grid.

### 3.3 Portfolio Content Input Branch
- **User uploads project files/images in bulk**
  → AI auto-creates one portfolio entry per logical group (detects sets vs. singles), drafts a title and short description per entry, flags for user review.
- **User pastes links to existing work hosted elsewhere (Behance, Dribbble, YouTube, etc.)**
  → AI embeds or pulls preview thumbnails where the platform allows; if it can't fetch automatically, prompts user to upload a thumbnail manually.
- **User has no portfolio pieces ready yet**
  → AI generates the page shells/templates only ("Project Title — Add your work here") so the structure exists for later population; site can still publish with an "About" and "Contact" page live while portfolio fills in.

### 3.4 Structure Proposal
Default: Home (hero + featured work), Portfolio/Work (full gallery), About, Contact, optional Resume/CV page, optional Blog/Journal.

- **User wants a single-page scroll site instead of multi-page** → AI restructures all approved sections as anchored scroll sections on one URL, nav becomes anchor-jump links instead of page links.
- **User wants password-protected or invite-only portfolio (e.g., for client review)** → triggers **private page module**: AI generates the page but gates it behind a simple password field; excluded from sitemap/SEO indexing.

### 3.5 Functional Module Offers
- Client testimonials → Yes (AI drafts a request-for-testimonial email template for the user to send out) / No.
- Pricing/packages display → Yes (structured tiered package layout) / No (keeps pricing conversation off-site, CTA goes straight to contact).
- Blog/journal for SEO and personal updates → Yes (crosses into Branch 4 mechanics) / No.

---

## BRANCH 4: Blog / Content / Publication

### 4.1 Core Goal
- **"Build an audience / grow traffic"** → weights toward SEO-heavy structure, category/tag taxonomy, related-posts module, email newsletter capture prominent.
- **"Share writing as a personal outlet, traffic not a priority"** → weights toward simpler chronological layout, less SEO scaffolding, optional comments.
- **"Monetize through ads, affiliate, or subscriptions"** → triggers **monetization module branch** (4.5).
- **"Multi-author publication/magazine"** → triggers **author management** (multiple bylines, author bio pages, editorial roles).

### 4.2 Content Volume & Source Input
- **User has existing posts to migrate (from another platform, export file, or pasted text)**
  → AI parses and imports, preserves formatting where possible, auto-tags/categorizes based on content analysis, flags broken image links if any.
- **User is starting fresh with zero posts**
  → AI proposes a content calendar/starter topic list based on the stated niche, and can draft 2–3 sample posts on request to seed the site before launch.
- **User provides only topic/niche, wants AI to ghostwrite ongoing content**
  → Triggers an **ongoing content-generation subscription offer** (premium tier feature): AI drafts new posts on a schedule for user review/approval before publishing.

### 4.3 Structure Proposal
Default: Home (latest posts feed), individual Post template, Category/Tag archive pages, About, Contact, Newsletter signup page/modal.

- **User wants a magazine-style homepage (featured + sectioned) instead of a simple chronological feed** → AI restructures homepage into editorial zones (Featured, Trending, By Category).
- **User wants minimalist/text-only blog (no homepage feed, just an index list)** → AI strips imagery-heavy components, generates a plain reverse-chronological list.

### 4.4 Taxonomy & Discovery Decisions
- Categories defined by user → used as-is.
- Categories not defined → AI proposes a taxonomy based on sample content or stated niche, user approves/edits before it's applied site-wide.
- Search functionality → Yes (on-site search index generated) / No (relies on category/tag browsing only).

### 4.5 Monetization Module (if selected in 4.1)
- **Ad placements** → AI proposes standard ad-safe zones in the post template (header, in-content, sidebar) sized for common ad networks; user connects network or leaves placeholders.
- **Affiliate links** → AI adds a disclosure block component automatically (compliance-driven default, not optional) wherever affiliate-style content is detected.
- **Paid subscription/membership content** → triggers crossover with **gated content module**: user defines free vs. paid posts, AI scaffolds a paywall component and pricing page.

---

## BRANCH 5: Restaurant / Hospitality / Food Service

### 5.1 Core Goal
- **"Get people to visit in person"** → weights toward map/hours/location prominence, ambience photography, less e-commerce framing.
- **"Take online orders / delivery"** → triggers crossover with **E-commerce checkout mechanics** (Branch 2.4) layered onto a menu structure.
- **"Take reservations"** → triggers crossover with **Booking Module** (Branch 6.4).
- **"Promote a brand/chain across multiple locations"** → triggers **multi-location module** similar to Branch 1.6 but with per-location menus/hours.

### 5.2 Menu Input Branch
- **User uploads existing menu (PDF, image, or doc)**
  → AI extracts items, prices, and categories via parsing; flags any items it's uncertain about (e.g., illegible price) for manual confirmation; preserves dietary icons if detected (vegan, gluten-free) or prompts user to tag them.
- **User has no digital menu, types items manually or dictates them**
  → AI structures into categorized menu sections (Starters, Mains, Desserts, etc.) as items are entered.
- **Menu changes seasonally/frequently**
  → AI flags menu as a "frequently updated" content type and surfaces an easy-edit shortcut in the dashboard rather than requiring a full page rebuild each time.

### 5.3 Structure Proposal
Default: Home, Menu, About/Our Story, Location & Hours, Reservations (if applicable), Order Online (if applicable), Gallery, Contact.

- **Single location, simple service** → AI may collapse Location/Hours/Contact into one page.
- **Multiple locations** → triggers location-picker component on homepage, individual location sub-pages.

### 5.4 Functional Module Offers
- Online ordering → Yes (crosses into e-commerce checkout, menu items become purchasable products) / No (menu remains display-only, "Call to Order" CTA instead).
- Reservation system → Yes (crosses into Booking Module 6.4) / No.
- Gallery/Instagram feed embed → Yes (live feed pull, requires social account connection) / No (static uploaded gallery only).
- Events/private dining inquiries → Yes (adds an inquiry form distinct from general contact) / No.

---

## BRANCH 6: Events / Booking-Based (venues, classes, appointments, rentals)

### 6.1 Core Goal
- **"Let people book appointments/sessions with me directly"** (consultants, salons, therapists, tutors) → weights toward calendar-first homepage, service-duration/pricing clarity.
- **"Sell tickets to a specific event"** → weights toward single-event landing structure with countdown, ticket tiers, not an ongoing calendar.
- **"Rent out a space/equipment"** → weights toward availability calendar + photo gallery of the space/item, deposit/terms section.
- **"Run an ongoing class/course schedule"** → weights toward recurring-schedule display, package/membership pricing options.

### 6.2 Booking Complexity Input
- **Simple 1:1 appointments, fixed duration** → straightforward calendar component, single staff member.
- **Multiple staff/providers with individual calendars** → triggers **staff selection step** in booking flow, each provider syncs their own availability.
- **Group sessions/classes with capacity limits** → triggers **capacity-aware booking** (auto-closes booking when full, optional waitlist).
- **Multi-day/resource booking (venue rental)** → triggers date-range picker instead of single time-slot picker, plus conflict-blocking logic.

### 6.3 Structure Proposal
Default: Home, Services/Classes/Event details, Book Now (calendar/checkout), About, Contact, sometimes Gallery (for venues/spaces).

- **Single flagship event (not recurring)** → AI proposes a one-page event landing structure instead of multi-page site, crosses into Branch 8 mechanics.
- **Ongoing recurring offering** → standard multi-page structure with a persistent "Book Now" nav item.

### 6.4 Booking Module (shared sub-system referenced by Branches 1, 5, 6)
- **Payment at booking required?** Yes → connects to payment processor (deposit or full payment) / No → booking confirms without payment, payment handled offline.
- **Confirmation/reminder method**: Email only / Email + SMS (requires SMS provider connection) / None (manual follow-up by user).
- **Cancellation policy**: User defines a window/fee → AI auto-generates the policy text and applies it to confirmation emails and the booking page disclosure.
- **Sync with external calendar** (Google Calendar, Outlook)? Yes → OAuth connection flow / No → bookings live only inside the builder's dashboard.

### 6.5 Functional Module Offers
- Waitlist for full sessions → Yes/No.
- Membership/package passes (e.g., "10-class pass") → Yes (triggers a packages/pricing module, ties into booking credits system) / No.
- Reviews per provider/class → Yes / No.

---

## BRANCH 7: Nonprofit / Community / Cause-Based

### 7.1 Core Goal
- **"Raise donations"** → weights toward prominent Donate CTA, impact statistics, donor transparency section.
- **"Recruit volunteers/members"** → weights toward sign-up forms, opportunities listing, less payment-focused.
- **"Raise awareness for a cause (not directly transactional)"** → weights toward storytelling-led homepage, share/social CTAs over donate CTAs.
- **"Run a membership organization"** → triggers crossover with **gated content / membership module** (similar to Branch 4.5).

### 7.2 Structure Proposal
Default: Home (mission statement led), About/Mission, Get Involved (volunteer/donate), Programs/Impact, News/Updates, Contact.

- **Donation-focused** → AI inserts a persistent donate button in the header/nav across all pages, not just a dedicated page.
- **Volunteer-focused** → AI generates an opportunities listing structure (filterable by location/skill/time commitment) instead of a single static "Get Involved" page.

### 7.3 Donation Module Branch
- **Payment processor for donations** (often distinct from commerce processors — e.g., dedicated nonprofit platforms like Givebutter) → connection flow.
- **One-time vs. recurring donation options** → toggle; if recurring enabled, AI adds subscription-style messaging ("Become a monthly supporter").
- **Suggested donation tiers** → user inputs amounts, or AI suggests defaults based on cause type, with an "other amount" field always included.
- **Tax-deductibility disclosure** → AI auto-inserts required disclosure language if user confirms 501(c)(3)/equivalent status; flagged as a compliance-required field, not skippable if confirmed.

### 7.4 Functional Module Offers
- Impact counter/statistics widget (e.g., "1,200 meals provided") → Yes (user inputs live numbers, AI builds the display component) / No.
- Event calendar for community events → Yes (crosses into Booking Module structure without payment) / No.
- Newsletter/advocacy email signup → Yes / No.

---

## BRANCH 8: Landing Page / Single-Product Launch (SaaS, app, campaign, waitlist)

### 8.1 Core Goal
- **"Collect emails before launch (waitlist)"** → weights toward a single-section page: headline, value prop, email capture, social proof if available, nothing else.
- **"Convert visitors into trial signups/customers now"** → weights toward full conversion-funnel page: hero, features, pricing, testimonials, FAQ, final CTA.
- **"Support a marketing campaign with a dedicated tracking page"** → weights toward stripped-down single-CTA page optimized for ad traffic, minimal navigation (often nav is removed entirely to prevent drop-off).
- **"Launch an app and drive app-store downloads"** → weights toward app-store badge CTAs, device mockup imagery, feature-screenshot carousel.

### 8.2 Page Length/Depth Input
- **User wants a short single-section page** → AI generates one tight scroll-section, no internal nav, single CTA repeated minimally.
- **User wants a full long-form sales page** → AI proposes a fuller section sequence: Hero → Problem/Pain Point → Solution/Features → Social Proof → Pricing → FAQ → Final CTA, each section can be reordered or removed.

### 8.3 Conversion Mechanism Branch
- **Email capture only** → connects to email marketing tool (Mailchimp, ConvertKit, etc.) or stores submissions internally if user defers.
- **Paid signup/trial** → crosses into lightweight e-commerce/subscription checkout (Branch 2.4 payment mechanics, simplified).
- **External link out (e.g., to App Store/Play Store or a separate booking tool)** → no payment/email module needed, just CTA button configuration.

### 8.4 Urgency/Scarcity Module Offer (common in launch pages)
- Countdown timer to launch date → Yes (user sets date, AI embeds live countdown) / No.
- Limited spots/early-bird messaging → Yes (user defines the claim, AI ensures copy stays consistent with it across sections) / No — **AI will not fabricate fake scarcity claims if not provided by the user**, this is a content-integrity guardrail.

### 8.5 Post-Capture Outcome
- **User wants an automatic thank-you/confirmation page** → AI generates one, with optional social-share prompt.
- **User wants an automatic email sequence after signup** → triggers crossover with the email-tool connection; AI can draft a short welcome sequence if requested.

---

## SHARED STAGE A: Design System Generation (applies after any branch's structure is approved)

This runs once, after the page architecture is locked in 1.4/2.3/3.4/etc., and before section-by-section content generation begins.

### A.1 Style Input Method (same options regardless of site type)
- **Reference site/image upload** → AI extracts palette, type pairing, spacing density, applies as the base design token set.
- **Preset style selection** → maps to a pre-built token set.
- **No input given** → AI infers from industry/site-type defaults established in the relevant branch.

### A.2 Brand Asset Input
- **User has an existing logo** → AI extracts dominant colors from it to seed/validate the palette; if logo and chosen style preset clash, AI flags the mismatch and asks which should take priority.
- **User has no logo** → AI offers (a) a simple wordmark/text-based logo generated in-system, or (b) proceeding with no logo (text site name in header only). Full custom logo design is typically flagged as outside the AI builder's scope and suggested as a separate design service.
- **User has brand guidelines (fonts, exact hex codes)** → AI applies them directly, overriding inferred defaults.

### A.3 Output of Stage A
A locked design token set (colors, type scale, spacing, corner radius, button styles, imagery style) that all subsequent generated pages inherit. This is what makes later "global" edits possible (see B.4).

---

## SHARED STAGE B: Editor & Regeneration Loop (post-first-draft, applies to every branch)

Once the full site generates from Stages A and the branch-specific content steps, the user lands in the editor. This is the highest-frequency interaction loop and where most user inputs occur after initial generation.

### B.1 Entry Point — How the user initiates a change
- **Direct manipulation** (click an element: text, image, button, section) → opens inline editing controls scoped to that element only.
- **AI chat instruction** (typed natural-language request, e.g., "make the hero shorter") → routed to the AI for interpretation (see B.3).
- **Section-level toolbar action** (duplicate, delete, reorder, hide section) → immediate structural change, no AI interpretation needed.

### B.2 Direct Manipulation Outcomes
- **Text edit** → inline rich-text controls (bold, link, font-size within allowed design-system range); saves on blur; does not break design-system constraints (e.g., can't pick an off-palette color unless user explicitly opens advanced/custom color picker).
- **Image swap** → opens choice: (a) upload own image, (b) AI-generate a replacement image from a prompt, (c) browse a stock library matched to the site's style. Selected image is auto-cropped/optimized to fit the existing layout slot.
- **Button/CTA edit** → text edit plus a destination picker (link to existing page, external URL, anchor scroll, or open a form/modal).
- **Color/style override at the element level** → flagged as a "custom override"; if the user later changes the global theme (B.4), the system asks whether overrides should be preserved or reset to the new theme.

### B.3 AI Chat Instruction — Interpretation Branches
This is the most complex node in the loop, since one freeform input can mean several different things.

- **Instruction is unambiguous and scoped** ("make this headline shorter") → AI executes directly, shows the change, no confirmation needed (single undo step created).
- **Instruction is ambiguous in scope** ("make it more modern") → AI either (a) asks one clarifying question ("Do you mean the whole site, this page, or just this section?"), or (b) makes its best interpretation and clearly highlights what changed, allowing easy single-click revert.
- **Instruction requires new content not yet on the page** ("add a testimonials section") → AI generates the new section in the site's existing design language, inserts it in a sensible position (typically before final CTA/contact), and asks for real testimonial content if none exists yet, or uses placeholder flagged for replacement.
- **Instruction requires removing/restructuring** ("get rid of the pricing table") → AI removes the section, checks for and removes/redirects any nav links or CTAs that pointed to it.
- **Instruction conflicts with a compliance guardrail** (e.g., "say we guarantee results" on a flagged medical/legal site) → AI declines to insert the exact claim, explains why, and offers compliant alternative phrasing.
- **Instruction is out of scope for the builder** (e.g., "integrate a custom backend database") → AI explains the limitation and, where relevant, suggests the custom-code injection module or an external integration as the workaround.

### B.4 Global Theme Changes
- **User adjusts a single global control** (e.g., a "more rounded / more square" slider, or swaps the whole color palette) → propagates across every page and component simultaneously, since all elements inherit from the Stage A token set.
- **User wants different themes/styles per page** (uncommon but possible, e.g., a campaign sub-page with a different look) → triggers a "page-level theme override," explicitly separated from the global system so it doesn't get overwritten by future global changes.

### B.5 Version Control Branch
- **User wants to undo a recent change** → single-step undo via standard history stack.
- **User wants to compare/revert to an earlier full version** (e.g., "go back to how it looked yesterday") → opens version history snapshots (auto-saved at meaningful checkpoints: structure changes, AI bulk-edits, manual publishes); user can preview and restore a full snapshot or selectively pull one section from an old version.
- **Multiple collaborators editing** (team/agency tier) → conflicting edits trigger a merge prompt or lock the section being actively edited by another user.

### B.6 Regenerate vs. Edit Decision (a meta-branch the AI itself makes)
When the user requests a change via chat, the system decides internally:
- **Small, targeted change** → in-place edit to the existing component, design system untouched.
- **Large structural request** ("redesign the whole homepage") → full section regeneration using the same Stage A tokens, presented as a new draft the user can accept, reject, or blend (keep some old sections, accept some new ones).
- **Request implies a different site type than originally selected** (e.g., a portfolio site user suddenly says "add a shopping cart for prints") → triggers a cross-branch module pull (in this case, the E-commerce branch's catalog/checkout mechanics get grafted onto the existing portfolio structure) rather than a full rebuild.

---

## SHARED STAGE C: Pre-Publish & Publish Flow

### C.1 Pre-Publish Checks (automated, runs before publish button is enabled or as warnings)
- **Missing required fields** (e.g., unpriced products, empty contact info, unconfirmed compliance disclosures) → flagged with a checklist; user can publish anyway with placeholders or fix first, depending on builder's strictness setting.
- **Mobile responsiveness check** → automatic; any element that breaks on mobile triggers a flagged warning with a one-click "auto-fix" option.
- **SEO readiness check** → missing meta titles/descriptions/alt text auto-generated by AI if user hasn't supplied them, with option to review/edit before publish.

### C.2 Domain Decision
- **User has an existing domain** → DNS connection instructions/automated flow.
- **User wants to buy a new domain** → in-builder domain search and purchase.
- **User isn't ready for a custom domain** → publishes on a builder-provided subdomain, with an easy upgrade path later that doesn't break existing content.

### C.3 Publish Outcome
- **Full publish** → site goes live at the chosen domain, analytics tracking activates, sitemap submitted to search engines (if SEO module enabled).
- **Staged/preview publish only** (premium feature) → site goes live at a private preview URL for client/stakeholder review before full public launch.
- **Scheduled publish** → user sets a future date/time (common for Branch 8 launch pages), site goes live automatically at that timestamp.

### C.4 Post-Publish Loop
After publishing, the user re-enters **Stage B (Editor & Regeneration Loop)** for all future changes — the workflow doesn't end at publish, it becomes circular. Additional post-publish-only branches include:
- **Analytics review prompts AI suggestions** (e.g., AI notices high bounce rate on a page and proactively suggests a regeneration of that section) — premium/proactive-AI feature.
- **A/B test creation**: user (or AI, if requested) generates a variant of a section, traffic splits, results feed back into a "promote winner" decision that triggers a B.6-style regeneration to make the winning variant permanent.

---

## How to read this tree in practice

Every site, regardless of starting branch, passes through the same four stages in order: **branch-specific intake → Stage A (design system) → branch-specific content generation → Stage B (editor/regeneration loop, recurring indefinitely) → Stage C (publish, then loops back into Stage B)**. The branches mainly differ in (1) what questions get asked during intake, (2) which functional modules get offered, and (3) what compliance or content-integrity guardrails apply. The editor and regeneration mechanics in Stage B are identical no matter which of the 8 starting types the user picked, which is what allows a builder like this to support cross-branch requests (a portfolio site growing a storefront, a blog adding bookings, etc.) without a full rebuild.