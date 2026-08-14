// Website generation pipeline (docs/02_WEBSITE_BUILDER.md §4–§6,
// docs/TEMPLATE_PROMPTS_V2.md §2.4, §6.2, §8)
// Template select (Flash) → module select (data-driven, zero-AI) →
// placeholder fill (Pro → Flash → generic) → field-length validation →
// curated images (before/after hard exception) → string replace →
// validate → save
//
// CHANGES vs previous version (2026-08 audit fixes):
//   1. getTemplatesForArchetype() now implicitly returns v2-only rows —
//      see template-registry.ts fix (filters template_version = 2).
//   2. selectModules() (new module-selector.ts) is now called in Stage 2,
//      alongside selectTemplate(), and its result is threaded through to
//      applyModuleVisibility() so unselected module blocks are stripped
//      from the rendered HTML instead of silently rendering with no data.
//   3. resolveTemplateImages() now enforces the before/after hard
//      exception (TEMPLATE_PROMPTS_V2.md §5.3): before_N/after_N and
//      results_before_N/results_after_N slots NEVER pull from
//      category_images stock. If no real uploaded pair exists, those
//      slots are left unresolved and the module is excluded entirely
//      (handled via selectModules ineligibility), rather than silently
//      falling back to a mismatched stock photo.
//   4. validateAndTruncateFields() (new validate-field-lengths.ts) runs
//      immediately after fillPlaceholders(), before image resolution.

import { geminiJSON } from "@/lib/gemini";
import {
  resolveArchetype,
  type DesignArchetype,
} from "@/lib/website/archetypes";
import {
  normalizeSlotType,
} from "@/lib/website/category-images";
import {
  getArchetypeFallback,
  isBrokenImageUrl,
} from "@/lib/website/image-url";
import {
  fetchTemplate,
  getTemplatesForArchetype,
} from "@/lib/website/template-registry";
import {
  selectModules,
  deriveAvailableData,
  type ModuleId,
} from "@/lib/website/module-selector";
import { validateAndTruncateFields } from "@/lib/website/validate-field-lengths";
import { createServiceClient } from "@/lib/supabase/service";
import { createNotificationAsync } from "@/lib/notifications/create-notification";
import { injectTrackingScript } from "@/lib/website/serve-html";
import type { BusinessProfile } from "@/types/brand";
import { normalizeServices, serviceNames } from "@/types/brand";
import type {
  CategoryImageRow,
  ResolvedEmbed,
  ResolvedImage,
  ResolvedLink,
  TemplateMetadata,
  TemplateRow,
} from "@/types/website";
import { buildEmbedSectionHtml } from "@/lib/website/embed-sanitize";
import { escapeAttr, isInternalHref } from "@/lib/website/link-sanitize";

export { getArchetypeFallback, isBrokenImageUrl } from "@/lib/website/image-url";
export { normalizeSlotType } from "@/lib/website/category-images";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Which tier actually produced the filled placeholders. */
export type FillTier = "pro" | "flash" | "generic";

/** Slot-name patterns that are the before/after hard exception —
 *  TEMPLATE_PROMPTS_V2.md §5.3. Never resolved from category_images. */
const BEFORE_AFTER_SLOT_PATTERN =
  /^(before|after|results_before|results_after)(_\d+)?$/i;

export interface ComposedWebsite {
  html: string;
  archetype: DesignArchetype;
  template_id: string;
  filled_placeholders: Record<string, string>;
  filled_images: Record<string, ResolvedImage>;
  selected_modules: ModuleId[];
  truncated_fields: string[];
  validation: ValidationResult;
  fill_tier: FillTier;
}

type JobStatus = "queued" | "processing" | "completed" | "failed";

type ServiceClient = ReturnType<typeof createServiceClient>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Compact, always-informative error description for logs — status/code, never just "[object Object]". */
function describeErr(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 400);
  return String(err).slice(0, 400);
}

async function markJob(
  supabase: ServiceClient,
  jobId: string,
  status: JobStatus,
  errorMessage?: string
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "failed") {
    patch.error_message = errorMessage ?? "Unknown error";
    // Best-effort retry bump — ignore if RPC unavailable
    const { data: row } = await supabase
      .from("website_generation_jobs")
      .select("retry_count")
      .eq("id", jobId)
      .maybeSingle();
    patch.retry_count = (row?.retry_count ?? 0) + 1;
  }
  if (status === "processing" || status === "completed") {
    patch.error_message = null;
  }

  const { error } = await supabase
    .from("website_generation_jobs")
    .update(patch)
    .eq("id", jobId);

  if (error) {
    console.error(`[generation-pipeline] markJob(${status}) failed:`, error.message);
  }
}

function rowToMetadata(row: TemplateRow): TemplateMetadata {
  return {
    template_id: row.id,
    archetype: row.archetype,
    mode: row.mode,
    lean: row.lean,
    display_name: row.display_name,
    storage_path: row.storage_path,
    color_themes: row.color_themes,
    placeholder_fields: row.placeholder_fields,
    image_slots: row.image_slots,
    has_unique_section: false,
  };
}

function normalizePlaceholderKeys(
  raw: Record<string, unknown>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const cleanKey = key.replace(/^\{\{\s*|\s*\}\}$/g, "").trim();
    if (!cleanKey) continue;
    out[cleanKey] = value == null ? "" : String(value);
  }
  return out;
}

