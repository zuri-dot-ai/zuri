# ZURI — ONBOARDING SYSTEM
# Complete specification for the user onboarding flow: screens, validation, brand extraction, and post-onboarding pipeline trigger

---

## 1. ONBOARDING PHILOSOPHY

The onboarding has one job: collect enough data to generate a website and content strategy, then get out of the way. It must feel effortless — no long forms, no dropdowns, no walls of text. Every screen asks one thing. The user should be on their dashboard in under 3 minutes.

Reference bar: Squarespace (visual card selections), Linear (speed and minimalism), Notion (progressive disclosure).

Voice intake is NOT used. It added complexity without meaningful benefit. All intake is visual card selection + short text inputs.

---

## 2. FLOW OVERVIEW

```
/signup or /login
  ↓ (auth complete)
Check profiles.onboarding_completed
  ↓ false → /onboarding
  ↓ true  → /dashboard

/onboarding (8 steps, single-page with animated transitions)
  Step 1: Your name
  Step 2: Business name + handle
  Step 3: Business type (card selection)
  Step 4: Services (tag input)
  Step 5: Your customers (card selection)
  Step 6: Brand vibe (card selection)
  Step 7: Platforms (multi-select cards)
  Step 8: Building your presence (generation loading screen)
  ↓
/dashboard (with website generation status card)
```

Two entry paths exist:

Path A — Free signup (from marketing homepage):
User signs up → onboards → lands on dashboard on Free plan → website preview visible but not published → upgrade prompt to publish.

Path B — Paid signup (from /pricing):
User selects plan on /pricing → redirected to Flutterwave → payment succeeds → redirected to /onboarding with query param `?plan=pro` (or growth/premium) → onboards → website generates and publishes automatically → lands on dashboard with live site.

The onboarding UI itself is identical for both paths. Path is determined by the presence of the `plan` query param and a verified payment in the DB.

---

## 3. SCREEN-BY-SCREEN SPECIFICATION

### Step 1 — Your Name

Purpose: personalise the experience from the first second.

