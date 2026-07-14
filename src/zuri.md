# ZURI — MASTER PROMPT: WEBSITE GENERATION ALGORITHM OVERHAUL
# Paste this at the start of a Claude Code session AFTER the main CONTEXT.md

## SESSION OBJECTIVE
Overhaul the website generation pipeline from a single-pass Gemini call into a
deterministic, multi-stage, validated composition system that produces dramatically
better websites for African entrepreneurs. Target quality: 10/10 vs current 2/10.

## WHAT WE ARE REPLACING
Current flow: brand_profile → single Gemini call → save to DB (no validation, no feedback)
New flow: brand_profile → archetype lookup → 3-pass Gemini pipeline → image enrichment → validation → save

---

## STEP 1 — BUSINESS ARCHETYPE SYSTEM
Create: src/lib/website/archetypes.ts

This is a DETERMINISTIC lookup table. Zero AI needed here. Maps business_type and
industry to a full design specification that constrains all downstream AI calls.

```typescript
export type DesignArchetype =
  | "warm-sensory"         // food, restaurant, bakery, catering
  | "authority-minimal"    // consultant, lawyer, accountant, coach
  | "luxury-aspirational"  // beauty, spa, salon, fashion, jewellery
  | "editorial-bold"       // retail, streetwear, creative agency
  | "clean-modern"         // tech, SaaS, fintech, logistics
  | "portfolio-dramatic"   // photography, videography, music, art
  | "community-vibrant"    // fitness, gym, sports, wellness
  | "trust-professional";  // medical, dental, pharmacy, real estate

export interface ArchetypeSpec {
  archetype: DesignArchetype;
  hero_variant_pool: string[];        // Only these hero BlockIds are allowed
  about_variant: string;              // Exactly one about variant
  services_variant: string;           // Exactly one services variant
  social_proof_variant: string;       // Exactly one social proof variant
  required_blocks: string[];          // Must appear in every site of this type
  forbidden_blocks: string[];         // Must NEVER appear in this archetype
  palette_rules: {
    prefer_warm: boolean;             // Bias Gemini toward warm vs cool tones
    accent_intensity: "subtle" | "bold" | "minimal";
  };
  typography_pairing: {
    heading: string;                  // Google Font name
    body: string;                     // Google Font name
    heading_weight: number;
    body_weight: number;
  };
  image_style_keywords: string[];     // Appended to all Unsplash queries
  image_location_keywords: string[];  // e.g. ["Lagos", "Nigeria", "West Africa"]
  motion_style_bias: "slow_elegant" | "crisp_modern" | "bold_energetic";
  copy_tone_modifier: string;         // Injected into copy generation prompt
}

// Complete archetype map — implement all 8
export const ARCHETYPES: Record<DesignArchetype, ArchetypeSpec> = {
  "warm-sensory": {
    archetype: "warm-sensory",
    hero_variant_pool: ["HeroFullscreen", "HeroSplit"],
    about_variant: "AboutFounder",
    services_variant: "ServicesCardGrid",
    social_proof_variant: "TestimonialsCarousel",
    required_blocks: ["hero", "about", "services", "testimonials", "cta-contact", "footer"],
    forbidden_blocks: ["PricingTable", "HeroTypographic", "LogoWall"],
    palette_rules: { prefer_warm: true, accent_intensity: "bold" },
    typography_pairing: {
      heading: "Playfair Display",
      body: "Lato",
      heading_weight: 700,
      body_weight: 400,
    },
    image_style_keywords: ["golden hour", "warm", "vibrant", "close-up food", "artisan"],
    image_location_keywords: ["Nigerian", "African", "Lagos"],
    motion_style_bias: "bold_energetic",
    copy_tone_modifier: "warm, sensory, appetite-stimulating. Use words that evoke taste, smell, and warmth.",
  },
  "authority-minimal": {
    archetype: "authority-minimal",
    hero_variant_pool: ["HeroTypographic", "HeroMinimal"],
    about_variant: "AboutMission",
    services_variant: "ServicesListElegant",
    social_proof_variant: "CaseStudySpotlight",
    required_blocks: ["hero", "about", "services", "social-proof", "cta-contact", "footer"],
    forbidden_blocks: ["HeroFullscreen", "LogoWall", "PricingTable"],
    palette_rules: { prefer_warm: false, accent_intensity: "subtle" },
    typography_pairing: {
      heading: "Cormorant Garamond",
      body: "Montserrat",
      heading_weight: 600,
      body_weight: 400,
    },
    image_style_keywords: ["professional", "minimal", "office", "clean", "monochrome"],
    image_location_keywords: ["Lagos", "Nigeria", "professional African"],
    motion_style_bias: "slow_elegant",
    copy_tone_modifier: "authoritative, precise, results-focused. Use specific outcomes and credentials.",
  },
  "luxury-aspirational": {
    archetype: "luxury-aspirational",
    hero_variant_pool: ["HeroFullscreen", "HeroFloatingCard"],
    about_variant: "AboutFounder",
    services_variant: "ServicesCardGrid",
    social_proof_variant: "TestimonialsCarousel",
    required_blocks: ["hero", "about", "services", "testimonials", "cta-contact", "footer"],
    forbidden_blocks: ["PricingTable", "HeroTypographic", "AboutStats"],
    palette_rules: { prefer_warm: false, accent_intensity: "subtle" },
    typography_pairing: {
      heading: "Cormorant Garamond",
      body: "Raleway",
      heading_weight: 400,
      body_weight: 300,
    },
    image_style_keywords: ["luxury", "editorial", "beauty", "aspirational", "elegant"],
    image_location_keywords: ["African beauty", "Nigerian fashion", "Lagos style"],
    motion_style_bias: "slow_elegant",
    copy_tone_modifier: "luxurious, aspirational, exclusive. Evoke transformation and premium experience.",
  },
  "editorial-bold": {
    archetype: "editorial-bold",
    hero_variant_pool: ["HeroSplit", "HeroFullscreen"],
    about_variant: "AboutFounder",
    services_variant: "ServicesCardGrid",
    social_proof_variant: "LogoWall",
    required_blocks: ["hero", "about", "services", "cta-contact", "footer"],
    forbidden_blocks: ["HeroMinimal", "ServicesListElegant", "AboutTimeline"],
    palette_rules: { prefer_warm: true, accent_intensity: "bold" },
    typography_pairing: {
      heading: "Bebas Neue",
      body: "DM Sans",
      heading_weight: 400,
      body_weight: 400,
    },
    image_style_keywords: ["bold", "vibrant", "urban", "editorial", "fashion"],
    image_location_keywords: ["Lagos street", "African fashion", "Nigerian culture"],
    motion_style_bias: "bold_energetic",
    copy_tone_modifier: "bold, confident, cultural. Reference Nigerian identity and local pride.",
  },
  "clean-modern": {
    archetype: "clean-modern",
    hero_variant_pool: ["HeroGradient", "HeroTypographic"],
    about_variant: "AboutStats",
    services_variant: "ServicesCardGrid",
    social_proof_variant: "LogoWall",
    required_blocks: ["hero", "about", "services", "cta-contact", "footer"],
    forbidden_blocks: ["HeroFullscreen", "AboutFounder", "TestimonialsCarousel"],
    palette_rules: { prefer_warm: false, accent_intensity: "minimal" },
    typography_pairing: {
      heading: "Inter",
      body: "Inter",
      heading_weight: 700,
      body_weight: 400,
    },
    image_style_keywords: ["technology", "minimal", "digital", "clean", "modern"],
    image_location_keywords: ["African tech", "Lagos startup", "Nigeria business"],
    motion_style_bias: "crisp_modern",
    copy_tone_modifier: "clear, benefit-driven, technical but accessible. Lead with outcomes.",
  },
  "portfolio-dramatic": {
    archetype: "portfolio-dramatic",
    hero_variant_pool: ["HeroFullscreen", "HeroSplit"],
    about_variant: "AboutFounder",
    services_variant: "ServicesCardGrid",
    social_proof_variant: "CaseStudySpotlight",
    required_blocks: ["hero", "about", "services", "social-proof", "cta-contact", "footer"],
    forbidden_blocks: ["PricingTable", "HeroGradient", "AboutStats"],
    palette_rules: { prefer_warm: false, accent_intensity: "bold" },
    typography_pairing: {
      heading: "Fraunces",
      body: "Work Sans",
      heading_weight: 600,
      body_weight: 400,
    },
    image_style_keywords: ["dramatic", "artistic", "high contrast", "creative", "portfolio"],
    image_location_keywords: ["African creative", "Nigerian art", "Lagos photography"],
    motion_style_bias: "slow_elegant",
    copy_tone_modifier: "artistic, evocative, story-driven. Let the work speak; copy is minimal but powerful.",
  },
  "community-vibrant": {
    archetype: "community-vibrant",
    hero_variant_pool: ["HeroFullscreen", "HeroSplit"],
    about_variant: "AboutFounder",
    services_variant: "ServicesCardGrid",
    social_proof_variant: "TestimonialsCarousel",
    required_blocks: ["hero", "about", "services", "testimonials", "cta-contact", "footer"],
    forbidden_blocks: ["HeroTypographic", "ServicesListElegant", "PricingTable"],
    palette_rules: { prefer_warm: true, accent_intensity: "bold" },
    typography_pairing: {
      heading: "Nunito",
      body: "Nunito",
      heading_weight: 800,
      body_weight: 400,
    },
    image_style_keywords: ["energetic", "fitness", "community", "active", "transformation"],
    image_location_keywords: ["African fitness", "Lagos gym", "Nigerian wellness"],
    motion_style_bias: "bold_energetic",
    copy_tone_modifier: "energetic, motivational, inclusive. Use action words and community language.",
  },
  "trust-professional": {
    archetype: "trust-professional",
    hero_variant_pool: ["HeroSplit", "HeroTypographic"],
    about_variant: "AboutStats",
    services_variant: "ServicesListElegant",
    social_proof_variant: "TestimonialsCarousel",
    required_blocks: ["hero", "about", "services", "testimonials", "cta-contact", "footer"],
    forbidden_blocks: ["HeroFullscreen", "EditorialBold", "AboutMission"],
    palette_rules: { prefer_warm: false, accent_intensity: "subtle" },
    typography_pairing: {
      heading: "Source Serif 4",
      body: "Source Sans 3",
      heading_weight: 600,
      body_weight: 400,
    },
    image_style_keywords: ["professional", "trustworthy", "clinical", "clean", "reassuring"],
    image_location_keywords: ["Nigerian medical", "Lagos professional", "African healthcare"],
    motion_style_bias: "crisp_modern",
    copy_tone_modifier: "reassuring, credentialed, clear. Lead with trust signals and professional outcomes.",
  },
};

// Archetype resolver — maps raw business data to archetype
export function resolveArchetype(
  businessType: string,
  industry: string,
  services: string[]
): DesignArchetype {
  const combined = `${businessType} ${industry} ${services.join(" ")}`.toLowerCase();

  if (/food|restaurant|bakery|cater|cake|chef|kitchen|cuisine/.test(combined))
    return "warm-sensory";
  if (/consult|lawyer|legal|account|finance|coach|advisor|strategy/.test(combined))
    return "authority-minimal";
  if (/beauty|salon|spa|hair|nail|makeup|fashion|luxury|jewel/.test(combined))
    return "luxury-aspirational";
  if (/retail|shop|store|streetwear|clothing|brand|creative agency/.test(combined))
    return "editorial-bold";
  if (/tech|software|app|digital|startup|saas|fintech|logistics/.test(combined))
    return "clean-modern";
  if (/photo|video|music|art|creative|design|film|record/.test(combined))
    return "portfolio-dramatic";
  if (/gym|fitness|sport|wellness|yoga|trainer|health coach/.test(combined))
    return "community-vibrant";
  if (/medical|doctor|dental|pharmacy|clinic|hospital|real estate|property/.test(combined))
    return "trust-professional";

  // Default fallback
  return "authority-minimal";
}
```