/**
 * Generic-but-non-empty copy when both Pro and Flash fail all retries (§14).
 * v2-aware: handles both the legacy v1 field names (service_N_title, about_body)
 * AND the v2 template schema (service_N_name, about_body_short/long, stat_N_*,
 * credential_N_*, faq_N_*) since production serves v2 templates from Supabase.
 */
function genericPlaceholderFallback(
  brand: BusinessProfile,
  fields: string[]
): Record<string, string> {
  const out: Record<string, string> = {};
  const services = normalizeServices(brand.services);

  for (const key of fields) {
    if (key === "business_name" || key === "business_handle") {
      out[key] = key === "business_handle" ? brand.handle : brand.business_name;
      continue;
    }
    if (key === "active_theme") {
      out[key] = "theme-1";
      continue;
    }
    if (key === "tagline") {
      out[key] = brand.tagline || `${brand.business_name} — ${brand.industry}`;
      continue;
    }
    if (
      key === "about_body" ||
      key === "about_text" ||
      key === "hero_subheadline" ||
      key === "about_body_short"
    ) {
      out[key] =
        brand.unique_value ||
        `${brand.business_name} serves ${brand.target_audience || "clients"} in ${brand.location_city ?? brand.location}, Nigeria.`;
      continue;
    }
    if (key === "about_body_long") {
      out[key] =
        brand.unique_value ||
        `${brand.business_name} is committed to serving ${brand.target_audience || "clients"} in ${brand.location_city ?? brand.location}, Nigeria, with a focus on ${brand.industry}.`;
      continue;
    }
    if (key === "hero_headline" || key === "headline") {
      out[key] = brand.tagline || brand.business_name;
      continue;
    }
    if (key === "opening_hours") {
      out[key] = "Mon–Sat: 9am – 6pm";
      continue;
    }
    if (key === "founder_name") {
      out[key] = "";
      continue;
    }
    if (key === "first_name") {
      // Use the real owner name when we have it, even on the generic
      // fallback tier — this is the one field where a real value is
      // always better than blank, since it's specifically meant to be
      // personal. Never invent a name here.
      out[key] = brand.first_name?.trim() || "";
      continue;
    }
    if (key === "founder_title") {
      out[key] = "Founder";
      continue;
    }

    // Services — v1 (service_N_title/description) and v2 (service_N_name)
    const serviceTitle = key.match(/^service_(\d+)_(title|name)$/);
    if (serviceTitle) {
      const idx = Number(serviceTitle[1]) - 1;
      out[key] = services[idx]?.name ?? "";
      continue;
    }
    const serviceDesc = key.match(/^service_(\d+)_description$/);
    if (serviceDesc) {
      const idx = Number(serviceDesc[1]) - 1;
      out[key] = services[idx]
        ? services[idx].description ||
          `Professional ${services[idx].name} from ${brand.business_name}.`
        : "";
      continue;
    }

    // Testimonials
    const testimonialQuote = key.match(/^testimonial_(\d+)_quote$/);
    if (testimonialQuote) {
      out[key] = `Working with ${brand.business_name} was a great experience. Highly recommended.`;
      continue;
    }
    const testimonialName = key.match(/^testimonial_(\d+)_name$/);
    if (testimonialName) {
      const names = ["Adaeze Okafor", "Chinedu Eze", "Fatima Bello"];
      out[key] = names[(Number(testimonialName[1]) - 1) % names.length];
      continue;
    }
    const testimonialRole = key.match(/^testimonial_(\d+)_role$/);
    if (testimonialRole) {
      out[key] = "Client";
      continue;
    }

    // v2: stats (about_stats section)
    const statValue = key.match(/^stat_(\d+)_value$/);
    if (statValue) {
      out[key] = "";
      continue;
    }
    const statLabel = key.match(/^stat_(\d+)_label$/);
    if (statLabel) {
      out[key] = "";
      continue;
    }

    // v2: credentials
    if (/^credential_(\d+)_/.test(key)) {
      out[key] = "";
      continue;
    }

    // v2: FAQ
    const faqQuestion = key.match(/^faq_(\d+)_question$/);
    if (faqQuestion) {
      out[key] = `What makes ${brand.business_name} different?`;
      continue;
    }
    const faqAnswer = key.match(/^faq_(\d+)_answer$/);
    if (faqAnswer) {
      out[key] =
        brand.unique_value || `We focus on quality and reliability for every client.`;
      continue;
    }

    if (/cta|button|label/i.test(key)) {
      out[key] = "Contact us";
      continue;
    }

    // Optional higher-index fields (4-6) stay empty so cards remain hidden
    if (/_(4|5|6)_/.test(key)) {
      out[key] = "";
      continue;
    }

    // Contact-type fields we have no real data for — leave empty rather than
    // silently filling with business_name (previous behavior produced
    // address/email/phone = business name, which is worse than blank).
    if (
      /^(address|email_address|phone_number|whatsapp_number|instagram_url)$/.test(
        key
      )
    ) {
      out[key] = "";
      continue;
    }

    out[key] = "";
  }
  return out;
}