UI:
- Heading: "Welcome to Zuri. What should we call you?"
- Single text input: placeholder "Your first name"
- No label above the input (heading IS the label)
- Gold "Continue" button, disabled until field is non-empty
- No back button on this step (it's the first)

Validation:
- Required
- Min 2 characters, max 50 characters after trim
- Letters only (including accented/African characters: àáâãäåæçèéêëìíîïðñòóôõöùúûüý and equivalents)
- No numbers, no special characters, no emojis
- Error: "Please enter your name using letters only."
- On continue: saved to localStorage as `onboarding.firstName`

---

### Step 2 — Business Name + Handle

Purpose: establish the brand identity and claim the deployment URL.

UI:
- Heading: "What's your business called?"
- Input 1: Business name (text input, larger font)
  - Placeholder: "e.g. Dan's Bakery"
- Input 2: Handle (text input, smaller, below business name)
  - Label above: "Your Zuri address"
  - Display: "[handle].zuri.com" shown live as user types
  - Auto-fills from business name (see transformation rules below)
  - Editable — user can override
  - Real-time availability indicator (green check / red x + suggestions)
- Back button (top left, text link "← Back")
- Continue button: disabled until both fields are valid AND handle is available

Business name validation:
- Required
- Min 2 characters, max 80 characters (after trim)
- Allowed characters: letters (including accented), numbers, spaces, apostrophes ('), hyphens (-), ampersands (&), periods (.)
- Cannot be ONLY numbers
- Cannot be ONLY spaces or special characters
- Cannot be ONLY emojis — must contain at least one letter
- Strip leading/trailing whitespace on submit
- Error examples:
  - "123" → "Please include at least one letter in your business name."
  - "!!!" → "Business name can only contain letters, numbers, and basic punctuation."
  - "😀" → "Please enter your business name using text characters."
  - Too long → "Business name must be 80 characters or fewer."

Handle auto-generation from business name:
```typescript
function generateHandle(businessName: string): string {
  return businessName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip accents
    .replace(/[^a-z0-9\s-]/g, "")      // remove all non-alphanumeric except spaces and hyphens
    .trim()
    .replace(/\s+/g, "-")              // spaces to hyphens
    .replace(/-{2,}/g, "-")            // collapse consecutive hyphens
    .replace(/^-+|-+$/g, "")          // strip leading/trailing hyphens
    .slice(0, 30);                     // enforce max length
}

// Examples:
// "Dan's Bakery" → "dans-bakery"
// "Ọlá & Sons" → "la-sons"  (accents stripped, & removed)
// "M.D Consulting" → "md-consulting"
// "ZURI Tech" → "zuri-tech"
```

Handle validation:
- Required
- Min 3 characters, max 30 characters
- Only: lowercase letters a-z, numbers 0-9, hyphens (-)
- Cannot start with a hyphen
- Cannot end with a hyphen
- Cannot have consecutive hyphens (--)
- Cannot be a reserved word (see reserved list below)
- Must be unique in the database (real-time check)
- Once a website is published: handle is permanently locked — it cannot be changed (inform user with tooltip: "Your handle can be changed in Settings before you publish. After publishing, it's permanent.")
- Error messages:
  - Contains uppercase → auto-converted, no error shown
  - Contains spaces → auto-converted to hyphens, no error shown
  - Contains special characters → auto-stripped, no error shown
  - Too short → "Handle must be at least 3 characters."
  - Too long → "Handle must be 30 characters or fewer."
  - Starts/ends with hyphen → "Handle cannot start or end with a hyphen."
  - Consecutive hyphens → "Handle cannot contain consecutive hyphens."
  - Reserved word → "This handle is reserved. Please choose a different one."
  - Taken → "This handle is taken. Try: [suggestion1], [suggestion2], [suggestion3]"

Reserved handles (block all of these):
```typescript
const RESERVED_HANDLES = new Set([
  "admin", "api", "app", "www", "mail", "ftp", "blog", "shop", "store",
  "help", "support", "terms", "privacy", "about", "contact", "pricing",
  "login", "signup", "register", "logout", "profile", "settings", "account",
  "billing", "upgrade", "zuri", "team", "agency", "agencies", "careers",
  "press", "media", "legal", "dashboard", "onboarding", "payment", "callback",
  "verify", "auth", "oauth", "webhook", "cron", "internal", "static",
  "assets", "images", "fonts", "icons", "null", "undefined", "test",
  "demo", "example", "sample", "placeholder", "dev", "staging", "prod",
  "production", "health", "status", "monitor", "metrics", "analytics",
]);
```

Handle suggestion generation (when handle is taken):
```typescript
function generateHandleSuggestions(handle: string): string[] {
  const base = handle.replace(/-\d+$/, ""); // strip trailing number if already added
  return [
    `${base}-ng`,
    `${base}-hq`,
    `${base}1`,
  ].filter(h => h.length <= 30);
}
```

Real-time availability check:
- Debounced: 300ms after user stops typing
- GET /api/handle/check?handle=xxx
- Shows spinner while checking
- Green checkmark if available, red X if taken (with suggestions shown inline)
- Continue button stays disabled while check is pending

---

### Step 3 — Business Type

Purpose: map the business to a design archetype. This single selection controls the website template pool, font pairing, color bias, image style, and copy tone.

UI:
- Heading: "What kind of business is it?"
- Grid of visual cards (2 columns on mobile, 4 columns on desktop)
- Each card: icon (Lucide) + label + short descriptor
- Single select — tapping a card selects it and enables Continue
- No Continue button required if single-tap auto-advances after 300ms (optional UX enhancement)

Card options:

| Card | Icon | Label | Descriptor | Maps to Archetype |
|---|---|---|---|---|
| 1 | UtensilsCrossed | Food & Hospitality | Restaurant, bakery, catering, café | warm-sensory |
| 2 | Scissors | Beauty & Wellness | Salon, spa, skincare, fitness | luxury-aspirational or community-vibrant |
| 3 | Briefcase | Professional Services | Consultant, lawyer, accountant, coach | authority-minimal |
| 4 | Camera | Creative & Portfolio | Photographer, designer, artist, musician | portfolio-dramatic |
| 5 | ShoppingBag | Retail & Fashion | Clothing, accessories, boutique, brand | editorial-bold |
| 6 | Zap | Technology | App, software, startup, digital agency | clean-modern |
| 7 | Stethoscope | Health & Medical | Clinic, pharmacy, doctor, therapist | trust-professional |
| 8 | Calendar | Events & Booking | Venue, planner, class, appointment | community-vibrant or authority-minimal |
| 9 | MoreHorizontal | Other | Anything else | authority-minimal (fallback) |

The archetype resolver in the website builder will use both this selection AND the services list (Step 4) to determine the final archetype. This card is the primary signal.

---

### Step 4 — Your Services

Purpose: collect specific service names that will appear verbatim in the generated website copy and content calendar.

UI:
- Heading: "What do you offer?"
- Subheading: "Add your main services or products."
- Tag input: type a service → press Enter or comma to add as a tag
- Suggested tags appear below the input based on Step 3 selection (clickable chips)
- Tags shown as gold-bordered chips with an X to remove
- Character counter showing "3 of 8 services added"

Suggested tags by business type (shown as clickable prompts, not pre-filled):
```typescript
const SERVICE_SUGGESTIONS: Record<string, string[]> = {
  "food-hospitality": ["Dine-in", "Takeaway", "Catering", "Event catering", "Delivery", "Private dining", "Baking classes", "Custom cakes"],
  "beauty-wellness": ["Haircuts", "Braiding", "Makeup", "Facials", "Manicure", "Pedicure", "Massage", "Personal training"],
  "professional-services": ["Consulting", "Strategy sessions", "Business advisory", "Financial planning", "Legal advice", "Coaching", "Auditing"],
  "creative-portfolio": ["Photography", "Videography", "Graphic design", "Brand identity", "Music production", "Illustration", "Film production"],
  "retail-fashion": ["Ready-to-wear", "Custom tailoring", "Accessories", "Footwear", "Streetwear", "Corporate wear"],
  "technology": ["Web development", "Mobile apps", "UI/UX design", "Digital marketing", "SEO", "SaaS products", "IT support"],
  "health-medical": ["General consultation", "Dental care", "Physiotherapy", "Pharmacy", "Lab tests", "Home visits"],
  "events-booking": ["Event planning", "Venue hire", "DJ services", "Photography", "Decoration", "Class bookings", "Workshop facilitation"],
  "other": [],
};
```

Validation:
- Required: minimum 1 service
- Maximum 8 services
- Each tag: min 2 characters, max 50 characters (after trim)
- Allowed: letters, numbers, spaces, hyphens, ampersands, forward slashes
- Blocked: HTML tags, script content, SQL keywords as standalone entries (DROP, SELECT, INSERT, DELETE)
- No duplicate tags (case-insensitive comparison — "Photography" and "photography" count as the same)
- Duplicate entered: silently ignore, do not show error, do not add the tag
- If user tries to add a 9th: show inline message "You've reached the maximum of 8 services. Remove one to add another."
- Error for invalid characters: "Service names can only contain letters, numbers, and basic punctuation."
- Error for too short: "Service name must be at least 2 characters."

---

### Step 5 — Your Customers

Purpose: establish target audience and primary market for use in website copy and content strategy.

UI:
- Heading: "Who do you serve?"
- Two sub-sections:

Sub-section A: Audience type (multi-select cards, min 1 required)
- Young professionals
- Families
- Students
- Corporate clients
- Walk-in / local customers
- Online customers (nationwide or global)
- Everyone (general public)

Sub-section B: Primary location (single-select chips, required)
- Lagos
- Abuja
- Port Harcourt
- Ibadan
- Kano
- Another Nigerian city (text input appears: "Which city?")
- Nationwide
- International

Both sub-sections must have a selection before Continue is enabled.

Validation:
- Audience type: at least 1 selected, max all
- Location: exactly 1 selected
- "Another Nigerian city" text: min 2 chars, max 40 chars, letters and spaces only

---

### Step 6 — Brand Vibe

Purpose: seed the design system palette and motion style for the website builder.

UI:
- Heading: "How should your brand feel?"
- 6 visual cards, each showing:
  - A small 3-color swatch strip (showing the palette family)
  - A short label
  - A one-line descriptor
- Single select

| Card | Label | Descriptor | Palette bias | Maps to |
|---|---|---|---|---|
| 1 | Bold & Vibrant | Strong, energetic, stands out | Warm: red/orange/gold | bold_energetic |
| 2 | Clean & Modern | Minimal, sharp, tech-forward | Cool: blue/white/gray | crisp_modern |
| 3 | Warm & Friendly | Approachable, cozy, inviting | Warm: terracotta/cream/amber | bold_energetic |
| 4 | Elegant & Luxurious | Premium, refined, exclusive | Neutral: black/gold/cream | slow_elegant |
| 5 | Professional & Trustworthy | Credible, calm, reliable | Cool: navy/white/steel | crisp_modern |
| 6 | Creative & Artistic | Expressive, unique, unconventional | High contrast: black/bright accent | slow_elegant |

This selection is stored as `brand_vibe` in the business_profile. The archetype resolver uses it alongside the business type to pick the final palette.

---

### Step 7 — Platforms

Purpose: know which social platforms to build a content strategy for.

UI:
- Heading: "Where do you want to show up?"
- Subheading: "Choose all that apply. You can change this later."
- Multi-select cards with platform icons (use Lucide or inline SVG logos)
  - Instagram
  - Facebook
  - LinkedIn
  - X (Twitter)
  - TikTok
- Note below: "Platform availability depends on your plan. You can adjust this at any time."
- Skip link: "I'll set this up later →" (optional step — if skipped, defaults to Instagram + Facebook)
- Continue button: enabled with 0 selections (skip is allowed here)

No validation required — this is a preference, not a requirement. If nothing selected, default to ["instagram", "facebook"].

---

### Step 8 — Building Your Presence (Generation Loading Screen)

Purpose: submit all collected data, trigger brand extraction + website generation, and give the user something to watch while it runs.

UI:
- ZuriSpinner (Zuri favicon spinning, 64px)
- Animated step labels with checkmarks as each step completes:
  1. "Saving your brand profile..." (immediate, ~0.5s)
  2. "Analysing your brand with AI..." (Gemini Flash brand extraction, ~2-4s)
  3. "Designing your website..." (Pass 1 of composition pipeline, ~5-10s)
  4. "Writing your content..." (Pass 2 of composition pipeline, ~8-15s)
  5. "Preparing your strategy..." (content calendar seed, ~2-3s)
  6. "You're almost ready..." (final DB writes)
- Total expected time: 20-40 seconds
- Progress is animated even if the actual step hasn't completed — never show a stalled progress indicator
- If generation takes longer than 45 seconds: show "This is taking a little longer than usual. We'll notify you when it's ready." and redirect to dashboard with a "Generating..." status card
- If generation fails: redirect to dashboard with a "Generation failed" card showing a retry button — do NOT show an error on this screen and do NOT block the user

This screen fires the /api/onboarding/complete API call on mount (useEffect, runs once). No user interaction required.

---

## 4. STATE MANAGEMENT

All onboarding data is stored in localStorage until Step 8 submits it to the server. This prevents data loss on refresh or accidental navigation.

```typescript
// localStorage keys
const STORAGE_KEY = "zuri_onboarding";

interface OnboardingState {
  step: number;           // Current step (1-7)
  firstName: string;
  businessName: string;
  handle: string;
  businessType: string;
  services: string[];
  audienceTypes: string[];
  location: string;
  locationCity?: string;
  brandVibe: string;
  platforms: string[];
  startedAt: string;      // ISO timestamp
}

// Read
const saved = localStorage.getItem(STORAGE_KEY);
const state: OnboardingState = saved ? JSON.parse(saved) : defaultState;

// Write (on every step completion)
localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));

// Clear (after successful submission)
localStorage.removeItem(STORAGE_KEY);
```

Re-entry behavior (user leaves and comes back):
- On /onboarding mount: check localStorage for saved state
- If saved state exists AND step < 8:
  - If startedAt is less than 48 hours ago: restore to the saved step with a banner "Welcome back! Continue where you left off."
  - If startedAt is more than 48 hours ago: clear saved state and start from Step 1
- If no saved state: start from Step 1

Session expiry during onboarding:
- If the user's auth session expires while on /onboarding: save current state to localStorage (if not already done), redirect to /login, and after re-auth redirect back to /onboarding (the saved state will restore the progress).

---

## 5. API ROUTES

### 5.1 Handle Availability Check

```typescript
// GET /api/handle/check?handle=xxx
// Returns: { available: boolean, suggestions?: string[] }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("handle")?.toLowerCase().trim();

  if (!handle) {
    return NextResponse.json({ error: "Handle required" }, { status: 400 });
  }

  // Validate format before checking DB
  const handleRegex = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
  if (!handleRegex.test(handle)) {
    return NextResponse.json({ available: false, reason: "invalid_format" });
  }

  if (RESERVED_HANDLES.has(handle)) {
    return NextResponse.json({
      available: false,
      reason: "reserved",
      suggestions: generateHandleSuggestions(handle),
    });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("handle")
    .eq("handle", handle)
    .single();

  if (data) {
    return NextResponse.json({
      available: false,
      reason: "taken",
      suggestions: generateHandleSuggestions(handle),
    });
  }

  return NextResponse.json({ available: true });
}
```

### 5.2 Onboarding Completion

```typescript
// POST /api/onboarding/complete
// Body: full OnboardingState (all 7 steps of data)
// Returns: { success: boolean, websiteJobId?: string }

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // ── Server-side validation (never trust client) ──────────────────────────

  const errors: string[] = [];

  // First name
  const firstName = sanitizeText(body.firstName);
  if (!firstName || firstName.length < 2) errors.push("Invalid first name");

  // Business name
  const businessName = sanitizeText(body.businessName);
  if (!businessName || businessName.length < 2 || businessName.length > 80) {
    errors.push("Invalid business name");
  }
  if (!businessName || !/[a-zA-Z]/.test(businessName)) {
    errors.push("Business name must contain at least one letter");
  }

  // Handle
  const handle = body.handle?.toLowerCase().trim();
  const handleRegex = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
  if (!handle || !handleRegex.test(handle)) {
    errors.push("Invalid handle format");
  }
  if (RESERVED_HANDLES.has(handle)) {
    errors.push("Handle is reserved");
  }

  // Check handle uniqueness (double-check — race condition safety)
  const { data: existingHandle } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .neq("id", user.id) // allow if it's already this user's handle
    .single();
  if (existingHandle) errors.push("Handle is already taken");

  // Business type
  const validBusinessTypes = [
    "food-hospitality", "beauty-wellness", "professional-services",
    "creative-portfolio", "retail-fashion", "technology",
    "health-medical", "events-booking", "other",
  ];
  if (!validBusinessTypes.includes(body.businessType)) {
    errors.push("Invalid business type");
  }

  // Services
  const services: string[] = (body.services ?? [])
    .map((s: string) => sanitizeText(s))
    .filter((s: string) => s.length >= 2 && s.length <= 50)
    .slice(0, 8); // hard cap at 8 even if client sent more
  if (services.length === 0) errors.push("At least one service is required");

  // Location
  const validLocations = [
    "lagos", "abuja", "port-harcourt", "ibadan", "kano", "other-city", "nationwide", "international",
  ];
  if (!validLocations.includes(body.location)) errors.push("Invalid location");

  // Platforms (optional — default if empty)
  const validPlatforms = ["instagram", "facebook", "linkedin", "x", "tiktok"];
  const platforms: string[] = (body.platforms ?? [])
    .filter((p: string) => validPlatforms.includes(p))
    .slice(0, 5);
  const finalPlatforms = platforms.length > 0 ? platforms : ["instagram", "facebook"];

  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  // ── Step 1: Run Gemini brand extraction ────────────────────────────────────

  let enrichedBrand;
  try {
    enrichedBrand = await extractBrandProfile({
      businessName,
      businessType: body.businessType,
      services,
      audienceTypes: body.audienceTypes,
      location: body.location,
      locationCity: body.locationCity,
      brandVibe: body.brandVibe,
    });
  } catch (err) {
    console.error("Brand extraction failed, using raw data:", err);
    // Graceful fallback — do not fail onboarding
    enrichedBrand = {
      industry: body.businessType,
      unique_value: `${businessName} offers quality ${services.slice(0, 2).join(" and ")}.`,
      brand_tone: "professional",
      tagline_suggestion: `Your trusted ${body.businessType.replace("-", " ")} partner.`,
      color_primary_suggestion: "#C9A84C",
      color_accent_suggestion: "#0C0C0E",
      target_audience_refined: body.audienceTypes.join(", "),
    };
  }

  // ── Step 2: Save to database ───────────────────────────────────────────────

  // Update profile
  await supabase.from("profiles").upsert({
    id: user.id,
    full_name: firstName,
    handle,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  // Create business profile
  const { data: bizProfile, error: bizError } = await supabase
    .from("business_profiles")
    .upsert({
      user_id: user.id,
      business_name: businessName,
      industry: enrichedBrand.industry,
      business_type: body.businessType,
      services,
      target_audience: enrichedBrand.target_audience_refined,
      location: body.location,
      location_city: body.locationCity ?? null,
      brand_tone: enrichedBrand.brand_tone,
      unique_value: enrichedBrand.unique_value,
      tagline: enrichedBrand.tagline_suggestion,
      brand_vibe: body.brandVibe,
      color_primary: enrichedBrand.color_primary_suggestion,
      color_accent: enrichedBrand.color_accent_suggestion,
      platforms: finalPlatforms,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (bizError) {
    console.error("Business profile save error:", bizError);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }

  // ── Step 3: Queue website generation ──────────────────────────────────────

  // Insert a generation job record
  const { data: job } = await supabase.from("website_generation_jobs").insert({
    user_id: user.id,
    status: "queued",
    business_profile_id: bizProfile.id,
  }).select().single();

  // Trigger async generation (fire and forget)
  // Uses waitUntil from @vercel/functions if available, otherwise just fire
  const generationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/ai/compose-website`;
  fetch(generationUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET!,
    },
    body: JSON.stringify({ userId: user.id, jobId: job?.id }),
  }).catch((err) => console.error("Website generation trigger failed:", err));

  // ── Step 4: Seed content calendar ─────────────────────────────────────────

  // Async — fire and forget. Content strategy MD covers this in detail.
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/content/seed-calendar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET!,
    },
    body: JSON.stringify({ userId: user.id }),
  }).catch((err) => console.error("Calendar seed trigger failed:", err));

  return NextResponse.json({ success: true, jobId: job?.id });
}
```

---

## 6. BRAND EXTRACTION (GEMINI FLASH CALL)

This is a single, fast Gemini Flash call that enriches the raw onboarding data into a structured brand profile. It runs server-side within the /api/onboarding/complete route.

```typescript
// src/lib/onboarding/brand-extractor.ts