---

## STEP 2 — THREE-PASS COMPOSITION PIPELINE
Create: src/lib/website/composition-pipeline.ts

```typescript
import { geminiJSON, geminiGenerate } from "@/lib/gemini";
import { resolveArchetype, ARCHETYPES, ArchetypeSpec } from "./archetypes";
import { ExtractedBrand } from "@/types/brand";
import { WebsiteComposition } from "@/types/website";
import { resolveImages } from "./image-resolver";
import { validateComposition } from "./composition-validator";

export async function runCompositionPipeline(
  brand: ExtractedBrand,
  websiteType: string
): Promise<{ composition: WebsiteComposition; needsReview: boolean }> {
  
  // Stage 1: Resolve archetype (deterministic, no AI)
  const archetype = resolveArchetype(websiteType, brand.industry, brand.services);
  const spec = ARCHETYPES[archetype];
  
  // Stage 2: Structure pass (fast, cheap — Gemini Flash)
  const structure = await pass1_structure(brand, spec, websiteType);
  
  // Stage 3: Copy pass (thorough — Gemini Pro)
  const withCopy = await pass2_copy(brand, spec, structure);
  
  // Stage 4: Image resolution (parallel Unsplash queries)
  const withImages = await resolveImages(withCopy, spec);
  
  // Stage 5: Critique pass (lightweight quality check — Gemini Flash)
  const { composition, patches } = await pass3_critique(brand, withImages, spec);
  
  // Stage 6: Apply patches if needed
  const finalComposition = patches.length > 0
    ? await applyPatches(composition, patches, brand, spec)
    : composition;
  
  // Stage 7: Validate
  const { valid, errors } = validateComposition(finalComposition);
  
  return {
    composition: finalComposition,
    needsReview: !valid || patches.length > 3,
  };
}

async function pass1_structure(
  brand: ExtractedBrand,
  spec: ArchetypeSpec,
  websiteType: string
): Promise<Partial<WebsiteComposition>> {
  const prompt = `