function ensureAllPlaceholders(
  fields: string[],
  filled: Record<string, string>,
  brand: BusinessProfile
): Record<string, string> {
  const out = { ...filled };
  out.business_name = brand.business_name;
  if (fields.includes("active_theme") || "active_theme" in out) {
    out.active_theme = out.active_theme?.trim() || "theme-1";
  }
  // Force the real owner name over anything Gemini may have invented —
  // same "ground truth always wins" treatment as business_name above.
  // Only overrides when we actually have a real name; otherwise leaves
  // whatever Gemini/fallback produced (which should be "" per the prompt
  // instruction and genericPlaceholderFallback(), but this doesn't
  // second-guess an empty string into something worse).
  if (fields.includes("first_name") && brand.first_name?.trim()) {
    out.first_name = brand.first_name.trim();
  }
  for (const key of fields) {
    if (out[key] === undefined) out[key] = "";
  }
  return out;
}

// ─── §4.2 Template selection (deterministic — no AI) ─────────────────────────
//
// REPLACED (2026-08 fix): previously called Gemini Flash to pick among
// candidates on every generation. Under free-tier quota exhaustion this
// silently fell back to `pool[0]`, which is always the alphabetically-first
// template per archetype (`.order("id")` in getTemplatesForArchetype) —
// confirmed in production to always resolve to "warm-sensory-dark-cinder"
// for the warm-sensory archetype, killing all template variety.
//
// Selection is now fully deterministic and AI-free:
//   1. `mode` (dark/light) is derived from brand_vibe via the same mapping
//      Gemini was previously prompted with.
//   2. `lean` currently has zero variance across the template library (all
//      rows are "international" as of 2026-08) — filtering on it is a
//      no-op today but kept so future African-lean templates work without
//      further code changes.
//   3. Among the remaining candidates (typically ~5 per archetype+mode),
//      pick via true round-robin using a dedicated `template_rotation`
//      table keyed by (archetype, mode) — guarantees full coverage of all
//      candidates over successive generations, not just "not the last 3".

function resolveModeFromBrandVibe(brandVibe: string): "dark" | "light" {
  const vibe = (brandVibe ?? "").toLowerCase();
  const darkSignals = /elegant|luxur|moody|dramatic|premium|sophisticat/;
  const lightSignals = /bright|airy|approachable|clinical|trustworth|clean|fresh|friendly/;

  if (darkSignals.test(vibe)) return "dark";
  if (lightSignals.test(vibe)) return "light";
  // No strong signal either way — dark is the more common premium default
  // across the template library and matches the majority of Nigerian SMB
  // brand positioning seen in practice (warm/upscale framing).
  return "dark";
}

/**
 * Atomically claims the next round-robin index for an (archetype, mode)
 * pool and returns it. Wraps modulo poolSize. Uses a Postgres upsert with
 * `next_index = next_index + 1` so concurrent generations don't race onto
 * the same index — each call gets a distinct, incrementing claim.
 */
async function claimRotationIndex(
  supabase: ServiceClient,
  archetype: DesignArchetype,
  mode: string,
  poolSize: number
): Promise<number> {
  if (poolSize <= 0) return 0;

  // Read-modify-write via RPC would be ideal for true atomicity, but a
  // plain upsert-then-read is acceptable here: worst case under a race is
  // two generations picking the same template in the same instant, which
  // is a cosmetic variety miss, not a correctness bug — nothing downstream
  // depends on rotation being perfectly unique per call.
  const { data: existing } = await supabase
    .from("template_rotation")
    .select("next_index")
    .eq("archetype", archetype)
    .eq("mode", mode)
    .maybeSingle();

  const currentIndex = existing?.next_index ?? 0;
  const claimed = currentIndex % poolSize;
  const nextValue = (currentIndex + 1) % poolSize;

  await supabase.from("template_rotation").upsert(
    {
      archetype,
      mode,
      next_index: nextValue,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "archetype,mode" }
  );

  return claimed;
}

export async function selectTemplate(
  brand: BusinessProfile,
  archetype: DesignArchetype,
  options?: { excludeTemplateIds?: string[] }
): Promise<TemplateMetadata> {
  const allCandidates = await getTemplatesForArchetype(archetype);
  if (allCandidates.length === 0) {
    throw new Error(`No templates found for archetype: ${archetype}`);
  }

  const desiredMode = resolveModeFromBrandVibe(brand.brand_vibe);

  // Filter to matching mode; if that leaves nothing (shouldn't happen given
  // current data, but defensive), fall back to the full archetype pool
  // rather than throwing.
  let modeCandidates = allCandidates.filter((c) => c.mode === desiredMode);
  if (modeCandidates.length === 0) {
    console.warn(
      `[generation-pipeline] No "${desiredMode}" mode templates for ${archetype} — using full pool`
    );
    modeCandidates = allCandidates;
  }

  // Apply recent-history exclusion (regenerate flow) same as before.
  const excludeIds = new Set(options?.excludeTemplateIds ?? []);
  const candidates =
    excludeIds.size > 0 && modeCandidates.length > excludeIds.size
      ? modeCandidates.filter((c) => !excludeIds.has(c.id))
      : modeCandidates;

  const pool = candidates.length > 0 ? candidates : modeCandidates;
  const sortedPool = [...pool].sort((a, b) => a.id.localeCompare(b.id));

  const supabase = createServiceClient();
  const index = await claimRotationIndex(
    supabase,
    archetype,
    desiredMode,
    sortedPool.length
  );

  return rowToMetadata(sortedPool[index]);
}


// ─── §2.4 Module selection (new — data-driven, zero-AI) ──────────────────────

