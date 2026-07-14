// ZURI - Multi-Stage Composition Pipeline
//
// Replaces the legacy single-pass Gemini call. Now:
//   Stage 1: Resolve archetype (deterministic, no AI)            — cost: 0
//   Stage 2: Structure pass (Gemini Flash)                       — cheap JSON
//   Stage 3: Copy pass (Gemini Pro)                              — richer prose
//   Stage 4: Image resolution (parallel Unsplash / Pexels)
//   Stage 5: Critique pass (Gemini Flash)                        — quality check
//   Stage 6: Apply patches if needed (Gemini Flash per patch)
//   Stage 7: Validate (must pass or site is flagged for review)

import { geminiJSON } from "@/lib/gemini";
import { FLASH, PRO } from "@/lib/gemini";
import {
  resolveArchetype,
  ARCHETYPES,
  type ArchetypeSpec,
  isBlockId,
} from "./archetypes";
import type {
  WebsiteComposition,
  BlockId,
  CompositionPatch,
  ResolvedImage,
} from "@/types/website";
import type { ExtractedBrand } from "@/types/brand";
import { resolveImages } from "./image-resolver";
import { validateComposition } from "./composition-validator";

export interface PipelineResult {
  composition: WebsiteComposition;
  needsReview: boolean;
  /** Number of patches applied by the critique pass (0 = clean run). */
  patchCount: number;
  /** Time per stage for observability. */
  timingMs: Record<string, number>;
}

/**
 * Run the full composition pipeline for a business.
 *
 * Per the zuri.md plan:
 *   - Stage 1: deterministic archetype resolution
 *   - Stage 2: Gemini Flash structure pass (palette, sections, typography)
 *   - Stage 3: Gemini Pro copy pass (full prose)
 *   - Stage 4: parallel image resolution
 *   - Stage 5: Gemini Flash critique → patches list
 *   - Stage 6: apply patches via Gemini Flash
 *   - Stage 7: validate 
 */