You are a website architect. Given this brand profile and design specification, 
output ONLY the structural decisions for this website. NO copy. NO text content.

BRAND:
- Business: ${brand.business_name}
- Industry: ${brand.industry}
- Services: ${brand.services.join(", ")}
- Tone: ${brand.brand_tone}
- Website type: ${websiteType}

ARCHETYPE: ${spec.archetype}

ALLOWED HERO VARIANTS: ${spec.hero_variant_pool.join(", ")}
REQUIRED BLOCKS: ${spec.required_blocks.join(", ")}
FORBIDDEN BLOCKS: ${spec.forbidden_blocks.join(", ")}
ABOUT VARIANT: ${spec.about_variant}
SERVICES VARIANT: ${spec.services_variant}
SOCIAL PROOF VARIANT: ${spec.social_proof_variant}

Output JSON with this exact shape:
{
  "sections": ["HeroFullscreen", "AboutFounder", ...],  // Ordered block IDs
  "palette": {
    "bg": "#hex",
    "surface": "#hex",
    "text": "#hex",
    "accent": "#hex",
    "muted": "#hex"
  },
  "typography": {
    "heading": "${spec.typography_pairing.heading}",
    "body": "${spec.typography_pairing.body}",
    "heading_weight": ${spec.typography_pairing.heading_weight},
    "body_weight": ${spec.typography_pairing.body_weight}
  },
  "motion_style": "slow_elegant" | "crisp_modern" | "bold_energetic",
  "image_queries": ["query1", "query2", "query3"]
}