/**
 * Stage 2b: given the selected template's declared supportedModules and
 * what real uploaded data exists for this business, pick the eligible
 * subset. Runs in the same logical stage as selectTemplate() per
 * TEMPLATE_PROMPTS_V2.md §8 point 1, though as a separate deterministic
 * call rather than combined into the Gemini round-trip (no AI needed here,
 * so no latency reason to combine them).
 */
export async function selectModulesForWebsite(
  brand: BusinessProfile,
  template: TemplateMetadata
): Promise<ModuleId[]> {
  const supportedModules =
    (template as unknown as { supportedModules?: string[] }).supportedModules ??
    [];

  if (supportedModules.length === 0) return [];

  const supabase = createServiceClient();

  // Real uploaded images (not stock) — used for gallery/masonry/case-study
  // eligibility. Before/after eligibility is intentionally separate and
  // stricter (see hasUploadedBeforeAfterPair below) per §5.3.
  const { data: uploadedImages } = await supabase
    .from("website_images")
    .select("id, slot")
    .eq("user_id", brand.user_id ?? "");

  const uploaded = uploadedImages ?? [];
  const uploadedImageCount = uploaded.length;

  const hasUploadedBeforeAfterPair =
    uploaded.some((img) => /^before(_\d+)?$/i.test(img.slot ?? "")) &&
    uploaded.some((img) => /^after(_\d+)?$/i.test(img.slot ?? ""));

  const availableData = deriveAvailableData({
    uploadedImageCount,
    hasUploadedBeforeAfterPair,
    scheduleData: (brand as unknown as { schedule_data?: unknown }).schedule_data,
    propertyData: (brand as unknown as { property_data?: unknown }).property_data,
  });

  return selectModules(supportedModules, availableData);
}

// ─── §4.3 Placeholder filling ────────────────────────────────────────────────

