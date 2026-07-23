# ZURI — ONBOARDING SYSTEM V2
# Supersedes 01_ONBOARDING.md in full. Read 00_SESSION_PROMPT_PREMIUM_OVERHAUL.md first.
# This is the complete specification for the new onboarding flow: anonymous-first
# architecture, screen-by-screen spec, structured data collection, conditional photo
# upload, the signup wall, and the handoff into website generation.

---

## 1. PHILOSOPHY (revised)

The original onboarding's job was "collect enough data, then get out of the way."
That's necessary but not sufficient. The v2 job is: **make the user feel like Zuri
already understands their business before asking them to trust it with an account.**

Every screen should feel like Zuri is solving something, not collecting something.
The user should never feel like they're filling out a form. They're building — and
watching Zuri respond intelligently to what they've told it, one sharp, instant
decision at a time.

Reference bar unchanged: Typeform (single-question momentum), Squarespace (visual
card selection), Linear (speed, minimalism). New reference: the *feeling* of a
guided setup wizard for a premium product (e.g. a Notion workspace setup, a Framer
site setup) — not a lead-gen form.

Voice intake remains unused. All intake is visual card selection, short text
inputs, and (new in v2) optional image upload.

---

## 2. THE CORE ARCHITECTURAL SHIFT: ANONYMOUS-FIRST

**Onboarding now happens before signup.** This is the single biggest structural
change from v1 and it touches everything downstream.

### 2.1 Why

Letting a visitor invest effort — picking their category, naming their services,
choosing a vibe, watching their business's design direction take shape — before
asking for an email is a proven conversion pattern. People commit once they've
invested effort. Asking for an account on message one, before any value has been
demonstrated, is the generic-SaaS pattern this initiative is explicitly moving
away from.

### 2.2 How data survives without an account

An **anonymous session** is established the moment a visitor lands on `/start`
(the new onboarding entry point — see §3). This is a signed, HTTP-only cookie
containing a random session token, NOT tied to `auth.users` in any way.

```typescript
// src/lib/onboarding/anonymous-session.ts

const ANON_COOKIE_NAME = "zuri_anon_session";
const ANON_SESSION_TTL_HOURS = 72; // matches the "come back later" tolerance

export function getOrCreateAnonymousSessionId(): string {
  // Read existing cookie if present and not expired; otherwise generate
  // a new UUID, set the cookie (httpOnly, secure, sameSite: 'lax', maxAge
  // matching ANON_SESSION_TTL_HOURS), and return it.
  // Implementation detail: use crypto.randomUUID().
}
```

All onboarding answers are held in **two places simultaneously**, same pattern
as v1's localStorage approach but now also mirrored server-side against the
anonymous session id, so a user can switch devices mid-flow without losing
progress (a real scenario — someone starts on a phone in a shop, finishes on a
laptop at home):

```sql
CREATE TABLE IF NOT EXISTS anonymous_onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,   -- matches the cookie value
  data jsonb NOT NULL DEFAULT '{}',     -- the full OnboardingState, updated on every step
  current_step integer NOT NULL DEFAULT 1,
  archetype text,                        -- set as soon as category is chosen (step 1)
  ip_hash text,                          -- hashed, not raw — for rate limiting only
  user_agent_hash text,                  -- hashed, not raw — for rate limiting only
  converted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '72 hours')
);

CREATE INDEX idx_anon_sessions_token ON anonymous_onboarding_sessions(session_token);
CREATE INDEX idx_anon_sessions_expires ON anonymous_onboarding_sessions(expires_at);

-- No RLS needed in the traditional sense (no auth.uid() exists yet for these rows)
-- but lock this table down to service-role-only access — never exposed to the
-- anon key directly. All reads/writes go through API routes using createServiceClient().
ALTER TABLE anonymous_onboarding_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON anonymous_onboarding_sessions
  FOR ALL USING (auth.role() = 'service_role');
```

Client-side, `localStorage` remains the primary read/write surface for
instant UI updates (no network round-trip needed to advance a step visually),
but every step transition also fires a lightweight debounced PATCH to
`/api/onboarding/session` to keep the server copy in sync. This is
belt-and-suspenders: localStorage handles the common case (same device,
same session) instantly; the server copy handles device-switching and
protects against a cleared-cache scenario losing 10 steps of progress.

A cron job (`/api/cron/purge-expired-sessions`) deletes
`anonymous_onboarding_sessions` rows past `expires_at` daily. This is a
privacy-hygiene requirement, not just cleanup — don't retain
prospective-customer business data indefinitely with no account attached.

### 2.3 Rate limiting (protects Gemini spend pre-signup)

Since generation only fires after signup (§8), the anonymous phase itself
makes no Gemini calls, which limits exposure. But the anonymous session
creation and step-saving endpoints still need basic abuse protection:

```typescript
// Applied at /api/onboarding/session (every step-save call)
// Limit: 30 step-saves per anonymous session per hour (generous for real
// use — a real user completing 14 steps once should never come close —
// but blocks scripted abuse hammering the endpoint)

// Applied at /api/onboarding/start (session creation)
// Limit: 5 new anonymous sessions per IP-hash per 24 hours
// (blocks trivial cookie-clearing abuse; real users rarely restart onboarding
// 5+ times legitimately in a day)
```