export async function runCompositionPipeline(
  brand: Partial<ExtractedBrand> & Record<string, any>,
  websiteType: string
): Promise<PipelineResult> {
  const timing: Record<string, number> = {};
  const t0 = Date.now();

  // ── Stage 1: archetype resolution (deterministic, no AI) ─────────────
  const archetype = resolveArchetype(
    websiteType,
    brand.industry || "",
    brand.services || []
  );
  const spec: ArchetypeSpec = ARCHETYPES[archetype];
  timing.stage1_archetype = Date.now() - t0;

  // ── Stage 2: structure pass (Gemini Flash, cheap) ────────────────────
  const t1 = Date.now();
  const structure = await pass1Structure(brand, spec, websiteType);
  timing.stage2_structure = Date.now() - t1;

  // ── Stage 3: copy pass (Gemini Pro) ───────────────────────────────────
  const t2 = Date.now();
  const withCopy = await pass2Copy(brand, spec, structure);
  timing.stage3_copy = Date.now() - t2;

  // ── Stage 4: image resolution (parallel Unsplash / Pexels) ────────────
  const t3 = Date.now();
  const withImages = await resolveImages(withCopy, spec);
  timing.stage4_images = Date.now() - t3;

  // ── Stage 5: critique pass (Gemini Flash) ─────────────────────────────
  const t4 = Date.now();
  const critique = await pass3Critique(brand, withImages, spec);
  timing.stage5_critique = Date.now() - t4;

  // ── Stage 6: apply patches if needed ──────────────────────────────────
  let final: WebsiteComposition = {
    ...(withImages as any),
    ...(critique.composition as any),
  } as WebsiteComposition;
  let patchCount = 0;
  if (critique.patches.length > 0) {
    const t5 = Date.now();
    const applied = await applyPatches(final, critique.patches, brand, spec);
    final = applied;
    patchCount = critique.patches.length;
    timing.stage6_patches = Date.now() - t5;
  }

  // ── Stage 7: validate ─────────────────────────────────────────────────
  const t6 = Date.now();
  const { valid, errors } = validateComposition(final);
  timing.stage7_validate = Date.now() - t6;
  timing.total = Date.now() - t0;

  // Always mark needsReview if validation failed or >3 patches
  const needsReview =
    !valid ||
    patchCount > 3 ||
    !valid;

  // Tag composition with metadata
  (final as any).generation_version = 2;
  (final as any).archetype = archetype;

  return {
    composition: final,
    needsReview,
    patchCount,
    timingMs: timing,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
 *  PIPELINE STAGES
 * ════════════════════════════════════════════════════════════════════════════ */

/**
 * Stage 2 — STRUCTURE PASS
 * Gemini Flash. Output: palette, sections, typography, motion_style, image_queries.
 * NO copy. Cheaper, faster — gives us the visual scaffolding first.
 */
async function pass1Structure(
  brand: Partial<ExtractedBrand> & Record<string, any>,
  spec: ArchetypeSpec,
  websiteType: string
): Promise<Partial<WebsiteComposition>> {
  const prompt = `You are a website architect. Given this brand profile and design specification, output ONLY the structural decisions for this website. NO copy. NO text content.

BRAND:
- Business: ${brand.business_name || "Unknown"}
- Industry: ${brand.industry || "general"}
- Services: ${(brand.services || []).join(", ") || "n/a"}
- Tone: ${brand.tone || "professional"}
- Website type: ${websiteType}
- Location: ${brand.location || "Lagos, Nigeria"}

ARCHETYPE: ${spec.archetype} (${spec.copy_tone_modifier.split(".")[0]})

ALLOWED HERO BlockIds: ${spec.hero_variant_pool.join(", ")}
FORBIDDEN BlockIds: ${spec.forbidden_blocks.join(", ")}

You MUST select exactly ONE hero from ALLOWED HERO BlockIds.

The output sections array must use ONLY these BlockIds (snake_case):
- nav_standard, nav_centered, nav_minimal (pick one for the first position)
- ONE OF: ${spec.hero_variant_pool.join(", ")} (as the second position)
- ONE about variant: ${spec.about_variant}
- ONE services variant: ${spec.services_variant}
- ONE social proof variant: ${spec.social_proof_variant} (only if archetype uses social proof)
- ONE contact block: contact_form_card, contact_map_embed, or whatsapp_cta
- ONE footer_block: ${spec.footer_variant}

Plus optionally: cta_full_width, cta_split_visual, cta_card_centered for a CTA block.

Do NOT include any BlockId from FORBIDDEN list: ${spec.forbidden_blocks.join(", ")}.

PALETTE constraints:
- prefer_warm=${spec.palette_rules.prefer_warm} (warm tones if true, cool if false)
- accent_intensity=${spec.palette_rules.accent_intensity}
- Default bg #0C0C0E (near-black) unless archetype demands otherwise.

TYPOGRAPHY (mandatory):
- heading: ${spec.typography_pairing.heading}
- body: ${spec.typography_pairing.body}
- heading_weight: ${spec.typography_pairing.heading_weight}
- body_weight: ${spec.typography_pairing.body_weight}

MOTION STYLE: must be "${spec.motion_style_bias}"

IMAGE QUERIES:
- Provide one landscape Unsplash search term per image-consuming block.
- Include African / Lagos / Nigerian context where appropriate.
- Style keywords for this archetype: ${spec.image_style_keywords.join(", ")}

Output ONLY valid JSON (no commentary, no markdown):
{
  "sections": ["nav_X", "hero_Y", "about_Z", "services_W", "cta_blocks (optional)", "contact_X", "footer_Y"],
  "palette": {
    "primary": "#hex (e.g. near-black)",
    "accent": "#hex (must contrast strongly with bg)",
    "bg": "#0C0C0E",
    "surface": "#hex",
    "text": "#hex",
    "muted": "#hex"
  },
  "typography": {
    "heading": "${spec.typography_pairing.heading}",
    "body": "${spec.typography_pairing.body}",
    "heading_weight": ${spec.typography_pairing.heading_weight},
    "body_weight": ${spec.typography_pairing.body_weight}
  },
  "motion_style": "${spec.motion_style_bias}",
  "image_queries": ["query1", "query2", "query3"]
}`;

  return geminiJSON<Partial<WebsiteComposition>>(prompt, { model: FLASH, temperature: 0.6 });
}

/**
 * Stage 3 — COPY PASS
 * Gemini Pro. Generates all per-block copy + tagline + SEO meta.
 * Reads the structure from pass1 and writes prose that fits the archetype.
 */
async function pass2Copy(
  brand: Partial<ExtractedBrand> & Record<string, any>,
  spec: ArchetypeSpec,
  structure: Partial<WebsiteComposition>
): Promise<Partial<WebsiteComposition>> {
  const businessName = brand.business_name || "the business";
  const sections = (structure.sections as string[]) || [];

  const prompt = `You are a world-class copywriter specialising in African business brands. Generate ALL website copy for this specific business based on the structure provided.

BUSINESS:
- Name: ${businessName}
- Industry: ${brand.industry || "general"}
- Services: ${(brand.services || []).join(", ")}
- Target audience: ${brand.target_audience || "African consumers and businesses"}
- Unique selling point: ${brand.unique_value || "quality and reliability"}
- Tone: ${brand.tone || "professional"}
- Location: ${brand.location || "Lagos, Nigeria"}

ARCHETYPE TONE: ${spec.copy_tone_modifier}

STRUCTURE — generate copy for every section in this list:
${JSON.stringify(sections, null, 2)}

COPY RULES:
1. Every piece of copy must be SPECIFIC to this exact business — no generic text.
2. Business name "${businessName}" must appear in the hero headline or subheadline.
3. Services must be named exactly as the user described them.
4. CTAs must be action-specific ("Book your appointment", "Get a quote today") — NOT "Contact us".
5. Location references: mention Lagos / Nigeria where appropriate for local trust.
6. Tone: ${spec.copy_tone_modifier}
7. Never use placeholder text or lorem ipsum of any kind.
8. Each block must have BOTH a "headline" and "body" / "subheadline" where applicable.
9. The hero block MUST have a headline (max 12 words) and subheadline (1-2 sentences).
10. About block: a 2-4 sentence paragraph that feels human and specific.
11. Services block: provide 3-5 service items, each with a name and 1-2 sentence description that names what the business actually does.
12. CTA block: an action-oriented headline + supporting copy + cta_text.
13. Footer block: a short business tagline + contact_email + whatsapp_number if appropriate.
14. TAGLINE: 6-10 words, memorable, specific to THIS business.
15. SEO_TITLE: 60-character max, includes business name.
16. SEO_DESCRIPTION: 155-character max, includes services + location.

OUTPUT (ONLY valid JSON, no markdown):
{
  "tagline": "6-10 word tagline for ${businessName}",
  "seo_title": "≤60 chars including ${businessName}",
  "seo_description": "≤155 chars, mention services and ${brand.location || 'Lagos'}",
  "og_title": "Open Graph title for ${businessName}",
  "content": {
    "<blockId1>": { "headline": "...", "subheadline": "...", "body": "...", "cta_text": "..." },
    "<blockId2>": { "headline": "...", "body": "...", "services": [{"name": "...", "description": "..."}] },
    "cta_block": { "headline": "Ready to work with ${businessName}?", "cta_text": "Get started" },
    "footer_block": { "tagline": "...", "contact_email": "...", "whatsapp_number": "" },
    "<hero_block>": {
      "headline": "Headline that includes ${businessName}",
      "subheadline": "1-2 sentence value prop"
    }
  }
}`;

  const copyResult = await geminiJSON<{
    tagline: string;
    seo_title: string;
    seo_description: string;
    og_title: string;
    content: Record<string, any>;
  }>(prompt, { model: PRO, temperature: 0.7 });

  // Wrap the per-block content into CompositionContentV2.
  return {
    ...structure,
    tagline: copyResult.tagline,
    seo_title: copyResult.seo_title,
    seo_description: copyResult.seo_description,
    og_title: copyResult.og_title,
    content: {
      blocks: copyResult.content,
      // Flat fallbacks (so legacy blocks keep rendering):
      hero_headline: extractFirst(copyResult.content, ["hero_fullscreen", "hero_split", "hero_typographic", "hero_gradient", "hero_floating_card", "hero_minimal"], "headline"),
      hero_subheadline: extractFirst(copyResult.content, ["hero_fullscreen", "hero_split", "hero_typographic", "hero_gradient", "hero_floating_card", "hero_minimal"], "subheadline"),
      about_paragraph: extractFirst(copyResult.content, ["about_founder", "about_mission", "about_stats", "about_timeline"], "body"),
      services: extractServices(copyResult.content, ["services_card_grid", "services_list_elegant", "services_tabs", "pricing_table"]),
      cta_text:
        copyResult.content?.cta_full_width?.cta_text ||
        copyResult.content?.cta_split_visual?.cta_text ||
        copyResult.content?.cta_card_centered?.cta_text ||
        "Get started",
      contact_email: copyResult.content?.contact_form_card?.contact_email || copyResult.content?.footer_columns?.contact_email,
    },
  };
}

/** Helper: pull a field out of the first block in `keys` that exists in `content`. */
function extractFirst(
  content: Record<string, any>,
  keys: string[],
  field: string
): string | undefined {
  for (const k of keys) {
    const v = content?.[k]?.[field];
    if (v) return String(v);
  }
  return undefined;
}

/** Helper: extract services array from the first services block that has it. */
function extractServices(
  content: Record<string, any>,
  keys: string[]
): Array<{ name: string; description: string }> {
  for (const k of keys) {
    const arr = content?.[k]?.services;
    if (Array.isArray(arr) && arr.length) return arr;
  }
  return [];
}

/**
 * Stage 5 — CRITIQUE PASS
 * Gemini Flash. Examines the composition and emits a patch list.
 * If confidence is high, no patches are returned.
 */
async function pass3Critique(
  brand: Partial<ExtractedBrand> & Record<string, any>,
  composition: Partial<WebsiteComposition>,
  spec: ArchetypeSpec
): Promise<{ composition: Partial<WebsiteComposition>; patches: CompositionPatch[] }> {
  const compAny = composition as any;
  const heroBlock = [
    "hero_fullscreen", "hero_split", "hero_typographic",
    "hero_gradient", "hero_floating_card", "hero_minimal",
  ].find((h) => (composition.sections as string[] | undefined)?.includes(h));
  const heroHeadline =
    compAny.content?.blocks?.[heroBlock ?? ""]?.headline ||
    compAny.content?.hero_headline ||
    "";
  const tagline = compAny.tagline || "";

  const prompt = `You are a senior UX reviewer for Zuri, an AI website builder for African entrepreneurs.

BRAND: ${brand.business_name} — ${brand.industry}
ARCHETYPE: ${spec.archetype}

COMPOSITION SNAPSHOT:
- Sections: ${JSON.stringify(composition.sections || [])}
- Hero headline: ${JSON.stringify(heroHeadline)}
- Tagline: ${JSON.stringify(tagline)}
- SEO title: ${JSON.stringify(compAny.seo_title || "")}
- SEO description: ${JSON.stringify(compAny.seo_description || "")}
- Hero variant allowed: ${spec.hero_variant_pool.join(", ")}
- Forbidden blocks: ${spec.forbidden_blocks.join(", ")}

Check for these issues, list concrete patches where needed:
1. Hero headline — is it specific? Does it name the business or industry? Or is it generic ("Welcome", "Your success starts here")?
2. Tagline — earned vs cliché? Is it 6-10 words?
3. CTAs — action-specific ("Book a free consultation") vs vague ("Click here")?
4. Section order — does it flow logically (nav → hero → about → services → proof → cta → contact → footer)?
5. Forbidden blocks — does composition.sections contain any from forbidden list?
6. SEO fields present and reasonable length?

Respond with ONLY valid JSON, no commentary:
{
  "confidence": 0.0 to 1.0,
  "patches": [
    { "field": "<dotted.path.to.field>", "reason": "<short human readable>" }
  ]
}

If confidence >= 0.82, return empty patches array.
Patches should NOT exceed 3 in total unless something is fundamentally broken.`;

  const critique = await geminiJSON<{ confidence: number; patches: CompositionPatch[] }>(
    prompt,
    { model: FLASH, temperature: 0.3 }
  );

  return {
    composition: composition as Partial<WebsiteComposition>,
    patches: Array.isArray(critique.patches) ? critique.patches : [],
  };
}

/**
 * Stage 6 — APPLY PATCHES
 * For each patch, ask Gemini Flash to produce the corrected value, then
 * write it into the composition at `patch.field` (dotted path).
 */
async function applyPatches(
  composition: WebsiteComposition,
  patches: CompositionPatch[],
  brand: Partial<ExtractedBrand> & Record<string, any>,
  _spec: ArchetypeSpec
): Promise<WebsiteComposition> {
  // Clone composition so we never mutate the caller's reference
  const next: any = JSON.parse(JSON.stringify(composition));

  // Cap to first 3 patches to keep latency bounded
  const limited = patches.slice(0, 3);

  for (const patch of limited) {
    try {
      const replacementPrompt = `Business: ${brand.business_name}, a ${brand.industry} in ${brand.location || "Lagos, Nigeria"}. Services: ${(brand.services || []).join(", ")}.

Replace the following field on the composition: ${patch.field}
Reason: ${patch.reason}
Current value: ${JSON.stringify(readField(next, patch.field))}

Provide ONLY the new value (JSON-serialisable, no commentary). Return strictly valid JSON that matches the field's type. If the field is a string, return a string. If a headline, make it specific and reference the business name or industry.`;

      const newValue = await geminiJSON<unknown>(replacementPrompt, { model: FLASH, temperature: 0.7 });
      writeField(next, patch.field, newValue);
    } catch (e) {
      // Soft-fail individual patches; the validator will still flag remaining issues
      console.warn("[applyPatches] failed for", patch.field, e);
    }
  }

  return next as WebsiteComposition;
}

/** Safely read a dotted path from an object. */
function readField(obj: any, path: string): unknown {
  return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

/** Safely write a dotted path into an object. */
function writeField(obj: any, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (cur[part] == null || typeof cur[part] !== "object") cur[part] = {};
    cur = cur[part];
  }
  cur[parts[parts.length - 1]] = value;
}