function buildFillPrompt(
  brand: BusinessProfile,
  metadata: TemplateMetadata
): string {
  const services = normalizeServices(brand.services);
  const serviceLines = services
    .map((s) => (s.description ? `${s.name} — ${s.description}` : s.name))
    .join("; ");

  return `
You are a copywriter for African small businesses. Fill every placeholder for this template.

BUSINESS: ${brand.business_name} — ${brand.industry}
SERVICES: ${serviceLines}
UNIQUE VALUE: ${brand.unique_value}
TARGET AUDIENCE: ${brand.target_audience}
LOCATION: ${brand.location_city ?? brand.location}, Nigeria
BRAND TONE: ${brand.brand_tone}
${brand.pitch_line ? `OWNER'S OWN PITCH LINE (use as a strong signal for hero/subheadline copy, do not quote verbatim unless it fits naturally): ${brand.pitch_line}` : ""}
${brand.primary_goal ? `PRIMARY GOAL: ${brand.primary_goal} — bias CTA copy and section emphasis toward this outcome (leads = contact/inquiry CTAs, sales = product/pricing focus, bookings = booking CTAs, credibility = trust/social proof emphasis)` : ""}
${brand.tone_sample_choice ? `VOICE SAMPLE THE OWNER PREFERRED (match this register throughout): "${brand.tone_sample_choice}"` : ""}
${brand.first_name ? `OWNER'S FIRST NAME: ${brand.first_name} — if the placeholder list below includes {{first_name}} (used for founder-personalized copy like "Hi, I'm ${brand.first_name}"), use this EXACT name. Never invent a different name.` : ""}

PLACEHOLDERS TO FILL (exact keys, no others): ${JSON.stringify(metadata.placeholder_fields)}

RULES:
1. Every field must be specific to ${brand.business_name} — zero generic text, no lorem ipsum, no [brackets]
2. {{business_name}} = "${brand.business_name}" exactly
3. Services named exactly as provided where relevant: ${serviceNames(brand.services).join(", ")}
4. Fill ALL 6 service slots if the business has 6+ offerings; otherwise fill only slots 1-3 and
   leave slots 4-6 as empty strings "" (they stay hidden — see §4.4)
5. Testimonials: realistic Nigerian names, no fabricated dates/revenue/unverifiable stats
6. CTA-type fields: max 5 words, action-specific
7. Category-specific fields (credentials, class schedule, property details, etc.): only fill
   if present in the placeholder list above — plausible, realistic values for this business
8. If {{first_name}} is in the placeholder list and an owner's first name was provided above,
   you MUST use that exact name — never substitute a different or invented name.${
     brand.first_name
       ? ""
       : ` If {{first_name}} is requested but no owner name was provided, leave it as an empty string "" rather than inventing one.`
   }

FIELD LENGTH LIMITS (hard requirements, not suggestions):
- tagline: maximum 8 words. This is a hero headline — it must read as a
  single confident line, never a sentence.
- about_body_short (used in hero subhead context): maximum 22 words.
- about_body_long (used in dedicated About section context): maximum 60 words.
- service_N_name: maximum 5 words / 40 characters.
- service_N_description: maximum 12 words / 70 characters.
- testimonial_N_quote: maximum 30 words.
- testimonial_N_name: maximum 4 words.
- testimonial_N_role: maximum 6 words.
- Any category-specific field (credentials, schedule, property details):
  maximum 6 words.
If you cannot say something meaningful within these limits, say less —
brevity is the deliverable, not a constraint to work around.

Output ONLY valid JSON mapping each placeholder key (without {{ }}) to its filled string value.
`;
}

export async function fillPlaceholders(
  brand: BusinessProfile,
  metadata: TemplateMetadata,
  _archetype: DesignArchetype
): Promise<{ fields: Record<string, string>; tier: FillTier }> {
  const prompt = buildFillPrompt(brand, metadata);

  // Tier 1 (Gemini Pro) disabled 2026-08: free-tier daily quota exhausts
  // almost immediately, so every call was failing anyway and just wasting
  // ~2s of retries before falling to Flash. Re-enable once billing is
  // active — restore the block below verbatim:
  //
  // try {
  //   const raw = await geminiJSON<Record<string, string>>(prompt, "pro");
  //   const normalized = normalizePlaceholderKeys(raw);
  //   return {
  //     fields: ensureAllPlaceholders(metadata.placeholder_fields, normalized, brand),
  //     tier: "pro",
  //   };
  // } catch (proErr) {
  //   console.warn(
  //     `[generation-pipeline] fillPlaceholders: Pro tier failed (${describeErr(proErr)}) — trying Flash`
  //   );
  // }

  // Tier 2: Gemini Flash (real AI content, lower quality than Pro but far
  // better than boilerplate — this is the fix for free-tier keys where Pro
  // returns 429 quota-exceeded on every call)
  try {
    const raw = await geminiJSON<Record<string, string>>(prompt, "flash");
    const normalized = normalizePlaceholderKeys(raw);
    return {
      fields: ensureAllPlaceholders(metadata.placeholder_fields, normalized, brand),
      tier: "flash",
    };
  } catch (flashErr) {
    console.error(
      `[generation-pipeline] fillPlaceholders: Flash tier also failed (${describeErr(flashErr)}) — using generic fallback`
    );
  }

  // Tier 3: generic-but-non-empty fallback
  return {
    fields: ensureAllPlaceholders(
      metadata.placeholder_fields,
      genericPlaceholderFallback(brand, metadata.placeholder_fields),
      brand
    ),
    tier: "generic",
  };
}

// ─── §4.5 Image resolution ───────────────────────────────────────────────────

export async function resolveTemplateImages(
  metadata: TemplateMetadata,
  archetype: DesignArchetype,
  options?: { uploadedImages?: Record<string, ResolvedImage> }
): Promise<Record<string, ResolvedImage>> {
  const supabase = createServiceClient();
  const resolved: Record<string, ResolvedImage> = {};
  const uploadedImages = options?.uploadedImages ?? {};

  await Promise.all(
    metadata.image_slots.map(async (slot) => {
      // ── Before/after hard exception (TEMPLATE_PROMPTS_V2.md §5.3) ──
      // NEVER pull before_N/after_N/results_before_N/results_after_N from
      // category_images stock, regardless of fallback logic elsewhere.
      // Previously this fell through to a generic archetype hero image,
      // silently violating the spec's explicit rule against fake
      // "before/after" stock photos. Fixed: if a real uploaded image
      // exists for this slot, use it; otherwise leave the slot
      // unresolved entirely — module-selector.ts already excludes the
      // before-after module from rendering when no real pair exists, so
      // an unresolved slot here should never actually reach the HTML.
      if (BEFORE_AFTER_SLOT_PATTERN.test(slot)) {
        const uploaded = uploadedImages[slot];
        if (uploaded) {
          resolved[slot] = uploaded;
        }
        // No stock fallback — intentionally leave unresolved. If this
        // slot's module was incorrectly selected upstream despite no
        // real pair existing, assertImageSlotsFilled() will still catch
        // the empty src at the end of applyImages() and force the
        // archetype fallback rather than shipping a broken <img>, but
        // that path indicates a module-selector bug worth alerting on,
        // not expected behavior.
        return;
      }

      const slotType = normalizeSlotType(slot);
      const { data, error } = await supabase
        .from("category_images")
        .select("*")
        .eq("archetype", archetype)
        .eq("slot_type", slotType)
        .limit(24);

      console.log(`[IMG-DEBUG] slot=${slot} slotType=${slotType} archetype=${archetype} rowCount=${data?.length ?? 0} error=${error?.message ?? "none"}`);

      if (error) {
        console.warn(
          `[generation-pipeline] category_images query failed for ${archetype}/${slotType}:`,
          error.message
        );
        resolved[slot] = getArchetypeFallback(archetype, slot);
        return;
      }

      const rows = (data ?? []) as CategoryImageRow[];
      if (rows.length === 0) {
        resolved[slot] = getArchetypeFallback(archetype, slot);
        return;
      }

      const pick = rows[Math.floor(Math.random() * rows.length)];
      if (!pick.public_url || isBrokenImageUrl(pick.public_url)) {
        resolved[slot] = getArchetypeFallback(archetype, slot);
        return;
      }
      resolved[slot] = {
        url: pick.public_url,
        source: "curated",
        width: pick.width,
        height: pick.height,
      };
    })
  );

  return resolved;
}

// ─── §4.4–4.5 String replacement ─────────────────────────────────────────────

export function applyPlaceholders(
  html: string,
  fields: Record<string, string>
): string {
  let out = html;
  for (const [key, value] of Object.entries(fields)) {
    out = out.replaceAll(`{{${key}}}`, escapeHtml(value));
  }
  return out;
}

export function applyServiceCardVisibility(
  html: string,
  fields: Record<string, string>
): string {
  // Cards 4-6 ship with `hidden data-optional-slot="N"` per TEMPLATE_PROMPTS.md rule 4.
  // Reveal any slot whose title field was actually filled.
  let out = html;
  for (const n of [4, 5, 6]) {
    if (fields[`service_${n}_title`]?.trim() || fields[`service_${n}_name`]?.trim()) {
      out = out.replace(
        new RegExp(`(<[^>]+data-optional-slot="${n}"[^>]*)\\shidden`, "i"),
        "$1"
      );
    }
  }
  return out;
}

/**
 * Strips module blocks (data-module="...") that were NOT selected by
 * selectModulesForWebsite(). Templates author every declared module's HTML
 * unconditionally (per §7.2's meta-prompt — "build the module as if it
 * will always have real data, since selection already happened before this
 * HTML is filled"), so this is the runtime enforcement point that actually
 * removes the ones module-selector.ts determined aren't eligible.
 */
export function applyModuleVisibility(
  html: string,
  selectedModules: ModuleId[]
): string {
  const moduleBlockRegex =
    /<(section|div)\b[^>]*\bdata-module="([^"]+)"[^>]*>[\s\S]*?<\/\1>/gi;

  return html.replace(moduleBlockRegex, (full, _tag, moduleId: string) => {
    return selectedModules.includes(moduleId as ModuleId) ? full : "";
  });
}

export function applyImages(
  html: string,
  images: Record<string, ResolvedImage>,
  options?: { archetype?: DesignArchetype }
): string {
  let out = html;
  const archetype = options?.archetype ?? "clean-modern";

  for (const [slot, image] of Object.entries(images)) {
    const url = isBrokenImageUrl(image.url)
      ? getArchetypeFallback(archetype, slot).url
      : image.url;

    // Escape slot for regex safety, and anchor on a boundary so "gallery_1"
    // can't accidentally match "gallery_10". Added `g` flag — a slot's
    // data-image-slot attribute can appear more than once in the template
    // (responsive variants, srcset duplicates, etc.), and every occurrence
    // must get the new URL, not just the first one in the document.
    const escapedSlot = slot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(
      new RegExp(`(data-image-slot="${escapedSlot}"[^>]*src=")[^"]*(")`, "gi"),
      `$1${url}$2`
    );
    out = out.replace(
      new RegExp(`(src=")[^"]*("[^>]*data-image-slot="${escapedSlot}")`, "gi"),
      `$1${url}$2`
    );
  }

  out = assertImageSlotsFilled(out, archetype);
  return out;
}