Both use the existing `rate_limit_log` table and rate-limiting utility
already defined in `10_SECURITY.md` — no new infrastructure needed, just
new rate-limit keys scoped to `ip_hash` instead of `user_id` since no user
exists yet.

### 2.4 Conversion — flushing anonymous data into real accounts

The moment signup succeeds (§8), a single server-side operation:

```typescript
// src/lib/onboarding/convert-session.ts
export async function convertAnonymousSession(
  sessionToken: string,
  newUserId: string
): Promise<void> {
  const supabase = createServiceClient();

  const { data: anonSession } = await supabase
    .from("anonymous_onboarding_sessions")
    .select("data, archetype")
    .eq("session_token", sessionToken)
    .single();

  if (!anonSession) throw new Error("Anonymous session not found or expired");

  // Mark it converted (audit trail, not deleted immediately — useful for
  // debugging failed generations post-signup)
  await supabase
    .from("anonymous_onboarding_sessions")
    .update({ converted_user_id: newUserId })
    .eq("session_token", sessionToken);

  // The actual business_profiles / website_generation_jobs writes happen
  // in /api/onboarding/complete exactly as in v1 §5.2, just reading
  // `anonSession.data` as the source instead of trusting a client-submitted
  // request body. NEVER trust the client body directly at this stage —
  // re-derive everything from the server-side anonymous session record.
}
```

This closes the loop: everything a visitor entered anonymously becomes their
real `business_profile` the instant they authenticate — no re-entry, no data
loss, no separate "resume" flow needed.

---

## 3. FLOW OVERVIEW (revised)

```
/start  (public, no auth, no account — this is the new marketing-adjacent entry point)
  ↓ anonymous session cookie created on first load
  
Step 1:  Business category            (grid, single-select, archetype pre-resolves here)
Step 2:  Services — name              (repeatable, "Add another service")
Step 3:  Services — description       (per service just entered, OR combined with Step 2 — see §4.2)
Step 4:  Conditional photo upload     (only if resolved archetype benefits — fully skippable)
Step 5:  Audience type                (single question, was bundled with location in v1)
Step 6:  Primary location             (single question, split from audience)
Step 7:  Brand vibe                   (single-select cards)
Step 8:  Business name                (moved from position 2 in v1 to here)
Step 9:  Handle                       (split from business name — was combined in v1)
Step 10: Platforms                    (multi-select, skippable)
Step 11: Your name                    ("What should Zuri call you" — LAST question, personalizes step 12)
  ↓
Step 12: Signup gateway               (Google OAuth or Email+Password — "Continue, {firstName}")
  ↓ signup succeeds → convertAnonymousSession() fires
  ↓
Step 13: Building your presence       (generation loading screen — same spirit as v1 Step 8, now
                                        fires only after a real account exists)
  ↓
/dashboard (live-generating or generated site)
```

13 steps total (up from 8), each single-question, each designed to fit within
a ~640px height budget with zero scroll on any device. This is intentional —
see Decision 6 in the Session Prompt. More, faster, easier steps beat fewer,
denser ones.

**No separate value-prop/framing screen precedes Step 1.** Step 1 (category
selection) is the hook. The instant the visitor taps a category, Zuri has
already demonstrated understanding — that's the "problem-solution" framing
happening through the interaction itself, not through marketing copy on a
screen they'd have to click through.

---

## 4. SCREEN-BY-SCREEN SPECIFICATION

### Global layout (applies to every step, Steps 1–12)

**Desktop (≥1025px):**
- Left 30% of viewport: static portrait image, `object-fit: cover`, full
  viewport height, no scroll. Sourced from `/public/onboarding/onboarding-hero.jpg`
  (or `/assets/` per final repo convention) — same single image for the
  entire flow, every step, no swapping.
- Right 70% of viewport: the step content, vertically centered, horizontally
  padded generously. This column scrolls only if truly necessary (it should
  never need to, per the height-budget constraint) but is not artificially
  height-locked in code — trust the content budget, don't clip content.

**Tablet and mobile (<1025px):**
- Image is completely absent (not shrunk, not repositioned — removed from
  the DOM/not rendered, full `display:none` equivalent).
- Step content is full-width, vertically centered, generous padding scaled
  down proportionally at the ≤480px breakpoint.

**Every step (all breakpoints) includes:**
- A minimal progress indicator (see §4.1 below — redesigned for 13 steps)
- Back navigation (text link, top-left of the content column, absent on
  Step 1)
- The single question/input for that step
- A Continue action (button or auto-advance — see per-step spec)
- NO footer, NO extraneous chrome, NO marketing copy competing with the
  question itself

### 4.1 Progress indicator (redesigned for 13 steps)