Rules:
- sections array must use ONLY the exact BlockId strings from REQUIRED BLOCKS
- NEVER include a BlockId from FORBIDDEN BLOCKS
- palette.accent must contrast strongly against palette.bg
- image_queries: generate one per image-consuming block, be specific to the business
- motion_style must match: ${spec.motion_style_bias} (bias strongly toward this)
`;
  return geminiJSON<Partial<WebsiteComposition>>(prompt, "flash");
}

async function pass2_copy(
  brand: ExtractedBrand,
  spec: ArchetypeSpec,
  structure: Partial<WebsiteComposition>
): Promise<Partial<WebsiteComposition>> {
  const prompt = `
You are a world-class copywriter specializing in African business brands.
Generate ALL website copy for this specific business based on the structure provided.

BUSINESS:
- Name: ${brand.business_name}
- Industry: ${brand.industry}  
- Services: ${brand.services.join(", ")}
- Target audience: ${brand.target_audience}
- Unique selling point: ${brand.unique_value}
- Location: Nigeria (assume Lagos if not specified)
- Tone modifier: ${spec.copy_tone_modifier}

STRUCTURE:
${JSON.stringify(structure.sections, null, 2)}

COPY RULES:
1. Every piece of copy must be SPECIFIC to this exact business — no generic text
2. Business name "${brand.business_name}" must appear in hero headline or subheadline
3. Services must be named exactly as the user described them
4. CTAs must be action-specific ("Book your appointment" not just "Contact us")
5. Location references: mention Lagos / Nigeria where appropriate for local trust
6. Tone: ${spec.copy_tone_modifier}
7. Never use placeholder text or lorem ipsum of any kind
8. Tagline: 6-10 words maximum, should be memorable and brand-specific

