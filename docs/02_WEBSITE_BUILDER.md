# ZURI — WEBSITE BUILDER SYSTEM (v2 — Template-Based)
# Supersedes the earlier 3-pass composition pipeline (archetype resolver → Gemini
# structure/copy/critique passes → BlockRenderer React components). That system
# is fully scrapped. This document is the authoritative spec for website
# generation, editing, publishing, and serving going forward.

---

## 0. WHAT CHANGED FROM v1 (context for anyone reading both docs)

| | v1 (scrapped) | v2 (this doc) |
|---|---|---|
| Design source | AI decides structure + palette per-request | 24 hand-crafted HTML templates, pre-built |
| Copy generation | 3 Gemini passes (structure/copy/critique) | 1 Gemini Pro pass: fill placeholders |
| Rendering | `composition_json` → React `BlockRenderer` | Filled HTML string served directly |
| Storage | `websites.composition_json` (jsonb) | `websites.template_html` (text) |
| Images | Unsplash/Pexels live API calls | Curated `category_images` library |
| Block components | 23 React components to build/maintain | None — templates are static HTML |
| Editor scope | Reorder/add/remove sections, edit any field | Edit text + swap 1-of-3 color theme + swap images. Cannot touch layout/CSS/fonts |

Removed entirely: `BlockRenderer.tsx`, all block components, `ArchetypeSpec`'s
block-registry fields (`required_blocks`/`optional_blocks`/`forbidden_blocks`/
`hero_variant_pool` etc.), `image-resolver.ts` (Unsplash/Pexels version),
`composition-validator.ts` (block-schema version), `composition-pipeline.ts`
(3-pass version).

Kept from v1, unchanged: §1 (Supported vs Unsupported Branches), the 8
archetypes as a *category/font-pairing* concept (not a block spec), the
Custom Site CTA pattern, the general shape of publish/contact-form/error-handling.

---

## 1. SUPPORTED vs UNSUPPORTED BRANCHES

Unchanged from v1. Zuri generates websites for branches that need minimal
backend — content-display sites where "Contact us" is the primary conversion
action.

### Supported (template-generated)
| Branch | Types |
|---|---|
| 1 | Business / Service — consultants, agencies, local services |
| 3 | Portfolio / Personal Brand — designers, photographers, freelancers |
| 5 | Restaurant / Hospitality — restaurants, cafés, bakeries, catering |
| 6 | Events / Booking-Based — venues, instructors (contact-us redirect, no integrated booking) |
| 8 | Landing Page — product launch, waitlist, campaign |

### Unsupported → Custom Site CTA
| Branch | Types | Reason |
|---|---|---|
| 2 | E-commerce | Requires CMS, inventory, checkout |
| 4 | Blog / Content / Publication | Requires CMS, author/taxonomy management |
| 7 | Nonprofit / Community | Requires donation module, membership gating |

CTA copy and behavior unchanged from v1 (see `CustomSiteCTA.tsx` in §12),
except the mailto target updates to `build@buildzuri.com`.

---

## 2. THE 8 ARCHETYPES (category concept only — no block spec)

Each archetype maps to exactly one of the 8 template categories in
`TEMPLATE_PROMPTS.md`, each with 3 templates (2 dark + 1 light, except
Trust-Professional which flips to 2 light + 1 dark; Community-Vibrant is
1 dark + 2 light).

```typescript
export type DesignArchetype =
  | "warm-sensory"          // food, restaurant, bakery, catering
  | "authority-minimal"     // consultant, lawyer, accountant, coach
  | "luxury-aspirational"   // beauty, spa, salon, fashion
  | "editorial-bold"        // retail, streetwear, creative agency
  | "clean-modern"          // tech, SaaS, fintech, logistics
  | "portfolio-dramatic"    // photography, videography, art, music
  | "community-vibrant"     // fitness, gym, wellness, yoga
  | "trust-professional";   // medical, dental, pharmacy, real estate
```

### 2.1 Archetype Resolver (unchanged logic from v1, kept as-is)