13 individual dots (v1's pattern) becomes visually noisy and undermines the
"punchy, instant" feeling. Replace with a **thin progress bar** instead —
a single horizontal line at the very top of the content column that fills
proportionally (`step / 13`), animates smoothly on advance (300ms ease),
and never shows discrete segments. This scales cleanly regardless of final
step count if steps are ever added/removed, and reads as "almost there"
rather than "here are 13 things to get through."

```tsx
function ProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const percent = (currentStep / totalSteps) * 100;
  return (
    <div className="h-[2px] w-full bg-white/10">
      <div
        className="h-full bg-gold transition-all duration-300 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
```

Step 13 (generation loading screen) hides the progress bar entirely, same
as v1's Step 8 behavior.

### 4.2 Step transitions

Slide + fade, 220ms, ease-in-out (slightly faster than v1's 250ms — the
whole flow needs to feel snappier given the step-count increase). Respect
`useReducedMotion()` exactly as v1 specified — fall back to a simple
150ms fade only.

---

### Step 1 — Business Category

Purpose: the opening hook. Deterministically pre-resolves the design
archetype. Everything downstream (service suggestions, conditional photo
prompts, even later template selection) inherits from this choice.

UI:
- Heading: **"What's your business about?"** (warmer, more conversational
  than v1's "What kind of business is it?" — reinforces the
  problem-solution frame: Zuri wants to understand them, not classify them)
- Compact grid, 2 columns × 5 rows on mobile (9 cards + implicit "Other" as
  the 9th), scaling to a wider grid on tablet/desktop — but card size stays
  modest/dense on every breakpoint per Decision 4 in the Session Prompt.
  This step is intentionally denser than later steps.
- Each card: Lucide icon (small, ~20px) + label only. NO descriptor text
  underneath (v1 had descriptors — cut them here specifically, to keep the
  grid compact enough for true no-scroll on small phones with 9 options).
- Single-select. Auto-advances 300ms after tap (no separate Continue button
  needed for this step — reinforces instant momentum from the very first
  interaction).

Card options (same 9 as v1, archetype mapping unchanged):

| Card | Icon | Label |
|---|---|---|
| 1 | UtensilsCrossed | Food & Hospitality |
| 2 | Scissors | Beauty & Wellness |
| 3 | Briefcase | Professional Services |
| 4 | Camera | Creative & Portfolio |
| 5 | ShoppingBag | Retail & Fashion |
| 6 | Zap | Technology |
| 7 | Stethoscope | Health & Medical |
| 8 | Calendar | Events & Booking |
| 9 | MoreHorizontal | Other |

On selection:
```typescript
const archetype = resolveArchetypeFromCategory(selectedCategory);
// Immediately PATCH the anonymous session with both businessType AND
// the pre-resolved archetype — downstream steps read archetype from
// session state, they don't re-derive it.
```

Validation: required, single-select, no text alternative.

---

### Step 2 — Services (name + description, repeatable)

Purpose: collect specific, real service data — the thing that makes
generated copy feel specific rather than generic, and drives which
service-card slots (of 6) actually render.

UI:
- Heading: **"What do you offer?"**
- A single repeatable field group, one visible "row" at a time by default
  to preserve the no-scroll budget:
  - Input 1: Service name (e.g. "Custom Cakes") — short text input
  - Input 2: Short description (e.g. "Birthday, wedding, and celebration
    cakes made to order") — short text input, live character counter
    showing "0 / 70"
  - "Add another service +" button below, which — when tapped — does NOT
    stack a new visible row underneath (that would break the no-scroll
    constraint past 2-3 services). Instead it **commits the current
    row as a completed chip** (collapsed to a small pill showing just the
    service name, tappable to re-expand/edit) and clears the two inputs
    for the next entry. This keeps the screen height constant regardless
    of how many services have been added.
  - Completed service chips display in a compact horizontal-wrap row above
    the active input pair, each with a small X to remove.
  - "Continue" button becomes active once at least 1 service is fully
    committed (name + description both non-empty).
- Suggested service names appear as tappable chips below the name input,
  sourced from `SERVICE_SUGGESTIONS` (same table as v1 §3, keyed by the
  archetype-mapped category from Step 1) — tapping one fills the name
  input instantly, cursor moves to description.

Validation:
- Minimum 1 fully-completed service (name + description) to continue
- Maximum 6 services (matches the template card-slot system exactly —
  this is a deliberate change from v1's cap of 8, since the templates only
  ever render 6 slots; collecting more than the system can display was
  always pointless)
- Service name: min 2, max 40 characters (trimmed)
- Service description: min 10, max 70 characters (trimmed) — **hard cap
  enforced live in the input** (character counter turns red and blocks
  further typing past 70, not just a warning) since this field maps
  directly to a template's `{{service_N_description}}` slot with its own
  layout-breaking risk if unbounded
- Same character/content rules as v1 (letters, numbers, spaces, hyphens,
  ampersands, forward slashes; no HTML/script content; case-insensitive
  duplicate name blocking)
- 7th service attempted: inline message "You've reached the maximum of 6
  services — that's exactly how many can appear on your website."
  (Explains *why* the cap exists, rather than presenting it as an
  arbitrary limit — reinforces the "Zuri understands the system" framing.)

---

### Step 3 — Conditional Photo Upload

Purpose: capture real business photography where it materially improves
the generated site, without forcing every business through an irrelevant
upload prompt. This step's *content* varies by the Step 1 archetype; the
step itself always appears (for consistency of flow position) but may
render as a lightweight "skip is totally fine" screen for archetypes with
no strong photo dependency.

**This is the highest-engineering-effort screen in the flow.** See §5 for
the full upload contract (validation, Cloudinary destination, aspect ratio
guidance).

UI (archetype-dependent prompt, using the resolved archetype from Step 1):

| Archetype | Primary upload prompt | Secondary (optional) |
|---|---|---|
| warm-sensory | "Add a few photos of your food or space" (Gallery, 1-4 images) | — |
| luxury-aspirational | "Have before-and-after photos? Add them here" (paired upload, 1-3 pairs) | Hero/about photo, single image |
| community-vibrant | "Got transformation photos from clients?" (paired upload, 1-3 pairs) | Hero/about photo, single image |
| editorial-bold | "Add a few photos of your products or space" (Gallery, 1-4 images) | — |
| portfolio-dramatic | "Show us a few pieces of your work" (Work grid, 1-6 images) | — |
| authority-minimal | "Add a photo of you or your workspace" (single hero/about image) | — |
| trust-professional | "Add a photo of your practice or clinic" (single hero/about image) | — |
| clean-modern | "Add a product screenshot or team photo" (single hero/about image) | — |

- Heading is archetype-specific per the table above.
- Subheading (all archetypes): **"This is completely optional — we'll use
  professional stock photography if you skip this."** State this
  explicitly and reassuringly. This is the single most important sentence
  in the onboarding flow for reducing drop-off anxiety at an upload step.
- Upload zone: drag-and-drop or tap-to-browse, shows live thumbnail
  previews as files are added, each removable.
- For Before/After archetypes specifically: two side-by-side upload slots
  per pair, clearly labeled "Before" / "After", with a visual connector
  between them so the pairing is unambiguous.
- "Skip for now" is always present, always a plain text link (not a
  de-emphasized button — genuinely equal-weight to uploading, no dark
  patterns), and always advances immediately with zero friction.
- Continue button is active regardless of whether anything was uploaded
  (skip is never blocked).

Client-side validation before any upload attempt reaches Cloudinary:
- File type: JPEG, PNG, WebP only — reject others immediately with
  "Please upload a JPEG, PNG, or WebP image."
- File size: reject over 10MB (matches Cloudinary's own limit — see the
  actual failure you hit during stock library seeding) with "This image is
  too large. Please use one under 10MB."
- Minimum resolution warning (non-blocking): if an uploaded image is under
  1200px on its shortest side, show an inline warning ("This image is a
  bit low-resolution — it may look soft on larger screens") but still
  allow upload. Never hard-block on resolution; some real business photos
  are genuinely all a user has, and stock fallback exists precisely so a
  soft, honest site still results even from imperfect source photos.
- Aspect ratio guidance shown as a subtle overlay hint on the upload zone
  itself (e.g. "Landscape photos work best here" for hero-type slots,
  "Square photos work best here" for gallery-type slots) — guidance only,
  never enforced/blocked, since Cloudinary's `g_auto` cropping handles
  imperfect ratios gracefully at serve time.

---

### Step 4 — Audience Type

Purpose: split from v1's combined audience+location step. Single question.

UI:
- Heading: **"Who are your customers?"**
- Multi-select cards, same 7 options as v1 §3 Step 5 Sub-section A
  (Young professionals, Families, Students, Corporate clients, Walk-in/local
  customers, Online customers, Everyone)
- Continue enabled once at least 1 selected

Validation: at least 1, no maximum.

---

### Step 5 — Primary Location

Purpose: split from Step 4. Single question.

UI:
- Heading: **"Where are they, mostly?"**
- Single-select chips, same options as v1 §3 Step 5 Sub-section B (Lagos,
  Abuja, Port Harcourt, Ibadan, Kano, Another Nigerian city [reveals text
  input], Nationwide, International)

Validation: exactly 1 selection; "another city" text follows v1's rules
(min 2, max 40 chars, letters and spaces only).

---

### Step 6 — Brand Vibe

Purpose: unchanged from v1 in intent, but now selects mode/lean/theme
*within* the already-resolved archetype (Decision 3), not the archetype
itself.

UI: identical to v1 §3 Step 6 — 6 visual cards with swatch strips, single
select. No content changes needed here; the *consumption* of this data
downstream changes (see `TEMPLATE_PROMPTS_V2.md` for how vibe maps to
mode/theme selection within the fixed archetype), not the screen itself.

---

### Step 7 — Business Name

Purpose: moved from position 2 in v1. By this point the visitor has
already invested 6 steps — naming their business now, rather than first,
means Zuri has already shown understanding before asking for the identity
that makes everything feel real and specific.

UI:
- Heading: **"What's it called?"** (short, casual — by this point the
  conversational tone is established, no need for a full sentence)
- Single text input, larger font, placeholder "e.g. Dan's Bakery"
- Continue enabled once valid

Validation: unchanged from v1 §3 Step 2 business name rules (min 2, max 80
chars, must contain a letter, allowed punctuation set, no emoji-only, no
number-only).

---

### Step 8 — Handle

Purpose: split from Step 7 (was combined in v1). Gets its own dedicated
moment since claiming a URL is a meaningfully different mental action than
naming a business, and deserves focus rather than being a second field
crammed under the name input.

UI:
- Heading: **"Almost yours — pick your web address"**
- Live display: "[handle].buildzuri.com" updating as they type
- Auto-filled from Step 7's business name using the same
  `generateHandle()` transformation logic from v1 §3 Step 2 — pre-filled
  when this step loads, not empty
- Editable, real-time availability check (same debounced 300ms pattern,
  same `/api/handle/check` endpoint — unchanged from v1)
- Green check / red X + suggestions, exactly as v1 specified

Validation: identical to v1 §3 Step 2 handle rules in full (length,
character set, reserved word list, hyphens, uniqueness check) — no changes
needed to the validation logic itself, only the screen layout (now
standalone rather than paired with business name).

---

### Step 9 — Platforms

Purpose: unchanged from v1 in intent and validation (fully skippable,
defaults to Instagram + Facebook if skipped).

UI: identical to v1 §3 Step 7 — multi-select platform cards, "I'll set
this up later" skip link, Continue always enabled.

---

### Step 10 — Your Name

Purpose: **the last onboarding question, immediately before the signup
gateway** (Decision 4/2 — deliberately placed here, not first, and not
folded into the signup form). Personalizes the signup CTA that follows
immediately.

UI:
- Heading: **"Last thing — what should we call you?"** (the word "last"
  is doing real work here — it signals the finish line, which matters
  psychologically right before asking someone to create an account)
- Single text input, placeholder "Your first name"
- Continue button reads **"Continue"** but is immediately followed by the
  signup screen where it becomes personalized (see Step 11)

Validation: unchanged from v1 §3 Step 1 (min 2, max 50 chars, letters only
including accented/African characters, no numbers/special chars/emoji).

---

### Step 11 — Signup Gateway

Purpose: the conversion moment. Everything before this was free, anonymous,
zero-commitment. This is the only screen in the entire flow that asks for
something in return for what's about to happen (generation).

UI:
- Heading: **"Continue, {firstName}"** — dynamically personalized from
  Step 10's answer. This single detail is the payoff of moving the name
  question to the end.
- Subheading: **"Create your account to see {businessName}'s website."**
  (also dynamically personalized, from Step 7) — names the specific,
  concrete thing about to happen, not a generic "sign up to continue."
- Primary action: **"Continue with Google"** button (OAuth), full-width,
  prominent
- Divider: "or"
- Secondary: email + password fields with a "Create Account" button
- Small print below: link to Terms/Privacy (required, unchanged from
  standard signup compliance)
- NO skip option here — this is the one mandatory gate in the entire flow,
  by design (Decision 1)

On successful signup (either method):
1. `convertAnonymousSession()` fires (§2.4) — anonymous data becomes the
   real `business_profiles` row
2. Immediately redirect to Step 12 (generation loading screen)
3. The anonymous session cookie is cleared (no longer needed post-conversion)

If signup fails (email taken, weak password, OAuth cancelled):
- Show inline error, keep all onboarding data intact (anonymous session
  cookie persists — nothing is lost by a failed signup attempt)
- User can retry immediately without re-entering any onboarding answers

---

### Step 12 — Building Your Presence (Generation Loading Screen)

Purpose: unchanged in spirit from v1 §3 Step 8, but now fires only after
a real, authenticated user exists — this is the point where Gemini calls
and the generation pipeline actually trigger.

UI: identical structure to v1 §3 Step 8 (ZuriSpinner, animated step labels
with checkmarks, 20-40s expected duration, graceful handling of slow/failed
generation via dashboard redirect + status card) — no changes to this
screen's content or behavior, only to *when* it's reachable (post-signup,
never before).

One addition: the step labels should reference the business by name where
natural, reinforcing specificity all the way through:
1. "Saving {businessName}'s profile..."
2. "Analysing your brand with AI..."
3. "Designing {businessName}'s website..."
4. "Writing your content..."
5. "Preparing your strategy..."
6. "You're almost ready..."

---

## 5. PHOTO UPLOAD — TECHNICAL CONTRACT

### 5.1 Upload destination

```
zuri-user-uploads/{anonymous_session_id_or_user_id}/{slot}-{timestamp}.{ext}
```

During the anonymous phase (Step 3 happens before signup), uploads are
temporarily associated with the **anonymous session id**, not a user id
(none exists yet). On successful signup and `convertAnonymousSession()`,
these Cloudinary assets are NOT re-uploaded — instead, their existing
`public_id`s are simply referenced going forward under the newly-created
`business_profile`/`website_images` records. Only the *database reference*
moves from session-scoped to user-scoped; the actual Cloudinary asset
stays exactly where it was uploaded.

```sql
CREATE TABLE IF NOT EXISTS onboarding_uploaded_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_session_token text REFERENCES anonymous_onboarding_sessions(session_token) ON DELETE CASCADE,
  slot_type text NOT NULL,          -- 'hero' | 'about' | 'gallery' | 'before' | 'after' | 'work'
  cloudinary_public_id text NOT NULL,
  cloudinary_url text NOT NULL,
  width integer,
  height integer,
  pair_index integer,                -- for before/after: groups a before+after into one pair
  created_at timestamptz DEFAULT now()
);

ALTER TABLE onboarding_uploaded_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON onboarding_uploaded_images
  FOR ALL USING (auth.role() = 'service_role');
```

On conversion (`convertAnonymousSession()`), rows matching the session
token are re-keyed to the new `user_id` and copied into the standard
`website_images` table (from `02_WEBSITE_BUILDER.md` §11) — the
onboarding-specific table is transitional scratch space, not permanent
storage.

### 5.2 Upload API

```typescript
// POST /api/onboarding/upload-image
// Body: multipart/form-data — { file: File, slot: string, sessionToken: string, pairIndex?: number }
// Public route (no auth) — protected instead by:
//   1. Valid, non-expired anonymous session token required
//   2. Rate limit: 20 uploads per anonymous session (generous for real use —
//      max realistic need is ~10 across all slot types — blocks abuse)
//   3. File type/size validation server-side (never trust client-side checks alone)

export async function POST(req: Request) {
  // 1. Validate session token exists and is not expired
  // 2. Validate file type (jpeg/png/webp) and size (<10MB) server-side
  // 3. Upload to Cloudinary under zuri-user-uploads/{sessionToken}/{slot}-{timestamp}
  // 4. Insert row into onboarding_uploaded_images
  // 5. Return { success: true, publicId, url, width, height }
}
```

### 5.3 Module-relevance mapping (drives which upload prompts Step 3 shows)

```typescript
// src/lib/onboarding/photo-prompts.ts
export const PHOTO_UPLOAD_CONFIG: Record<DesignArchetype, {
  primary: { label: string; slotType: string; minImages: number; maxImages: number } | null;
  pairedSlots: { label: string; beforeSlot: string; afterSlot: string; maxPairs: number } | null;
}> = {
  "warm-sensory": { primary: { label: "Add a few photos of your food or space", slotType: "gallery", minImages: 1, maxImages: 4 }, pairedSlots: null },
  "luxury-aspirational": { primary: null, pairedSlots: { label: "Have before-and-after photos?", beforeSlot: "before", afterSlot: "after", maxPairs: 3 } },
  "community-vibrant": { primary: null, pairedSlots: { label: "Got transformation photos from clients?", beforeSlot: "results_before", afterSlot: "results_after", maxPairs: 3 } },
  "editorial-bold": { primary: { label: "Add a few photos of your products or space", slotType: "gallery", minImages: 1, maxImages: 4 }, pairedSlots: null },
  "portfolio-dramatic": { primary: { label: "Show us a few pieces of your work", slotType: "work", minImages: 1, maxImages: 6 }, pairedSlots: null },
  "authority-minimal": { primary: { label: "Add a photo of you or your workspace", slotType: "about", minImages: 1, maxImages: 1 }, pairedSlots: null },
  "trust-professional": { primary: { label: "Add a photo of your practice or clinic", slotType: "about", minImages: 1, maxImages: 1 }, pairedSlots: null },
  "clean-modern": { primary: { label: "Add a product screenshot or team photo", slotType: "about", minImages: 1, maxImages: 1 }, pairedSlots: null },
};
```

---

## 6. STATE MANAGEMENT (revised for 13 steps + anonymous session)

```typescript
const STORAGE_KEY = "zuri_onboarding_v2";

interface OnboardingState {
  step: number;                    // 1-12 (13 is generation, not user-navigable)
  sessionToken: string;            // mirrors the anonymous session cookie value

  // Step 1
  businessCategory: string;
  resolvedArchetype: DesignArchetype;

  // Steps 2
  services: Array<{ name: string; description: string }>;

  // Step 3
  uploadedImages: Array<{ slotType: string; cloudinaryPublicId: string; pairIndex?: number }>;
  photoStepSkipped: boolean;

  // Step 4-5
  audienceTypes: string[];
  location: string;
  locationCity?: string;

  // Step 6
  brandVibe: string;

  // Step 7-8
  businessName: string;
  handle: string;

  // Step 9
  platforms: string[];

  // Step 10
  firstName: string;

  startedAt: string;
}
```

Re-entry behavior: unchanged in spirit from v1 §4, but now checks BOTH
localStorage AND the server-side `anonymous_onboarding_sessions` row
(keyed by the cookie's session token) — server copy wins if the two ever
disagree (handles the cross-device case), localStorage is used for
instant local re-render while the server copy is fetched to confirm/
reconcile. 72-hour expiry (matches the anonymous session TTL), not 48 —
extended slightly since the flow is now longer and a user may legitimately
need more time across more steps.

---

## 7. API ROUTES (new + changed from v1)

### 7.1 New — Start anonymous session

```typescript
// POST /api/onboarding/start
// No body needed. Creates anonymous_onboarding_sessions row, sets cookie.
// Returns: { sessionToken: string }
// Rate limited: 5 per ip_hash per 24h (see §2.3)
```

### 7.2 New — Save step progress

```typescript
// PATCH /api/onboarding/session
// Body: { sessionToken: string, step: number, data: Partial<OnboardingState> }
// Merges into anonymous_onboarding_sessions.data (jsonb), updates current_step
// Rate limited: 30 per session per hour (see §2.3)
// Debounced client-side: fire ~500ms after the user stops interacting with
// a step, not on every keystroke
```

### 7.3 New — Upload image

See §5.2 above.

### 7.4 Changed — Handle availability check

Unchanged from v1 §5.1 in full — no modifications needed, this endpoint
never depended on auth state to begin with.

### 7.5 Changed — Onboarding completion

This now fires from the Step 11 signup success handler, not from a
dedicated final step, and reads from the server-side anonymous session
instead of trusting a client-submitted body:

```typescript
// POST /api/onboarding/complete
// Body: { sessionToken: string }  — that's it, everything else is looked up server-side
// Called immediately after supabase.auth signup/OAuth callback succeeds

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionToken } = await req.json();

  // Pull the FULL onboarding state from the server-side anonymous session —
  // never trust a client-submitted OnboardingState body directly, exactly
  // the same principle as v1 but now the source of truth is the DB row,
  // not the request body itself.
  const serviceClient = createServiceClient();
  const { data: anonSession } = await serviceClient
    .from("anonymous_onboarding_sessions")
    .select("data, archetype")
    .eq("session_token", sessionToken)
    .single();

  if (!anonSession) {
    return NextResponse.json({ error: "Onboarding session not found or expired" }, { status: 400 });
  }

  const onboardingData = anonSession.data as OnboardingState;

  // ── Same server-side validation as v1 §5.2, applied to onboardingData
  // instead of a client body. All the same rules: business name, handle,
  // business type, services, location, platforms. Copy that validation
  // logic forward unchanged — it was already correctly server-side and
  // defensive, just re-point it at the DB-sourced object.

  // ── NEW: validate services as structured objects, not free tags
  const services = (onboardingData.services ?? [])
    .filter((s) => s.name?.trim().length >= 2 && s.description?.trim().length >= 10)
    .slice(0, 6)
    .map((s) => ({
      name: sanitizeText(s.name).slice(0, 40),
      description: sanitizeText(s.description).slice(0, 70),
    }));
  if (services.length === 0) {
    return NextResponse.json({ error: "At least one service is required" }, { status: 400 });
  }

  // ── Brand extraction, business_profiles upsert, website_generation_jobs
  // insert, and the fire-and-forget generation + calendar-seed triggers all
  // proceed exactly as in v1 §5.2 — no changes to that logic, only to where
  // the input data comes from.

  // ── NEW: migrate onboarding_uploaded_images -> website_images, re-keyed
  // to the new user_id
  await serviceClient.rpc("migrate_onboarding_images_to_user", {
    p_session_token: sessionToken,
    p_user_id: user.id,
  });

  // ── Mark anonymous session converted (§2.4)
  await serviceClient
    .from("anonymous_onboarding_sessions")
    .update({ converted_user_id: user.id })
    .eq("session_token", sessionToken);

  // (rest identical to v1: job insert, fire-and-forget triggers, response)
}
```

---

## 8. DATABASE SCHEMA ADDITIONS (v2, on top of v1's §7)

```sql
-- ============================================================
-- ANONYMOUS ONBOARDING SESSIONS (see §2.2)
-- ============================================================
-- (full schema already given in §2.2 above — reproduced here for the
-- migration file, no changes)

-- ============================================================
-- ONBOARDING UPLOADED IMAGES (see §5.1)
-- ============================================================
-- (full schema already given in §5.1 above)

-- ============================================================
-- MIGRATION FUNCTION — onboarding images to permanent user images
-- ============================================================
CREATE OR REPLACE FUNCTION migrate_onboarding_images_to_user(
  p_session_token text,
  p_user_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO website_images (user_id, storage_path, public_url, slot, created_at)
  SELECT p_user_id, cloudinary_public_id, cloudinary_url, slot_type, now()
  FROM onboarding_uploaded_images
  WHERE anonymous_session_token = p_session_token;
END;
$$;

-- ============================================================
-- CRON — purge expired anonymous sessions (privacy hygiene)
-- ============================================================
-- Runs daily via /api/cron/purge-expired-sessions
-- DELETE FROM anonymous_onboarding_sessions WHERE expires_at < now();
-- ON DELETE CASCADE on onboarding_uploaded_images handles cleanup of
-- orphaned upload records automatically.

-- ============================================================
-- BUSINESS_PROFILES — one addition
-- ============================================================
-- Services now stored as structured jsonb, not a flat text[] array,
-- since each service now carries both name AND description.
ALTER TABLE business_profiles
  ALTER COLUMN services TYPE jsonb USING (
    CASE
      WHEN services IS NULL THEN '[]'::jsonb
      ELSE to_jsonb(services)  -- migration path for any pre-v2 rows; new
                                -- rows write [{ "name": "...", "description": "..." }]
                                -- directly as jsonb from the start
    END
  );
```

---

## 9. UPDATED GLOBAL TYPES

```typescript
// src/types/brand.ts — supersedes the `services: string[]` field from v1

export interface ServiceEntry {
  name: string;
  description: string;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  industry: string;
  business_type: string;
  services: ServiceEntry[];   // CHANGED from string[]
  target_audience: string;
  location: string;
  location_city: string | null;
  brand_tone: string;
  unique_value: string;
  tagline: string;
  brand_vibe: string;
  archetype: DesignArchetype;  // NEW — pre-resolved at Step 1, stored explicitly
                                // rather than re-derived downstream
  color_primary: string;
  color_accent: string;
  platforms: string[];
}
```

Every downstream consumer of `business_profiles.services` (brand
extraction prompt, placeholder-filling prompt in
`TEMPLATE_PROMPTS_V2.md`) must be updated to read
`services[i].name` / `services[i].description` instead of a flat string
array. Flag any remaining `services.join(", ")`-style code as a bug — it
will silently drop the description data.

---

## 10. COMPLETE ERROR HANDLING — ONBOARDING V2 (additions to v1 §9)

| Scenario | Handling | User-Facing Message |
|---|---|---|
| Anonymous session cookie missing on any step beyond Step 1 | Treat as a fresh start — create new session, redirect to Step 1 | Redirected silently |
| Anonymous session expired (>72h) mid-flow | Clear localStorage, create new session, redirect to Step 1 with a brief notice | "Your session expired — let's start fresh, it's quick!" |
| Device switch mid-flow (server data exists, local does not) | Fetch server copy, restore to `current_step`, populate localStorage from it | "Welcome back! Continuing where you left off." |
| Photo upload fails (network) | Keep the file in a local retry queue, show inline retry button, never block Continue/Skip | "Upload failed. [Retry] or skip for now." |
| Photo upload exceeds 20-per-session rate limit | Block further uploads, allow skip | "You've uploaded the maximum number of photos for now." |
| Signup: Google OAuth cancelled/fails | Return to Step 11 with all onboarding data intact, show retry | "Sign-in didn't complete. Please try again." |
| Signup: email already registered | Show inline error with a "Log in instead" link that, on success, still runs `convertAnonymousSession()` against the now-authenticated existing user | "This email is already registered. [Log in]" |
| Signup succeeds but `convertAnonymousSession()` fails server-side | Log error, still redirect to dashboard, flag account for manual review; NEVER show the user a broken/error state right after they successfully created an account | "Welcome! We're finishing up your website — check your dashboard in a moment." |
| Services: fewer than 1 fully completed when Continue tapped | Block, focus the incomplete field | "Add at least one service to continue." |
| Services: description exceeds 70 characters | Input hard-blocks further typing, counter turns red | "Keep it under 70 characters — short and punchy works best." |
| Step 3 (photo upload): unsupported archetype somehow reaches this step (defensive case) | Fall back to a generic "Add a photo of your business" single-image prompt rather than erroring | No visible error — degrades gracefully |

---

## 11. UPDATED IMPLEMENTATION ORDER

1. `src/lib/onboarding/anonymous-session.ts`
2. Database migrations: `anonymous_onboarding_sessions`,
   `onboarding_uploaded_images`, `business_profiles.services` type change,
   `migrate_onboarding_images_to_user` function
3. `POST /api/onboarding/start`
4. `PATCH /api/onboarding/session`
5. `POST /api/onboarding/upload-image` (depends on Cloudinary config from
   the Session Prompt §5 — already live, just wire this route to it)
6. `GET /api/handle/check` — unchanged, carry forward from v1 as-is
7. `POST /api/onboarding/complete` — rewritten per §7.5 above
8. `src/lib/onboarding/photo-prompts.ts` (§5.3 config)
9. `src/components/onboarding/SelectionCard.tsx`,
   `ServiceRepeaterInput.tsx` (new, replaces v1's `TagInput.tsx`),
   `PhotoUploadZone.tsx` (new), `HandleInput.tsx` (carried forward)
10. `src/components/onboarding/steps/` — all 12 step components
    (Step1Category through Step10Name; Step11Signup; Step12Building)
11. `src/components/onboarding/OnboardingShell.tsx` — updated for the new
    thin progress bar (§4.1) and the desktop split-screen layout (§4
    global layout spec)
12. `src/app/(marketing)/start/page.tsx` — NEW public route, replaces
    `(auth)/onboarding/page.tsx` as the entry point (this flow now lives
    outside the auth route group since it's pre-signup)
13. `src/app/(auth)/onboarding/page.tsx` reduced to just Step 11 (signup)
    + Step 12 (generation) — the authenticated tail end of the flow
14. Cron: `/api/cron/purge-expired-sessions`
15. Update auth callback redirect logic: post-signup, check for a pending
    anonymous session token (from a cookie or query param carried through
    the OAuth redirect) and fire `convertAnonymousSession()` before
    routing to dashboard

---

## 12. ENVIRONMENT VARIABLES (additions to v1 §14)

```env
# Already required from v1, unchanged:
INTERNAL_API_SECRET=...

# NEW — image infrastructure (already provisioned per Session Prompt §5)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dzuvmw4l
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```