import { geminiJSON } from "@/lib/gemini";

interface RawOnboardingData {
  businessName: string;
  businessType: string;
  services: string[];
  audienceTypes: string[];
  location: string;
  locationCity?: string;
  brandVibe: string;
}

interface EnrichedBrandProfile {
  industry: string;
  unique_value: string;
  brand_tone: string;
  tagline_suggestion: string;
  color_primary_suggestion: string;
  color_accent_suggestion: string;
  target_audience_refined: string;
}

export async function extractBrandProfile(data: RawOnboardingData): Promise<EnrichedBrandProfile> {
  const locationLabel = data.locationCity
    ? `${data.locationCity}, Nigeria`
    : data.location === "nationwide"
    ? "Nigeria (nationwide)"
    : data.location === "international"
    ? "International market"
    : `${data.location}, Nigeria`;

  const prompt = `
You are a brand strategist specialising in African small businesses. Given the data below
from a Nigerian entrepreneur, output a clean, specific brand profile.

Business name: ${data.businessName}
Business type: ${data.businessType}
Services offered: ${data.services.join(", ")}
Target audience: ${data.audienceTypes.join(", ")}
Location: ${locationLabel}
Desired brand vibe: ${data.brandVibe}

Output ONLY valid JSON with these exact keys. No markdown, no preamble, no explanation:
{
  "industry": "clean industry category (e.g. 'Food & Beverage', 'Beauty & Personal Care', 'Legal Services')",
  "unique_value": "one specific sentence about what makes this business valuable. Must mention the business name.",
  "brand_tone": "exactly one of: professional | friendly | bold | elegant | energetic | trustworthy",
  "tagline_suggestion": "a memorable 5-9 word tagline specific to this business. Not generic.",
  "color_primary_suggestion": "#hex — a primary brand color appropriate for the vibe and industry",
  "color_accent_suggestion": "#hex — a complementary accent color",
  "target_audience_refined": "a 1-2 sentence description of the ideal customer for this business in Nigeria"
}

Rules:
- tagline must NOT be a cliché like 'Quality you can trust' or 'Excellence in everything'
- tagline must feel earned by THIS specific business
- color_primary must contrast well against a near-black (#0C0C0E) background
- brand_tone must be exactly one of the six options listed, nothing else
- Do not fabricate specific claims (no revenue figures, no years in business) unless given
`;

  return geminiJSON<EnrichedBrandProfile>(prompt, "flash");
}
```

---

## 7. DATABASE SCHEMA ADDITIONS

```sql
-- ============================================================
-- PROFILES (additions to existing table)
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS handle text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS handle_locked boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Handle index
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON profiles(handle);