```typescript
// Deterministic — zero AI. Maps business_type + industry + services to archetype.
export function resolveArchetype(
  businessType: string,
  industry: string,
  services: string[],
  brandVibe: string
): DesignArchetype {
  const combined = `${businessType} ${industry} ${services.join(" ")}`.toLowerCase();

  if (/food|restaurant|bakery|cater|cake|chef|kitchen|cuisine|café|cafe/.test(combined))
    return "warm-sensory";
  if (/beauty|salon|spa|hair|nail|makeup|skin|fashion|luxury|jewel|perfume/.test(combined))
    return "luxury-aspirational";
  if (/gym|fitness|sport|wellness|yoga|trainer|health coach|crossfit/.test(combined))
    return "community-vibrant";
  if (/photo|video|music|art|creative|design|film|record|content creator/.test(combined))
    return "portfolio-dramatic";
  if (/retail|shop|store|streetwear|clothing|brand/.test(combined))
    return "editorial-bold";
  if (/tech|software|app|digital|startup|saas|fintech|logistics|developer/.test(combined))
    return "clean-modern";
  if (/medical|doctor|dental|pharmacy|clinic|hospital|therapist|optician/.test(combined))
    return "trust-professional";
  if (/consult|lawyer|legal|account|finance|coach|advisor|strategy|audit|real estate/.test(combined))
    return "authority-minimal";

  if (brandVibe === "elegant-luxurious") return "luxury-aspirational";
  if (brandVibe === "bold-vibrant" || brandVibe === "warm-friendly") return "editorial-bold";
  if (brandVibe === "clean-modern" || brandVibe === "creative-artistic") return "portfolio-dramatic";

  return "authority-minimal"; // final fallback
}
```

---

## 3. TEMPLATE LIBRARY

### 3.1 Structure

24 templates total (3 per archetype), generated per `TEMPLATE_PROMPTS.md`,
stored as self-contained `.html` files (inline CSS + JS, no build step) in
Supabase Storage bucket `website-templates`:

```
website-templates/
  warm-sensory/dark-editorial.html
  warm-sensory/dark-heritage.html
  warm-sensory/light-airy.html
  authority-minimal/dark-minimal.html
  authority-minimal/dark-heritage.html
  authority-minimal/light-real-estate.html
  ... (8 categories × 3 templates)
```

Alongside each `.html` file, a matching `.json` metadata file:

```typescript
interface TemplateMetadata {
  template_id: string;              // e.g. "warm-sensory-dark-editorial"
  archetype: DesignArchetype;
  mode: "dark" | "light";
  lean: "international" | "african";
  display_name: string;             // e.g. "Restaurant Dark Editorial"
  storage_path: string;             // path within website-templates bucket
  color_themes: [ColorTheme, ColorTheme, ColorTheme]; // theme-1, theme-2, theme-3
  placeholder_fields: string[];     // full list of {{...}} tokens present, for validation
  image_slots: string[];            // data-image-slot values present
  has_unique_section: boolean;      // e.g. Opening Hours strip, Before/After row
  unique_section_name?: string;
}

interface ColorTheme {
  key: "theme-1" | "theme-2" | "theme-3";
  bg: string; surface: string; text: string; text_muted: string;
  accent: string; accent_text: string; // text color to use ON the accent
}
```

### 3.2 `templates` table (DB)

Mirrors the metadata above so the app can query without hitting Storage:

```sql
CREATE TABLE IF NOT EXISTS templates (
  id text PRIMARY KEY,               -- template_id, e.g. "warm-sensory-dark-editorial"
  archetype text NOT NULL,
  mode text NOT NULL,                -- dark | light
  lean text NOT NULL,                -- international | african
  display_name text NOT NULL,
  storage_path text NOT NULL,
  color_themes jsonb NOT NULL,
  placeholder_fields jsonb NOT NULL,
  image_slots jsonb NOT NULL,
  needs_revision boolean DEFAULT false,
  revision_note text,
  created_at timestamptz DEFAULT now()
);
```

### 3.3 Category Images Library

Manually curated (NOT Unsplash/Pexels live calls). Stored at:
```
category-images/[archetype]/[slot-type]/*.jpg
```
e.g. `category-images/warm-sensory/hero/*.jpg`,
`category-images/warm-sensory/about/*.jpg`,
`category-images/warm-sensory/gallery/*.jpg`.