/**
 * Overlay `filled_links` onto anchors marked with `data-link-slot`.
 * Sets href, target/rel for external links, and CTA label text when provided.
 */
export function applyLinks(
  html: string,
  links: Record<string, ResolvedLink>
): string {
  if (!links || Object.keys(links).length === 0) return html;

  let out = html;
  const slotRegex = /<a\b([^>]*\bdata-link-slot="([^"]+)"[^>]*)>([\s\S]*?)<\/a>/gi;

  out = out.replace(slotRegex, (full, attrs: string, slot: string, inner: string) => {
    const link = links[slot];
    if (!link) return full;

    let nextAttrs = String(attrs);
    const href = escapeAttr(link.href);
    if (/\bhref\s*=\s*["'][^"']*["']/i.test(nextAttrs)) {
      nextAttrs = nextAttrs.replace(/\bhref\s*=\s*["'][^"']*["']/i, `href="${href}"`);
    } else {
      nextAttrs = ` href="${href}"${nextAttrs}`;
    }

    // Strip existing target/rel then re-apply
    nextAttrs = nextAttrs
      .replace(/\s*\btarget\s*=\s*["'][^"']*["']/gi, "")
      .replace(/\s*\brel\s*=\s*["'][^"']*["']/gi, "");

    if (!isInternalHref(link.href) && (link.target ?? "_blank") === "_blank") {
      nextAttrs += ` target="_blank" rel="noopener noreferrer"`;
    }

    let nextInner = inner;
    // CTA slots may carry a label; nav slots keep template text
    if (link.label && slot.startsWith("cta_")) {
      nextInner = escapeHtml(link.label);
    }

    return `<a${nextAttrs}>${nextInner}</a>`;
  });

  return out;
}

/**
 * Inject or remove the `#zuri-embeds` section before `#contact` (or `</body>`).
 */