-- ============================================================
-- BUSINESS PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name text NOT NULL,
  industry text,
  business_type text NOT NULL,
  services text[] NOT NULL DEFAULT '{}',
  target_audience text,
  location text,
  location_city text,
  brand_tone text,
  unique_value text,
  tagline text,
  brand_vibe text,
  color_primary text,
  color_accent text,
  platforms text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own business profile"
  ON business_profiles FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- WEBSITE GENERATION JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS website_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_profile_id uuid REFERENCES business_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  -- status values: queued | processing | completed | failed
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE website_generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own jobs"
  ON website_generation_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages jobs"
  ON website_generation_jobs FOR ALL USING (auth.role() = 'service_role');

-- Auto-update profiles.onboarding_completed when job completes
CREATE OR REPLACE FUNCTION on_generation_job_complete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE profiles SET
      onboarding_completed = true,
      onboarding_completed_at = now()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER website_job_complete_trigger
  AFTER UPDATE ON website_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION on_generation_job_complete();
```

---

## 8. INPUT SANITIZATION UTILITY

All text input submitted to the server must pass through this function before any DB write or AI call.

```typescript
// src/lib/utils/sanitize.ts

export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return "";

  return input
    .trim()
    // Strip all HTML tags
    .replace(/<[^>]*>/g, "")
    // Strip script content
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    // Normalize whitespace (no double spaces, no newline injection)
    .replace(/\s+/g, " ")
    // Strip null bytes
    .replace(/\0/g, "")
    .trim();
}