```sql
CREATE TABLE IF NOT EXISTS category_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype text NOT NULL,
  slot_type text NOT NULL,          -- hero | about | gallery | work | before_after | property | founder | case_study
  storage_path text NOT NULL,
  public_url text NOT NULL,
  tags text[],                       -- for editor search, e.g. ["warm","food","closeup"]
  width integer, height integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_category_images_archetype_slot ON category_images(archetype, slot_type);
```

Used for both: (a) automatic image slot filling during generation, and (b)
the editor's "search curated library" image-swap option.

---

## 4. GENERATION PIPELINE

### 4.1 Pipeline Entry Point

```typescript
export async function generateWebsite(
  brand: BusinessProfile,
  userId: string,
  jobId: string
): Promise<{ handle: string; needsReview: boolean }> {
  const supabase = createServiceClient();
  await markJob(supabase, jobId, "processing");

  try {
    // Stage 1: Resolve archetype (deterministic)
    const archetype = resolveArchetype(brand.business_type, brand.industry, brand.services, brand.brand_vibe);

    // Stage 2: Select template (Gemini Flash, ~2-4s)
    const template = await selectTemplate(brand, archetype);

    // Stage 3: Fetch template HTML + metadata
    const { html: rawHtml, metadata } = await fetchTemplate(template.template_id);

    // Stage 4: Fill placeholders with business copy (Gemini Pro, ~8-15s)
    const filledPlaceholders = await fillPlaceholders(brand, metadata, archetype);

    // Stage 5: Resolve images for every data-image-slot (parallel, curated library)
    const filledImages = await resolveTemplateImages(metadata, archetype);

    // Stage 6: String replacement — placeholders + images + service-card visibility
    let html = applyPlaceholders(rawHtml, filledPlaceholders);
    html = applyImages(html, filledImages);
    html = applyServiceCardVisibility(html, filledPlaceholders); // reveal cards 4-6 if filled

    // Stage 7: Validate (no leftover {{ }}, no empty image slots in prod)
    const { valid, errors } = validateFilledHtml(html);

    // Stage 8: Save
    const { data: website, error } = await supabase.from("websites").upsert({
      user_id: userId,
      handle: brand.handle,
      template_id: template.template_id,
      active_theme: "theme-1",
      template_html: html,
      filled_placeholders: filledPlaceholders,
      filled_images: filledImages,
      archetype,
      needs_review: !valid,
      status: "preview",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).select().single();

    if (error) throw error;

    await markJob(supabase, jobId, "completed");
    return { handle: website.handle, needsReview: !valid };

  } catch (err) {
    await markJob(supabase, jobId, "failed", String(err));
    throw err;
  }
}
```

### 4.2 Stage 2 — Template Selection (Gemini Flash)

Picks 1 of the 4/5 templates within the resolved archetype. Decision inputs:
mode preference (dark/light — inferred from brand vibe / category defaults
per `TEMPLATE_PROMPTS.md`'s distribution table) and lean (international vs
African — inferred from onboarding's location/brand-voice signals, defaulting
to whichever of the 3 templates isn't already the "obvious" pick, to keep
distribution varied across users in the same archetype).

```typescript
async function selectTemplate(brand: BusinessProfile, archetype: DesignArchetype): Promise<TemplateMetadata> {
  const candidates = await getTemplatesForArchetype(archetype); // 3 rows from `templates` table

  const prompt = `
Pick the best-fit website template for this Nigerian business.

BUSINESS: ${brand.business_name} — ${brand.industry}
BRAND VIBE: ${brand.brand_vibe}
TARGET AUDIENCE: ${brand.target_audience}

CANDIDATE TEMPLATES:
${candidates.map(c => `- ${c.id}: mode=${c.mode}, lean=${c.lean}, name="${c.display_name}"`).join("\n")}