Output a "content" JSON object with copy for every block in the sections array.
Each block needs: headline, subheadline (where applicable), body (where applicable),
cta_text, cta_secondary (where applicable), and any block-specific fields.

Also output:
- "tagline": The business tagline (6-10 words)
- "seo_title": 60-char max page title
- "seo_description": 155-char max meta description
- "og_title": Open Graph title
`;

  const copy = await geminiJSON<{ content: Record<string, unknown>; tagline: string; seo_title: string; seo_description: string }>(
    prompt,
    "pro"
  );
  
  return { ...structure, ...copy };
}

async function pass3_critique(
  brand: ExtractedBrand,
  composition: Partial<WebsiteComposition>,
  spec: ArchetypeSpec
): Promise<{ composition: WebsiteComposition; patches: Array<{ field: string; reason: string }> }> {
  const prompt = `
You are a senior UX reviewer. Evaluate this website composition for quality issues.

BRAND: ${brand.business_name} — ${brand.industry}
ARCHETYPE: ${spec.archetype}

COMPOSITION SUMMARY:
- Sections: ${JSON.stringify((composition as WebsiteComposition).sections)}
- Hero headline: ${JSON.stringify((composition as any).content?.hero?.headline)}
- Tagline: ${(composition as any).tagline}
- Services count: ${brand.services.length}

Check for these issues:
1. Is the hero headline specific to this business? (not generic)
2. Does the tagline feel earned or generic?  
3. Are CTAs specific and action-oriented?
4. Does the section order feel logical for this business type?
5. Are there any forbidden blocks from archetype "${spec.archetype}"?

Respond with JSON:
{
  "confidence": 0.0-1.0,
  "patches": [
    { "field": "content.hero.headline", "reason": "Too generic, missing business name" },
    { "field": "tagline", "reason": "Cliché phrase, needs specificity" }
  ]
}