export function sanitizeHandle(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

// Checks if a string is made up entirely of emoji (no real text content)
export function isOnlyEmoji(str: string): boolean {
  const withoutEmoji = str.replace(
    /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{1F300}-\u{1F9FF}]/gu,
    ""
  ).trim();
  return withoutEmoji.length === 0;
}

// Validates a business name
export function validateBusinessName(name: string): string | null {
  const clean = sanitizeText(name);
  if (!clean) return "Business name is required.";
  if (clean.length < 2) return "Business name must be at least 2 characters.";
  if (clean.length > 80) return "Business name must be 80 characters or fewer.";
  if (!/[a-zA-Z]/.test(clean)) return "Business name must contain at least one letter.";
  if (isOnlyEmoji(name)) return "Please enter your business name using text characters.";
  return null; // valid
}
```

---

## 9. COMPLETE ERROR HANDLING — ONBOARDING

| Scenario | Handling | User-Facing Message |
|---|---|---|
| Auth session missing on /onboarding | Redirect to /login, preserve intended destination | Redirected silently |
| User already completed onboarding | Redirect to /dashboard immediately | Redirected silently |
| First name: only spaces | Trim → too short → block Continue | "Please enter your name." |
| First name: numbers or special chars | Block Continue | "Please enter your name using letters only." |
| Business name: only emojis | Block Continue | "Please enter your business name using text characters." |
| Business name: only numbers | Block Continue | "Business name must contain at least one letter." |
| Business name: HTML/script content | Strip silently, proceed if valid text remains | No error if valid text remains after strip |
| Handle: taken | Show alternatives, block Continue | "This handle is taken. Try: [a], [b], [c]" |
| Handle: reserved word | Block Continue | "This handle is reserved. Please choose a different one." |
| Handle: invalid characters | Auto-correct silently (strip/convert), update field | No error — field updates live |
| Handle check API fails (network) | Disable Continue, show retry icon | "Couldn't check availability. Tap to retry." |
| Service: duplicate entry | Silently ignore, do not add | No error — tag just doesn't appear |
| Service: only special characters | Block tag creation | "Service name must contain at least one letter." |
| Service: 9th service attempted | Block, inline message | "You've reached the maximum of 8 services." |
| Location: "other city" selected but city field empty | Block Continue | "Please enter your city name." |
| Gemini brand extraction fails | Use raw data as fallback, never fail onboarding | User sees no error — proceeds normally |
| Onboarding submit API 500 | Show retry button, preserve localStorage | "Something went wrong. Please try again." |
| Onboarding submit 400 (validation) | Show specific field errors | Per-field validation messages |
| Website generation times out (>45s) | Redirect to dashboard with "Generating..." card | "Your website is still being created. We'll notify you when it's ready." |
| Website generation fails entirely | Show dashboard card with retry button; send email notification | "Website generation failed. [Retry]" |
| User refreshes during Step 8 | localStorage restores to Step 7, job already queued in DB; if job = completed → dashboard; if queued/processing → back to Step 8 loading screen | Seamless restore |
| Network drops during Step 8 | localStorage preserved; retry the API call on reconnect | "Connection lost. Retrying..." |
| Duplicate onboarding submit (double-tap) | Upsert logic in DB prevents duplicates; idempotent endpoint | Silent |
| Session expires during loading screen | localStorage saves state, redirect to login, restore on return | Login page → redirect back to /onboarding |
| Location city contains emojis/script | Sanitize server-side, store clean text | No user-facing error |

---

## 10. ONBOARDING UI COMPONENT STRUCTURE

```
src/app/(auth)/onboarding/
  page.tsx                    — Main onboarding controller (manages step state)
  layout.tsx                  — Minimal layout: no sidebar, no topbar, just ZuriParticleCanvas bg
  