Output ONLY valid JSON: { "template_id": "..." }
Pick "lean: african" only if the business's audience/positioning clearly benefits from it
(local-first businesses, culturally-forward branding). Otherwise default to "international"
for broader appeal. Pick "mode" based on brand_vibe: elegant/luxurious/moody → dark;
bright/airy/approachable/clinical/trustworthy → light.
`;

  const { template_id } = await geminiJSON<{ template_id: string }>(prompt, "flash");
  return candidates.find(c => c.id === template_id) ?? candidates[0]; // fallback to first candidate
}
```

### 4.3 Stage 4 — Placeholder Filling (Gemini Pro)

Generates all text content, keyed exactly to the placeholder naming
convention defined in `TEMPLATE_PROMPTS.md` (`{{business_name}}`,
`{{tagline}}`, `{{about_body}}`, `{{service_N_title}}` /
`{{service_N_description}}` for N=1–6, `{{testimonial_N_quote/name/role}}`
for N=1–3, plus category-specific fields like `{{credential_N_name}}`,
`{{class_N_name/time/day}}`, `{{property_N_title/price/location}}` where the
selected template has them).

```typescript
async function fillPlaceholders(
  brand: BusinessProfile,
  metadata: TemplateMetadata,
  archetype: DesignArchetype
): Promise<Record<string, string>> {
  const prompt = `
You are a copywriter for African small businesses. Fill every placeholder for this template.

BUSINESS: ${brand.business_name} — ${brand.industry}
SERVICES: ${brand.services.join(", ")}
UNIQUE VALUE: ${brand.unique_value}
TARGET AUDIENCE: ${brand.target_audience}
LOCATION: ${brand.location_city ?? brand.location}, Nigeria
BRAND TONE: ${brand.brand_tone}

PLACEHOLDERS TO FILL (exact keys, no others): ${JSON.stringify(metadata.placeholder_fields)}

RULES:
1. Every field must be specific to ${brand.business_name} — zero generic text, no lorem ipsum, no [brackets]
2. {{business_name}} = "${brand.business_name}" exactly
3. Services named exactly as provided where relevant: ${brand.services.join(", ")}
4. Fill ALL 6 service slots if the business has 6+ offerings; otherwise fill only slots 1-3 and
   leave slots 4-6 as empty strings "" (they stay hidden — see §4.4)
5. Testimonials: realistic Nigerian names, no fabricated dates/revenue/unverifiable stats
6. CTA-type fields: max 5 words, action-specific
7. Category-specific fields (credentials, class schedule, property details, etc.): only fill
   if present in the placeholder list above — plausible, realistic values for this business

Output ONLY valid JSON mapping each placeholder key (without {{ }}) to its filled string value.
`;

  return geminiJSON<Record<string, string>>(prompt, "pro");
}
```

### 4.4 Stage 6 — String Replacement

```typescript
function applyPlaceholders(html: string, fields: Record<string, string>): string {
  let out = html;
  for (const [key, value] of Object.entries(fields)) {
    out = out.replaceAll(`{{${key}}}`, escapeHtml(value));
  }
  return out;
}

function applyServiceCardVisibility(html: string, fields: Record<string, string>): string {
  // Cards 4-6 ship with `hidden data-optional-slot="N"` per TEMPLATE_PROMPTS.md rule 4.
  // Reveal any slot whose title field was actually filled.
  let out = html;
  for (const n of [4, 5, 6]) {
    if (fields[`service_${n}_title`]?.trim()) {
      out = out.replace(
        new RegExp(`(<[^>]+data-optional-slot="${n}"[^>]*)\\shidden`, "i"),
        "$1"
      );
    }
  }
  return out;
}
```

### 4.5 Stage 5 — Image Resolution