If confidence >= 0.82, patches array should be empty.
`;

  const critique = await geminiJSON<{ confidence: number; patches: Array<{ field: string; reason: string }> }>(
    prompt,
    "flash"
  );

  return {
    composition: composition as WebsiteComposition,
    patches: critique.patches,
  };
}
```

---

## STEP 3 — SMART IMAGE RESOLVER
Create: src/lib/website/image-resolver.ts

```typescript
import { ArchetypeSpec } from "./archetypes";
import { WebsiteComposition } from "@/types/website";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY!;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY!;

// Blocks that consume a background/feature image
const IMAGE_CONSUMING_BLOCKS = new Set([
  "HeroFullscreen", "HeroSplit", "HeroFloatingCard",
  "AboutFounder", "CaseStudySpotlight", "CTASplit",
]);

interface ResolvedImage {
  url: string;
  blur_url: string;
  alt: string;
  credit: string;
  source: "unsplash" | "pexels" | "zuri-curated" | "fallback";
  width: number;
  height: number;
}

export async function resolveImages(
  composition: Partial<WebsiteComposition>,
  spec: ArchetypeSpec
): Promise<Partial<WebsiteComposition>> {
  const queries = (composition as any).image_queries as string[] ?? [];
  
  // Enrich queries with archetype-specific keywords
  const enrichedQueries = queries.map((q) => enrichQuery(q, spec));
  
  // Resolve all images in parallel
  const resolved = await Promise.all(
    enrichedQueries.map((q) => resolveImage(q, spec))
  );
  
  return {
    ...composition,
    resolved_images: resolved,
  };
}

function enrichQuery(query: string, spec: ArchetypeSpec): string {
  const locationKeyword = spec.image_location_keywords[0] ?? "";
  const styleKeyword = spec.image_style_keywords[0] ?? "";
  return `${query} ${locationKeyword} ${styleKeyword}`.trim();
}

async function resolveImage(query: string, spec: ArchetypeSpec): Promise<ResolvedImage> {
  // 1. Try Zuri curated collection first (Supabase Storage)
  const curated = await queryCuratedLibrary(query, spec.archetype);
  if (curated) return curated;
  
  // 2. Try Unsplash with quality filters
  const unsplash = await queryUnsplash(query, spec);
  if (unsplash) return unsplash;
  
  // 3. Fallback to Pexels
  const pexels = await queryPexels(query);
  if (pexels) return pexels;
  
  // 4. Hard fallback: archetype default image
  return getArchetypeFallback(spec.archetype);
}

async function queryUnsplash(query: string, spec: ArchetypeSpec): Promise<ResolvedImage | null> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&content_filter=high`,
      {
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
        next: { revalidate: 86400 },
      }
    );
    const data = await res.json();
    
    if (!data.results?.length) return null;
    
    // Filter by minimum quality threshold
    const qualified = data.results.filter(
      (p: any) => p.width >= 2400 && p.likes >= 10
    );
    
    if (!qualified.length) return null;
    
    // Pick first qualified result
    const photo = qualified[0];
    return {
      url: photo.urls.regular,
      blur_url: photo.urls.thumb,
      alt: photo.alt_description ?? query,
      credit: `Photo by ${photo.user.name} on Unsplash`,
      source: "unsplash",
      width: photo.width,
      height: photo.height,
    };
  } catch {
    return null;
  }
}

async function queryPexels(query: string): Promise<ResolvedImage | null> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
      {
        headers: { Authorization: PEXELS_API_KEY },
        next: { revalidate: 86400 },
      }
    );
    const data = await res.json();
    
    if (!data.photos?.length) return null;
    const photo = data.photos[0];
    
    return {
      url: photo.src.large2x,
      blur_url: photo.src.small,
      alt: photo.alt ?? query,
      credit: `Photo by ${photo.photographer} on Pexels`,
      source: "pexels",
      width: photo.width,
      height: photo.height,
    };
  } catch {
    return null;
  }
}