src/components/onboarding/
  OnboardingShell.tsx         — Wrapper with step dots indicator + back/continue buttons
  steps/
    Step1Name.tsx
    Step2BusinessHandle.tsx
    Step3BusinessType.tsx
    Step4Services.tsx
    Step5Customers.tsx
    Step6BrandVibe.tsx
    Step7Platforms.tsx
    Step8Building.tsx
  HandleInput.tsx             — Handle field with real-time availability check
  TagInput.tsx                — Service tag input with suggestions
  SelectionCard.tsx           — Reusable card for single/multi-select options
```

The OnboardingShell renders:
- Top: step progress dots (1 dot per step 1-7, Step 8 hides the dots)
- Center: the current step component (animated in/out with Framer Motion slide)
- Bottom: Back (text link) + Continue (gold button)
- Continue button state is controlled by a `canContinue` boolean passed from each step

Transitions between steps: slide left on advance, slide right on back. Duration 250ms, easing ease-in-out. Wrap in `useReducedMotion()` check — if reduced motion is preferred, use a simple fade instead.

---

## 11. PROGRESS INDICATOR COMPONENT

```tsx
// 7 dots across the top of each step (not shown on Step 8)
// Active: filled gold circle (10px)
// Completed: filled gold circle with checkmark
// Upcoming: outlined circle (border-white/20)