```typescript
async function resolveTemplateImages(
  metadata: TemplateMetadata,
  archetype: DesignArchetype
): Promise<Record<string, ResolvedImage>> {
  const supabase = createServiceClient();
  const resolved: Record<string, ResolvedImage> = {};

  await Promise.all(metadata.image_slots.map(async (slot) => {
    const slotType = normalizeSlotType(slot); // e.g. "gallery_1" -> "gallery"
    const { data } = await supabase
      .from("category_images")
      .select("*")
      .eq("archetype", archetype)
      .eq("slot_type", slotType)
      .order("random()") // random pick among curated matches — Postgres RANDOM()
      .limit(1)
      .single();

    resolved[slot] = data
      ? { url: data.public_url, source: "curated", width: data.width, height: data.height }
      : getArchetypeFallback(archetype); // last-resort static fallback, same as v1 §18
  }));

  return resolved;
}

function applyImages(html: string, images: Record<string, ResolvedImage>): string {
  let out = html;
  for (const [slot, image] of Object.entries(images)) {
    // Replace the picsum.photos placeholder src on the element carrying this data-image-slot
    out = out.replace(
      new RegExp(`(data-image-slot="${slot}"[^>]*src=")[^"]*(")`, "i"),
      `$1${image.url}$2`
    );
  }
  return out;
}
```

**Never leave an image slot unfilled at publish time** — this is a hard
pipeline requirement flagged from `DESIGN_SYSTEM.md` §7.4: fall through to
`getArchetypeFallback()` if `category_images` has no match for a given
archetype+slot combination.

### 4.6 `geminiJSON` retry logic

Unchanged from v1 — same 3-attempt retry with markdown-fence stripping and
exponential backoff. See v1 §4.6 for the implementation; copy as-is.

---

## 5. COLOR THEME SYSTEM

Each template ships 3 color themes (`theme-1`/`theme-2`/`theme-3`) as CSS
custom properties, applied via a class on `<body>`. Generation always starts
on `theme-1`. Theme swap in the editor is a pure client-side class swap — no
regeneration, no Gemini call, instant.

```html
<body class="{{active_theme}}">
```

```css
:root { /* shared, theme-independent tokens: fonts, spacing */ }
.theme-1 { --color-bg: ...; --color-surface: ...; --color-text: ...; --color-accent: ...; }
.theme-2 { /* alternate palette, same mode or a variant lean */ }
.theme-3 { /* often the light-mode variant, per TEMPLATE_PROMPTS.md distribution */ }
```

`websites.active_theme` stores the currently selected key (`"theme-1"` |
`"theme-2"` | `"theme-3"`); the editor PATCHes this value directly, no other
recomputation needed.

---

## 6. VALIDATION

```typescript
interface ValidationResult { valid: boolean; errors: string[]; warnings: string[]; }

function validateFilledHtml(html: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: no leftover {{placeholder}} tokens
  const leftover = html.match(/\{\{[a-z0-9_]+\}\}/gi);
  if (leftover) errors.push(`Unfilled placeholders: ${[...new Set(leftover)].join(", ")}`);

  // Rule 2: no picsum.photos URLs left in an element with a data-image-slot
  // (means image resolution silently failed for that slot)
  if (/data-image-slot="[^"]+"[^>]*src="https:\/\/picsum\.photos/i.test(html)) {
    errors.push("One or more image slots still reference the picsum.photos placeholder");
  }

  // Rule 3: business name must appear somewhere in the hero region
  // (cheap heuristic — full section-boundary parsing not required)
  warnings.push(...(html.includes("{{business_name}}") ? ["business_name placeholder literally present"] : []));

  return { valid: errors.length === 0, errors, warnings };
}
```

Composition-level rules from v1 (block registry, forbidden blocks, hero/footer
ordering) don't apply here — template structure is fixed at template-authoring
time and enforced by `TEMPLATE_PROMPTS.md`'s GENERATION CHECKLIST, not at
runtime per-business generation.

---

## 7. SERVING ARCHITECTURE

### 7.1 Website Status States (unchanged from v1)

```typescript
type WebsiteStatus = "generating" | "preview" | "published" | "suspended" | "failed" | "deleted";
```

### 7.2 Subdomain Middleware (unchanged from v1, domain updated)

```typescript
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildzuri.com";
// ... identical middleware logic to v1 §7.2, rewriting handle.buildzuri.com -> /sites/[handle]
```

### 7.3 Site Rendering — now serves raw HTML, not React components

```typescript
// src/app/sites/[handle]/route.ts  (Route Handler, not a page component —
// we're returning a raw HTML Response, not React-rendering blocks)