async function queryCuratedLibrary(
  query: string,
  archetype: string
): Promise<ResolvedImage | null> {
  // TODO: Query Supabase curated_images table when library is built
  // For now, returns null (falls through to Unsplash)
  // Table structure when ready:
  // curated_images(id, archetype, tags[], url, blur_url, alt, width, height)
  return null;
}

function getArchetypeFallback(archetype: string): ResolvedImage {
  // Solid color fallback — better than a broken image
  return {
    url: "/images/fallbacks/" + archetype + ".jpg",
    blur_url: "/images/fallbacks/" + archetype + "-blur.jpg",
    alt: "Business background",
    credit: "Zuri",
    source: "fallback",
    width: 2400,
    height: 1600,
  };
}
```

---

## STEP 4 — COMPOSITION VALIDATOR
Create: src/lib/website/composition-validator.ts

```typescript
import { WebsiteComposition, BlockId } from "@/types/website";
import { BLOCK_REGISTRY_KEYS } from "@/components/website-blocks/BlockRenderer";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateComposition(composition: WebsiteComposition): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: All BlockIds must exist in the registry
  composition.sections.forEach((blockId) => {
    if (!BLOCK_REGISTRY_KEYS.has(blockId)) {
      errors.push(`Unknown BlockId: "${blockId}" — not found in BlockRenderer registry`);
    }
  });

  // Rule 2: No duplicate hero blocks
  const heroBlocks = composition.sections.filter((s) =>
    s.toLowerCase().startsWith("hero")
  );
  if (heroBlocks.length > 1) {
    errors.push(`Multiple hero blocks found: ${heroBlocks.join(", ")}`);
  }

  // Rule 3: Must have at least one hero and one footer
  if (!composition.sections.some((s) => s.toLowerCase().startsWith("hero"))) {
    errors.push("No hero block found in sections");
  }
  if (!composition.sections.some((s) => s.toLowerCase().startsWith("footer"))) {
    errors.push("No footer block found in sections");
  }

  // Rule 4: All copy fields must be non-empty strings
  const content = (composition as any).content ?? {};
  composition.sections.forEach((blockId) => {
    if (!content[blockId]) {
      warnings.push(`No content found for block: ${blockId}`);
    }
  });

  // Rule 5: CTA text should be short
  composition.sections.forEach((blockId) => {
    const cta = content[blockId]?.cta_text;
    if (cta && cta.split(" ").length > 8) {
      warnings.push(`CTA text too long for ${blockId}: "${cta}"`);
    }
  });

  // Rule 6: Palette completeness
  const requiredPaletteKeys = ["bg", "surface", "text", "accent", "muted"];
  requiredPaletteKeys.forEach((key) => {
    if (!(composition.palette as any)[key]) {
      errors.push(`Missing palette key: ${key}`);
    }
  });

  // Rule 7: SEO fields present
  if (!(composition as any).seo_title) warnings.push("Missing seo_title");
  if (!(composition as any).seo_description) warnings.push("Missing seo_description");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

---

## STEP 5 — UPDATE THE COMPOSE-WEBSITE API ROUTE
Replace: src/app/api/ai/compose-website/route.ts

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCompositionPipeline } from "@/lib/website/composition-pipeline";
import { createAuditLog } from "@/lib/audit";