function StepDots({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: 7 }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={cn(
            "rounded-full transition-all duration-300",
            step < currentStep
              ? "size-2.5 bg-gold"          // completed
              : step === currentStep
              ? "size-3 bg-gold ring-2 ring-gold/30"   // active
              : "size-2.5 bg-white/10"      // upcoming
          )}
        />
      ))}
    </div>
  );
}
```

---

## 12. HANDLE SETTINGS (POST-ONBOARDING)

Users can change their handle in Settings → Account, BUT only if their website has never been published. Once published, the handle is locked.

```typescript
// On handle change attempt in settings:
// 1. Check websites table: does this user have a website with status = 'published'?
// 2. If yes: return 403 with message "Your handle cannot be changed after your website is published."
// 3. If no: validate new handle (same rules as onboarding), check availability, update profiles.handle

// On first website publish:
// Set profiles.handle_locked = true
// This prevents any future handle changes, even via API
```

---

## 13. IMPLEMENTATION ORDER

1. `src/lib/utils/sanitize.ts` — no dependencies
2. `src/lib/onboarding/brand-extractor.ts` — depends on Gemini lib
3. Database migration (schema section above)
4. `GET /api/handle/check/route.ts`
5. `POST /api/onboarding/complete/route.ts`
6. `src/components/onboarding/SelectionCard.tsx` — reusable, no dependencies
7. `src/components/onboarding/TagInput.tsx`
8. `src/components/onboarding/HandleInput.tsx` (uses /api/handle/check)
9. `src/components/onboarding/steps/` — all 8 steps
10. `src/components/onboarding/OnboardingShell.tsx`
11. `src/app/(auth)/onboarding/page.tsx` — wires everything together
12. `src/app/(auth)/onboarding/layout.tsx`
13. Add redirect logic to auth callback: if !onboarding_completed → /onboarding

## 14. ENVIRONMENT VARIABLES REQUIRED

```env
INTERNAL_API_SECRET=...   # Long random string, used to authenticate internal server-to-server calls
```

This secret is added to the headers of fire-and-forget fetch calls within the server
(website generation trigger, calendar seed trigger) and verified at the receiving routes
to prevent unauthorized external calls to those endpoints.

```typescript
// At the top of /api/ai/compose-website/route.ts and /api/content/seed-calendar/route.ts:
const internalSecret = req.headers.get("x-internal-secret");
if (internalSecret !== process.env.INTERNAL_API_SECRET) {
  // Also allow authenticated user calls (for manual triggers from dashboard)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```