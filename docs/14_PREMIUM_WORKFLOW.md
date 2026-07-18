# 14_PREMIUM_WORKFLOW.md — End-to-End User Journey & Dashboard Information Architecture

Source of truth for the full Zuri user journey, from anonymous landing-page
visitor to daily active dashboard user, and the complete dashboard section
inventory needed to support it. Written to be handed to a planning session
before any implementation — this doc defines *what* the experience is; it
does not yet specify component-level implementation.

---

## 1. THE CORE DECISION: GATED PROGRESSIVE ONBOARDING

Not fully-anonymous-until-the-end (pure Squarespace model — too permissive
given real AI generation costs per attempt) and not signup-first (too much
friction before any value is shown, contradicts the marketing promise of
"launch in one conversation"). Instead:

```
Anonymous browsing → Anonymous onboarding conversation (free, no AI cost yet)
  → EMAIL CAPTURE GATE (lightweight, no password) → AI generation runs
  → Anonymous full preview browsing → ACCOUNT CREATION GATE (password + plan)
  → Publish (if paid plan) → Dashboard
```

Two gates, not zero and not one-at-the-front:
- **Gate 1 (email only)**: sits immediately before the expensive step (AI
  generation). Cheap to ask, prevents anonymous abuse of paid API calls,
  captures a lead even on abandonment.
- **Gate 2 (password + plan)**: sits after the user has seen tangible value
  (their actual generated site) — this is the real conversion moment,
  correctly placed *after* value delivery per the Squarespace insight.

---

## 2. FULL JOURNEY, STAGE BY STAGE

### Stage 0 — Landing page (buildzuri.com, anonymous, static site)
Marketing site as already built. Primary CTA ("Start free") does NOT go to
a signup form — it goes directly into the onboarding conversation at
`app.buildzuri.com/start` (or similar), no auth required to enter.

### Stage 1 — Onboarding conversation (anonymous, no email yet)
Conversational, guided flow per `01_ONBOARDING.md`'s existing 8 steps
(business name, industry/type, services, brand vibe, target audience,
location, contact info, handle selection). No changes to the step content —
the change is *when* this happens relative to account creation.

**Architecture note requiring a real decision in `01_ONBOARDING.md`:** handle
selection currently likely assumes a `user_id` to attach the reservation to.
Since there's no account yet at this point, handle needs to be held in a
session/temp record (keyed to a session token or the eventual captured
email) until account creation actually happens — otherwise two anonymous
users could both think they've claimed the same handle. Flag this explicitly
to whoever revises `01_ONBOARDING.md` next; don't let it get missed.

**Premium treatment for this stage:**
- Conversational pacing, one question at a time (already implied by the
  "conversation" framing in the marketing copy) — not a long traditional form