export const maxDuration = 90; // 3-pass pipeline needs more time

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { websiteType } = await req.json();

  // Fetch brand profile
  const { data: brand } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!brand) return NextResponse.json({ error: "No brand profile found" }, { status: 404 });

  try {
    // Run the full pipeline
    const { composition, needsReview } = await runCompositionPipeline(brand, websiteType);

    // Save to database
    const { data: website, error } = await supabase
      .from("websites")
      .upsert({
        user_id: user.id,
        composition_json: composition,
        needs_review: needsReview,
        generation_version: 2, // Track pipeline version for debugging
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await createAuditLog(user.id, "website.compose", "website", website.id, {
      archetype: (composition as any).archetype,
      needs_review: needsReview,
      sections_count: composition.sections.length,
    });

    return NextResponse.json({ website, needsReview });
  } catch (err) {
    console.error("Composition pipeline error:", err);
    return NextResponse.json(
      { error: "Website generation failed", details: String(err) },
      { status: 500 }
    );
  }
}
```

---

## STEP 6 — SECTION EDITOR API (NEW)
Create: src/app/api/website/section/route.ts

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiJSON } from "@/lib/gemini";

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { blockId, field, value, regenerate } = await req.json();

  const { data: website } = await supabase
    .from("websites")
    .select("composition_json")
    .eq("user_id", user.id)
    .single();

  if (!website) return NextResponse.json({ error: "No website found" }, { status: 404 });

  let updatedComposition = { ...website.composition_json };

  if (regenerate) {
    // Regenerate just this block's copy using Gemini Flash
    const { data: brand } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const newContent = await geminiJSON(
      `Regenerate copy for the "${blockId}" block for ${brand?.business_name}.
       Business: ${brand?.industry}, Services: ${brand?.services?.join(", ")}.
       Return JSON with the same fields as the original block content.
       Original: ${JSON.stringify((updatedComposition as any).content?.[blockId])}`,
      "flash"
    );

    (updatedComposition as any).content = {
      ...(updatedComposition as any).content,
      [blockId]: newContent,
    };
  } else {
    // Direct field update (user typed a change)
    (updatedComposition as any).content = {
      ...(updatedComposition as any).content,
      [blockId]: {
        ...(updatedComposition as any).content?.[blockId],
        [field]: value,
      },
    };
  }

  await supabase
    .from("websites")
    .update({ composition_json: updatedComposition, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  return NextResponse.json({ success: true, content: (updatedComposition as any).content?.[blockId] });
}
```

---

## STEP 7 — EXPORT BLOCK REGISTRY KEYS
Update: src/components/website-blocks/BlockRenderer.tsx

Add this export so the validator can import it:

```typescript
// Add near top of file, after REGISTRY is defined
export const BLOCK_REGISTRY_KEYS = new Set(Object.keys(REGISTRY));
```

---

## DATABASE MIGRATION
Add to supabase/schema.sql (run as migration):

```sql
-- Website generation metadata
ALTER TABLE websites ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS generation_version integer DEFAULT 1;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS archetype text;

-- Curated image library (for Phase 2)
CREATE TABLE IF NOT EXISTS curated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  url text NOT NULL,
  blur_url text,
  alt text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  source text NOT NULL DEFAULT 'zuri-curated',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_curated_images_archetype ON curated_images(archetype);
CREATE INDEX idx_curated_images_tags ON curated_images USING gin(tags);
```

---

## IMPLEMENTATION ORDER
1. src/lib/website/archetypes.ts (no dependencies)
2. src/lib/website/composition-validator.ts (add BLOCK_REGISTRY_KEYS export to BlockRenderer first)
3. src/lib/website/image-resolver.ts (no dependencies)
4. src/lib/website/composition-pipeline.ts (depends on 1, 2, 3)
5. src/app/api/ai/compose-website/route.ts (replace existing)
6. src/app/api/website/section/route.ts (new file)
7. Run database migration
8. Test with at least 3 different business types

## VERIFICATION CHECKLIST
- [ ] A restaurant generates HeroFullscreen or HeroSplit, never HeroTypographic
- [ ] A consultant generates ServicesListElegant, never PricingTable
- [ ] Composition JSON passes validateComposition() with zero errors
- [ ] Image queries include location keywords for African context
- [ ] Section editor PATCH updates single block without regenerating full site
- [ ] TypeScript: zero type errors (run tsc --noEmit)
- [ ] No console.error in browser during site preview render