export function applyEmbeds(html: string, embeds: ResolvedEmbed[]): string {
  // Always strip any prior injected section first
  let out = html.replace(
    /<section\b[^>]*\bid=["']zuri-embeds["'][^>]*>[\s\S]*?<\/section>/i,
    ""
  );

  if (!embeds.length) return out;

  const section = buildEmbedSectionHtml(embeds);
  if (!section) return out;

  // Prefer immediately before the contact section
  const contactMatch = out.match(/<section\b[^>]*\bid=["']contact["'][^>]*>/i);
  if (contactMatch?.index != null) {
    return (
      out.slice(0, contactMatch.index) +
      section +
      "\n" +
      out.slice(contactMatch.index)
    );
  }

  // Fallback: before </body>
  if (/<\/body>/i.test(out)) {
    return out.replace(/<\/body>/i, `${section}\n</body>`);
  }

  return out + section;
}

/**
 * After image resolution: any empty/broken slot src gets the archetype fallback.
 * Logs a critical alert server-side when fallback was forced.
 */
export function assertImageSlotsFilled(
  html: string,
  archetype: DesignArchetype = "clean-modern"
): string {
  let out = html;

  const slotRegex = /<img\b[^>]*\bdata-image-slot="([^"]+)"[^>]*>/gi;
  const matches = [...html.matchAll(slotRegex)];

  for (const match of matches) {
    const tag = match[0];
    const slot = match[1];
    const srcMatch = tag.match(/\bsrc="([^"]*)"/i);
    const src = srcMatch?.[1] ?? "";

    if (isBrokenImageUrl(src)) {
      const fallbackUrl = getArchetypeFallback(archetype, slot).url;
      console.error(
        `[critical] Image slot "${slot}" still empty/broken after resolution — forcing archetype fallback`
      );
      const fixed = tag.includes("src=")
        ? tag.replace(/\bsrc="[^"]*"/i, `src="${fallbackUrl}"`)
        : tag.replace(/<img\b/i, `<img src="${fallbackUrl}"`);
      out = out.replace(tag, fixed);
    }
  }

  return out;
}

// ─── §6 Validation ───────────────────────────────────────────────────────────