- Visible but unobtrusive progress indicator (the `.stepper` component
  already exists in `dashboard.css`'s onboarding-shell — reuse it)
- Micro-delight: as each answer is given, a subtle preview element updates
  in the background (e.g. a color swatch or archetype hint shifting) so the
  user feels the site "becoming real" as they answer — this is a known
  premium-onboarding pattern (Notion, Linear, Webflow all do variants of this)

### Stage 2 — Email capture gate
Single field, minimal friction: "Enter your email to generate your website."
No password. Store as a lead/session record tied to the onboarding data
collected so far. This is the abuse-prevention checkpoint — rate-limit
generation attempts per email (e.g. max 3 generations per email per day) at
the API level, not just at the UI level.

### Stage 3 — Generation (the v2 pipeline, per `02_WEBSITE_BUILDER.md` §4)
This takes real time (template selection + placeholder fill + image
resolution — likely 10-20 seconds). **This is a premium-feel-critical
moment** — a blank spinner here undercuts everything else. Needed:
- A designed loading sequence with actual stages shown ("Finding your
  style..." → "Writing your copy..." → "Adding the finishing touches...") —
  even if the real pipeline doesn't have exactly 3 discrete phases visible
  to the frontend, the perceived-progress pattern (classic in premium
  onboarding — Superhuman, Linear, many others use staged fake-progress
  copy over a real async call) makes the wait feel intentional, not stalled
- Reuse the marketing site's `--gold` accent + Cormorant Garamond for this
  screen's copy — this is the user's first taste of "their site is being
  built," it should feel like the same premium DNA as everything else

### Stage 4 — Reveal + anonymous preview browsing
The generated site is shown — ideally with a deliberate reveal animation
(fade/scale-in of the preview iframe, not an instant pop), consistent with
the "reveal" motion language already used throughout the marketing site and
templates. User can browse the full generated site here, still with zero
account. **Do not allow edits yet** (text/theme/image swap) — editing is the
next gate's job. Browsing-only at this stage is intentional: it maximizes
"I want this" feeling before asking for anything further.

### Stage 5 — Account creation gate (the real conversion moment)
"Create your account to save and edit your website." Password creation
(email already captured in Stage 2, so this is just "set a password" plus
optional Google OAuth for one-click). This is also the natural point to
show plan selection — Free (preview-only, matches the pricing table) vs.
Pro/Growth/Premium (publish + editing). Don't force a paid plan choice here;
Free must remain a real, completable path (per the pricing table's own
"Free — Website (preview only)" tier) — someone should be able to finish
onboarding, create a free account, and just sit on the preview.

### Stage 6 — First dashboard visit (guided, not dropped-in-cold)
First-ever dashboard load should not look identical to the 50th. A one-time
guided highlight sequence (tooltips or a subtle spotlight pattern) pointing
at: the Today's Action card, the website editor, the content calendar, and
—if on a paid plan— the publish button specifically. Dismissible, never
shown again after first visit or explicit dismissal.

### Stage 7 — Ongoing daily loop (steady-state product usage)
Dashboard Home (per `13_DASHBOARD_HOME_ANALYTICS.md`) is the daily landing
point going forward. This is where retention actually lives — see §3 below
for the full section inventory this needs to support.

---

## 3. FULL DASHBOARD SECTION/TAB INVENTORY

Beyond Home + Analytics (already speced in `13_DASHBOARD_HOME_ANALYTICS.md`),
a premium product needs these sections to feel complete, not partial:

| Section | Purpose | Plan gating |
|---|---|---|
| **Home** | Daily landing point, Today's Action | All plans |
| **Website** | Editor (text/theme/image) + live preview + Publish button | Preview: Free+. Publish/edit: Pro+ |
| **Content** | Full 90-day content calendar — calendar view + list view, mark-as-posted, regenerate individual pieces | Free: 5 ideas/mo view-only. Pro+: full calendar + regen limits per plan |
| **Analytics** | Per `13_DASHBOARD_HOME_ANALYTICS.md` | Growth+ for full detail; Pro sees a lighter summary; Free sees a locked teaser |
| **Agency Marketplace** | Browse vetted agencies, submit inquiries | Growth+ full access; Free/Pro see locked teaser, not hidden |
| **Notifications** | In-app notification center (reuses existing `.notif-panel`) | All plans |
| **Settings** | Sub-tabs: Profile, Business Info (re-editable onboarding data), Billing & Plan, Custom Domain (Growth+), Account/Security | All plans (sub-features gated individually) |
| **Help / Support** | FAQ link-out, contact support, help center search | All plans |

**Navigation structure implication:** this is enough sections that the
existing `.sidebar-nav` needs real information architecture, not an ad hoc
list — group as: Home (standalone) → Website, Content, Analytics (the
"build & grow" cluster) → Agency Marketplace (standalone, has a distinct
purpose) → Notifications, Settings, Help (utility cluster, likely bottom of
sidebar per `.sidebar-foot` which already exists in `dashboard.css`).

---

## 4. PREMIUM-FEEL PRINCIPLES (apply across all of the above)

These aren't new components — they're a checklist to apply while building
everything above, since "premium" mostly lives in details, not big features:

1. **No dead spinners.** Every async wait (generation, publish, regenerate,
   image upload) gets a designed loading state with actual copy, not a bare
   spinner — per the Stage 3 pattern above, reused everywhere similar waits occur.
2. **Intentional empty states, everywhere.** `dashboard.css` already has
   `.empty-state` — every section (Content with no plan yet, Analytics with
   no traffic yet, Agency Marketplace before Growth-plan unlock) needs its
   own specific empty-state copy and CTA, not a generic "nothing here" message.
3. **Celebratory micro-moments at real milestones.** Publishing for the
   first time, hitting a 7-day consistency streak, first contact-form
   submission received — these deserve a small designed moment (a gold
   shimmer, a brief confetti-style burst, a distinct toast style) rather
   than being treated identically to routine confirmations ("Saved.").
   Don't overdo this — reserve it for genuine milestones, not every save.
4. **Locked features are shown, never hidden.** Established pattern already
   used elsewhere in this project (Agency Marketplace, Analytics depth,
   Custom Domain) — a visible, well-designed locked state with a clear
   upgrade path converts better than invisibility, and avoids the feeling
   of a bait-and-switch.
5. **Consistent motion language.** Reveal/fade-up patterns from the
   marketing site (`.reveal`/`.reveal.in`) should have a dashboard
   equivalent for section transitions — not identical timing/scale (dashboard
   is a working tool, not an editorial site — keep it snappier), but the same
   *family* of motion, not a completely different unrelated animation style.
6. **Every plan-gated action has a one-click upgrade path from the exact
   point of friction** — not a generic "Upgrade" link buried in Settings.
   Clicking a locked feature should open the upgrade flow scoped to that
   feature's benefit, not a blank pricing page.

---

## 5. WHAT THIS DOC DELIBERATELY DOESN'T DECIDE YET

Component-level implementation, exact copy for every screen, and the visual
design of Login specifically (still pending per the earlier "Login +
Onboarding" scope that hasn't been tackled). This doc is journey +
information architecture only — implementation planning is the next step,
done by whoever (Cursor or otherwise) picks this up per the accompanying
planning prompt.