export async function GET(req: Request, { params }: { params: { handle: string } }) {
  const supabase = createServiceClient();
  const { data: website } = await supabase
    .from("websites")
    .select("template_html, status")
    .eq("handle", params.handle)
    .single();

  if (!website) return new Response("Not found", { status: 404 });
  if (website.status === "suspended") return new Response(SUSPENDED_PAGE_HTML, { headers: { "Content-Type": "text/html" } });
  if (website.status !== "published") return new Response("Not found", { status: 404 });

  return new Response(website.template_html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
```

### 7.4 Internal Preview Route (auth required, same pattern as v1 §7.4)

```typescript
// src/app/preview/[handle]/route.ts — identical shape to 7.3 but requires
// auth.getUser() and matches on user_id instead of status = 'published'.
```

---

## 8. WEBSITE EDITOR (scope reduced from v1)

Editor lives at `/dashboard/website/edit`. Per the agreed scope, users can
change: **text content of placeholders, color theme (1 of 3 presets), images
(upload or curated-library search)**. They cannot change CSS, layout,
structure, or fonts — those are locked to the chosen template.

### 8.1 Text Edit API

```typescript
// PATCH /api/website/placeholder
// body: { field: string, value: string, action: "edit" | "regenerate" }
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { field, value, action } = await req.json();
  const { data: website } = await supabase.from("websites")
    .select("template_html, filled_placeholders, template_id").eq("user_id", user.id).single();
  if (!website) return NextResponse.json({ error: "No website found" }, { status: 404 });

  let newValue = value;
  if (action === "regenerate") {
    const gate = await checkUsageLimit(supabase, user.id, "website_regenerations");
    if (!gate.allowed) return NextResponse.json({ error: "Regeneration limit reached", upgradeRequired: gate.upgradeRequired }, { status: 403 });
    const { data: brand } = await supabase.from("business_profiles").select("*").eq("user_id", user.id).single();
    newValue = await geminiJSON<{ value: string }>(`Regenerate the "${field}" field for ${brand?.business_name}. Current value: "${website.filled_placeholders[field]}". Same tone, same length range, different phrasing.`, "flash").then(r => r.value);
    await supabase.rpc("increment_usage", { p_user_id: user.id, p_metric: "website_regenerations" });
  } else {
    newValue = sanitizeText(value);
  }

  const updatedPlaceholders = { ...website.filled_placeholders, [field]: newValue };
  const updatedHtml = website.template_html.split(`{{${field}}}`).join(newValue); // re-fill from raw not trivial —
  // in practice: re-fetch the RAW template from Storage and re-run applyPlaceholders() +
  // applyImages() with updatedPlaceholders + existing filled_images, rather than
  // string-replacing inside already-filled HTML (avoids double-escaping / partial-match bugs).

  await supabase.from("websites").update({
    filled_placeholders: updatedPlaceholders,
    template_html: updatedHtml,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id);

  return NextResponse.json({ success: true, value: newValue });
}
```

### 8.2 Theme Swap API

```typescript
// PATCH /api/website/theme  — body: { theme: "theme-1" | "theme-2" | "theme-3" }
// Pure DB update of active_theme; the template_html's <body class> is re-applied
// on next render OR (simpler) the stored template_html has its body class
// string-replaced directly, same as placeholder edits.
```

### 8.3 Image Swap API

```typescript
// POST /api/website/image — multipart: { slot: string, action: "upload" | "curated_search", file?, query? }
// "upload": Supabase Storage upload to website-images/{user_id}/{slot}-{ts}.ext, as v1 §8.3
// "curated_search": query category_images by archetype + slot_type + tags overlap
// Either way: update filled_images[slot], re-run applyImages() against the raw
// template + current filled_placeholders (same re-fill approach as §8.1).
```

---

## 9. PUBLISH FLOW

Unchanged in shape from v1 §9 — plan gate, validation-before-publish, handle
locking, "your site is live" email. Two updates:

1. Validation now calls `validateFilledHtml()` (§6) instead of the block-schema validator.
2. Site URL format: `https://${website.handle}.buildzuri.com`.

```typescript
// POST /api/website/publish — same control flow as v1 §9.1, swap in the new validator + domain.
// POST /api/website/unpublish — unchanged, v1 §9.2.
```

---

## 10. CONTACT FORM

Unchanged in behavior from v1 §13, with one addition per `TEMPLATE_PROMPTS.md`
rule 10: the template's inline JS shows a static "Message sent" state on
submit, then the actual POST happens to:

```
https://app.buildzuri.com/api/contact-form
```

with hidden fields `{{business_handle}}` and `{{owner_email}}` included in
the form payload, and CORS configured on that endpoint for `*.buildzuri.com`.

```typescript
// src/app/api/contact-form/route.ts — same validation rules, spam heuristic,
// and Resend notification as v1 §13. Update CORS headers:
export const corsHeaders = { "Access-Control-Allow-Origin": "*.buildzuri.com" };
```

---

## 11. DATABASE SCHEMA (full, v2)

```sql
-- ============================================================
-- WEBSITES (v2 — template-based)
-- ============================================================
CREATE TABLE IF NOT EXISTS websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  handle text NOT NULL,
  custom_domain text UNIQUE,
  status text NOT NULL DEFAULT 'generating',
  template_id text REFERENCES templates(id),
  active_theme text NOT NULL DEFAULT 'theme-1',
  template_html text,                    -- the fully filled, servable HTML string
  filled_placeholders jsonb DEFAULT '{}',
  filled_images jsonb DEFAULT '{}',
  archetype text,
  needs_review boolean DEFAULT false,
  published_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_websites_user_id ON websites(user_id);
CREATE INDEX idx_websites_handle ON websites(handle);
CREATE INDEX idx_websites_custom_domain ON websites(custom_domain);
CREATE INDEX idx_websites_status ON websites(status);

ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own website" ON websites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Published websites are public" ON websites FOR SELECT USING (status = 'published');

-- ============================================================
-- TEMPLATES (see §3.2)
-- ============================================================
-- (schema as in §3.2 above)

-- ============================================================
-- CATEGORY IMAGES (see §3.3)
-- ============================================================
-- (schema as in §3.3 above)

-- ============================================================
-- WEBSITE IMAGES (user uploads — unchanged from v1)
-- ============================================================
CREATE TABLE IF NOT EXISTS website_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  slot text,
  file_size_bytes integer,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE website_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own images" ON website_images FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- CONTACT SUBMISSIONS + PAGEVIEWS — unchanged from v1 §10
-- ============================================================
-- (identical schema to v1; see that section)
```

---

## 12. CUSTOM SITE CTA COMPONENT

Unchanged from v1 §12 — same component, update the `mailto:` target to
`build@buildzuri.com`.

---

## 13. ALL API ROUTES (v2)

| Method | Route | Description | Auth | Plan Gate |
|---|---|---|---|---|
| POST | /api/ai/generate-website | Trigger generation (§4) | Internal secret OR user auth | Any paid plan |
| GET | /api/website | Get user's website (status + handle + theme) | Yes | Free+ |
| PATCH | /api/website/placeholder | Edit or regenerate a text field | Yes | Pro+ |
| PATCH | /api/website/theme | Swap color theme | Yes | Growth+ (per v1 §14 gating table, unchanged) |
| POST | /api/website/image | Swap image for a slot | Yes | Pro+ |
| POST | /api/website/publish | Publish live | Yes | Pro+ |
| POST | /api/website/unpublish | Take offline | Yes | Pro+ |
| POST | /api/website/regenerate | Full re-generation (new template pick + full re-fill) | Yes | Pro+ (counts against regen limit) |
| DELETE | /api/website | Delete website | Yes | Any |
| POST | /api/website/custom-domain | Attach custom domain | Yes | Growth+ |
| GET | /api/website/custom-domain/status | DNS propagation check | Yes | Growth+ |
| POST | /api/contact-form | Public form receiver | Public | — |
| GET | /sites/[handle] | Serve published site (raw HTML) | Public | — |
| GET | /preview/[handle] | Serve preview (raw HTML, owner-only) | Yes | Free+ |

Plan-gated feature table: unchanged from v1 §14, with row labels updated —
"Edit global palette" → "Swap color theme", "Reorder sections" / "Add/remove
optional sections" → **removed** (not possible in v2; templates are structurally
fixed). All other rows (regeneration limits, custom domain, multiple websites,
footer badge removal) carry over unchanged.

---

## 14. ERROR HANDLING — UPDATED MAP

| Scenario | System Action | User-Facing Message |
|---|---|---|
| Template selection (Gemini Flash) returns invalid `template_id` | Fallback to first candidate template for the archetype | Silent |
| Placeholder fill (Gemini Pro) fails all retries | Fall back to generic-but-non-empty copy per field (business name + category boilerplate), needs_review = true | Website generates, admin alerted |
| Image resolution finds no curated match for a slot | Use archetype fallback image | Silent |
| Leftover `{{placeholder}}` detected post-fill | Save with needs_review = true, log which fields | Dashboard "Needs review" badge |
| Leftover picsum.photos URL detected post-fill | Same as above | Same as above |
| Validation errors on publish | Block publish | "Your website has issues that need to be fixed before publishing. [View issues]" |
| Publish attempt on Free plan | Return 403 | "Upgrade to Pro to publish your website. [Upgrade]" |
| Text edit exceeds a template's practical field length (no hard schema now — apply a generous 500-char soft cap) | Return 400 if absurdly long (>500 chars) | "This field is too long for this template." |
| Image upload wrong type / too large | Return 400 | "Please upload a JPEG, PNG, or WebP image." / "Image must be smaller than 10MB." |
| Theme swap to invalid key | Return 400 | "Something went wrong. Please refresh and try again." |
| Contact form spam heuristic trips | Return 400 silently | "Message could not be sent. Please try again." |
| Contact form on unpublished site | Return 404 | "This website is not currently active." |
| Site suspended (plan expired) | Serve suspension page | "This website is temporarily unavailable. The owner needs to renew their plan." |
| Regeneration limit reached | Return 403 | "You've used all your regenerations this month. Upgrade for more or wait until [date]." |
| `template_id` referenced by a website no longer exists in `templates` table (e.g. deleted/replaced) | Serve last-known-good `template_html` (already stored), flag needs_review, alert admin — never break a live site over a template library change | No visible error to site visitors |

---

## 15. ENVIRONMENT VARIABLES REQUIRED

```env
NEXT_PUBLIC_ROOT_DOMAIN=buildzuri.com
GEMINI_API_KEY=...
INTERNAL_API_SECRET=...
# Removed from v1: UNSPLASH_ACCESS_KEY, PEXELS_API_KEY — no longer used.
# Images are served from category_images (Supabase Storage), not live API calls.
```

---

## 16. IMPLEMENTATION ORDER

1. `src/lib/website/archetypes.ts` — resolver only (§2.1), no block-spec fields
2. Database migration: `templates`, `category_images`, updated `websites` schema (§11)
3. `src/lib/website/template-registry.ts` — fetch/list helpers for the `templates` table
4. Generate + upload the 24 templates (see Cursor session for Template Admin) + seed `category_images`
5. `src/lib/website/generation-pipeline.ts` — §4 in full: `selectTemplate`, `fillPlaceholders`, `resolveTemplateImages`, `applyPlaceholders`, `applyImages`, `applyServiceCardVisibility`, `validateFilledHtml`
6. `middleware.ts` — subdomain routing (§7.2, domain-updated)
7. `src/app/sites/[handle]/route.ts` + `src/app/preview/[handle]/route.ts` — raw HTML serving (§7.3–7.4)
8. `src/app/api/ai/generate-website/route.ts`
9. `src/app/api/website/placeholder/route.ts`, `.../theme/route.ts`, `.../image/route.ts`
10. `src/app/api/website/publish/route.ts`, `.../unpublish/route.ts`
11. `src/app/api/contact-form/route.ts`
12. `src/components/website/CustomSiteCTA.tsx`
13. Website editor UI at `/dashboard/website/edit` (§8 scope: text/theme/image only)
14. Fallback images per archetype (same 8 files as v1 §18, path unchanged: `/public/images/fallbacks/[archetype].jpg`)