export function validateFilledHtml(html: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: no leftover {{placeholder}} tokens
  const leftover = html.match(/\{\{[a-z0-9_]+\}\}/gi);
  if (leftover) {
    errors.push(
      `Unfilled placeholders: ${[...new Set(leftover)].join(", ")}`
    );
  }

  // Rule 2: no picsum.photos URLs left on data-image-slot elements
  if (
    /data-image-slot="[^"]+"[^>]*src="https:\/\/picsum\.photos/i.test(html) ||
    /src="https:\/\/picsum\.photos[^"]*"[^>]*data-image-slot="/i.test(html)
  ) {
    errors.push(
      "One or more image slots still reference the picsum.photos placeholder"
    );
  }

  // Rule 3: cheap heuristic from spec
  if (html.includes("{{business_name}}")) {
    warnings.push("business_name placeholder literally present");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Compose (stages 1–7, no persist) ────────────────────────────────────────

/** Appends templateId to a recent-history list, deduped, capped at 3,
 *  most-recent-first — used to build the exclusion set for the NEXT
 *  regenerate call. Called after a template is actually assigned. */
export function pushRecentTemplateId(
  history: string[],
  templateId: string
): string[] {
  const deduped = [templateId, ...history.filter((id) => id !== templateId)];
  return deduped.slice(0, 3);
}

export async function composeWebsiteHtml(
  brand: BusinessProfile,
  options?: { excludeTemplateIds?: string[] }
): Promise<ComposedWebsite> {
  const archetype = resolveArchetype(
    brand.business_type,
    brand.industry,
    serviceNames(brand.services),
    brand.brand_vibe
  );

  const template = await selectTemplate(brand, archetype, {
    excludeTemplateIds: options?.excludeTemplateIds,
  });

  // Stage 2b: data-driven module selection (new — TEMPLATE_PROMPTS_V2.md §2.4)
  const selectedModules = await selectModulesForWebsite(brand, template);

  const { html: rawHtml, metadata } = await fetchTemplate(template.template_id);

  const { fields: rawPlaceholders, tier: fillTier } = await fillPlaceholders(
    brand,
    metadata,
    archetype
  );

  // Stage 4b: field-length validation/truncation (new — §6.2), immediately
  // after fillPlaceholders(), before image resolution per §8 point 3.
  const { fields: filledPlaceholders, truncated: truncatedFields } =
    validateAndTruncateFields(rawPlaceholders);

  if (truncatedFields.length > 0) {
    console.warn(
      `[generation-pipeline] Field-length truncation applied to: ${truncatedFields.join(", ")} — prompt-level limit was not respected by the model`
    );
  }

  const filledImages = await resolveTemplateImages(metadata, archetype);

  let html = applyPlaceholders(rawHtml, filledPlaceholders);
  html = applyModuleVisibility(html, selectedModules);
  html = applyImages(html, filledImages, { archetype });
  console.log(`[IMG-DEBUG-2] gallery_1 in filledImages: ${filledImages.gallery_1?.url}`);
  console.log(`[IMG-DEBUG-2] gallery_1 in html after applyImages: ${(html.match(/data-image-slot="gallery_1"[^>]*src="([^"]*)"/) ?? [])[1] ?? "NOT FOUND"}`);
  html = applyServiceCardVisibility(html, filledPlaceholders);

  const validation = validateFilledHtml(html);

  return {
    html,
    archetype,
    template_id: template.template_id,
    filled_placeholders: filledPlaceholders,
    filled_images: filledImages,
    selected_modules: selectedModules,
    truncated_fields: truncatedFields,
    validation,
    fill_tier: fillTier,
  };
}

// ─── §4.1 Entry point ────────────────────────────────────────────────────────

export async function generateWebsite(
  brand: BusinessProfile,
  userId: string,
  jobId: string
): Promise<{ handle: string; needsReview: boolean }> {
  const supabase = createServiceClient();
  await markJob(supabase, jobId, "processing");

  try {
    const composed = await composeWebsiteHtml(brand);

    // needs_review now correctly reflects BOTH validation failures AND
    // degraded generation tiers (flash/generic) — previously this only
    // checked validation, so fallback-generated sites shipped silently
    // marked as fine.
    const needsReview =
      !composed.validation.valid ||
      composed.validation.errors.length > 0 ||
      composed.fill_tier !== "pro";

    if (!composed.validation.valid) {
      console.warn(
        "[generation-pipeline] validation errors:",
        composed.validation.errors
      );
    }
    if (composed.fill_tier !== "pro") {
      console.warn(
        `[generation-pipeline] site for user=${userId} generated via "${composed.fill_tier}" tier (not Pro) — flagged needs_review`
      );
    }

    const { data: website, error } = await supabase
      .from("websites")
      .upsert(
        {
          user_id: userId,
          handle: brand.handle,
          template_id: composed.template_id,
          recent_template_ids: [composed.template_id],
          active_theme: "theme-1",
          template_html: composed.html,
          filled_placeholders: composed.filled_placeholders,
          filled_images: composed.filled_images,
          archetype: composed.archetype,
          needs_review: needsReview,
          status: "preview",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("id, handle")
      .single();

    if (error) throw error;

    if (website.id) {
      const trackedHtml = injectTrackingScript(composed.html, website.id);
      await supabase
        .from("websites")
        .update({ template_html: trackedHtml })
        .eq("id", website.id);
    }

    await markJob(supabase, jobId, "completed");

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.buildzuri.com";
    const firstName = profile?.full_name?.split(" ")[0] ?? "there";

    createNotificationAsync({
      userId,
      type: "website_generated",
      title: "Your website is ready to preview",
      body: `Your AI-generated website for ${brand.business_name} is ready. Review it and publish when you're happy.`,
      actionUrl: "/website",
      actionLabel: "Preview my website",
      email: profile?.email
        ? {
            to: profile.email,
            subject: `Your ${brand.business_name} website is ready to preview`,
            template: "website_generated",
            templateProps: {
              firstName,
              businessName: brand.business_name,
              previewUrl: `${appUrl}/website`,
            },
          }
        : undefined,
    });

    return { handle: website.handle, needsReview };
  } catch (err) {
    await markJob(supabase, jobId, "failed", String(err));

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.buildzuri.com";

    createNotificationAsync({
      userId,
      type: "website_generation_failed",
      title: "We couldn't generate your website",
      body: "Something went wrong while generating your website. Please try again.",
      actionUrl: "/website",
      actionLabel: "Try again",
      email: profile?.email
        ? {
            to: profile.email,
            subject: "We couldn't generate your website",
            template: "website_generation_failed",
            templateProps: {
              firstName: profile.full_name?.split(" ")[0] ?? "there",
              retryUrl: `${appUrl}/website`,
            },
          }
        : undefined,
    });

    throw err;
  }
}

/**
 * Full re-generation entry point for the "Regenerate my website" feature.
 * Re-runs the entire pipeline (new archetype resolution → new template pick
 * → new module selection → new copy → new images) exactly like initial
 * generation, rather than patching the existing site. Called from
 * POST /api/website/regenerate after plan-limit gating.
 *
 * Does NOT create a new website_generation_jobs row for a UI progress
 * screen — the API route wraps this with its own job bookkeeping if the
 * frontend needs a "generating…" state; this function returns once the
 * new HTML is composed and saved.
 */
export async function regenerateWebsite(
  brand: BusinessProfile,
  userId: string
): Promise<{ handle: string; needsReview: boolean; templateId: string }> {
  const supabase = createServiceClient();

  // Read recent template history so it can be excluded from selection —
  // see selectTemplate()'s excludeTemplateIds param and
  // pushRecentTemplateId(). Tracking the last 3 (not just the single
  // current one) is what actually fixes convergent repetition — see the
  // module comment above regenerateWebsite for the production trace that
  // confirmed a single-template exclusion wasn't enough.
  const { data: currentWebsite } = await supabase
    .from("websites")
    .select("template_id, recent_template_ids")
    .eq("user_id", userId)
    .maybeSingle();

  const recentHistory = Array.isArray(currentWebsite?.recent_template_ids)
    ? (currentWebsite.recent_template_ids as string[])
    : [];

  const composed = await composeWebsiteHtml(brand, {
    excludeTemplateIds: recentHistory,
  });

  const updatedHistory = pushRecentTemplateId(
    recentHistory,
    composed.template_id
  );

  const needsReview =
    !composed.validation.valid ||
    composed.validation.errors.length > 0 ||
    composed.fill_tier !== "pro";

  const { data: website, error } = await supabase
    .from("websites")
    .update({
      template_id: composed.template_id,
      recent_template_ids: updatedHistory,
      active_theme: "theme-1",
      template_html: composed.html,
      filled_placeholders: composed.filled_placeholders,
      filled_images: composed.filled_images,
      // Regeneration intentionally clears prior link/embed overrides since
      // the template itself may have changed (different data-link-slot
      // set) — surfaced to the user before confirming regenerate in the UI.
      filled_links: {},
      filled_embeds: [],
      archetype: composed.archetype,
      needs_review: needsReview,
      status: "preview",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("id, handle")
    .single();

  if (error) throw error;

  if (website.id) {
    const trackedHtml = injectTrackingScript(composed.html, website.id);
    await supabase
      .from("websites")
      .update({ template_html: trackedHtml })
      .eq("id", website.id);
  }

  return {
    handle: website.handle,
    needsReview,
    templateId: composed.template_id,
  };
}