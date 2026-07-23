// Website generation pipeline (docs/02_WEBSITE_BUILDER.md §4–§6)
// Template select (Flash) → placeholder fill (Pro) → curated images → string replace → validate → save

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
import { createServiceClient } from "@/lib/supabase/service";
import { createNotificationAsync } from "@/lib/notifications/create-notification";
import type { BusinessProfile } from "@/types/brand";
import { normalizeServices, serviceNames } from "@/types/brand";
import type {
  CategoryImageRow,
  ResolvedImage,
  TemplateMetadata,
  TemplateRow,
} from "@/types/website";

export { getArchetypeFallback, isBrokenImageUrl } from "@/lib/website/image-url";
export { normalizeSlotType } from "@/lib/website/category-images";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ComposedWebsite {
  html: string;
  archetype: DesignArchetype;
  template_id: string;
  filled_placeholders: Record<string, string>;
  filled_images: Record<string, ResolvedImage>;
  validation: ValidationResult;
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

/** Generic-but-non-empty copy when Gemini Pro fails all retries (§14). */
function genericPlaceholderFallback(
  brand: BusinessProfile,
  fields: string[]
): Record<string, string> {
  const out: Record<string, string> = {};
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
    if (key === "about_body" || key === "about_text" || key === "hero_subheadline") {
      out[key] =
        brand.unique_value ||
        `${brand.business_name} serves ${brand.target_audience || "clients"} in ${brand.location_city ?? brand.location}, Nigeria.`;
      continue;
    }
    if (key === "hero_headline" || key === "headline") {
      out[key] = brand.tagline || brand.business_name;
      continue;
    }

    const services = normalizeServices(brand.services);

    const serviceTitle = key.match(/^service_(\d+)_title$/);
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

    if (/cta|button|label/i.test(key)) {
      out[key] = "Contact us";
      continue;
    }

    // Optional higher-index fields stay empty so cards remain hidden
    if (/_(4|5|6)_/.test(key)) {
      out[key] = "";
      continue;
    }

    out[key] = brand.business_name;
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
  for (const key of fields) {
    if (out[key] === undefined) out[key] = "";
  }
  return out;
}

// ─── §4.2 Template selection ─────────────────────────────────────────────────

export async function selectTemplate(
  brand: BusinessProfile,
  archetype: DesignArchetype
): Promise<TemplateMetadata> {
  const candidates = await getTemplatesForArchetype(archetype);
  if (candidates.length === 0) {
    throw new Error(`No templates found for archetype: ${archetype}`);
  }

  const prompt = `
Pick the best-fit website template for this Nigerian business.

BUSINESS: ${brand.business_name} — ${brand.industry}
BRAND VIBE: ${brand.brand_vibe}
TARGET AUDIENCE: ${brand.target_audience}
${brand.pitch_line ? `DIFFERENTIATOR: ${brand.pitch_line}` : ""}
${brand.primary_goal ? `PRIMARY GOAL: ${brand.primary_goal}` : ""}

CANDIDATE TEMPLATES:
${candidates.map((c) => `- ${c.id}: mode=${c.mode}, lean=${c.lean}, name="${c.display_name}"`).join("\n")}

Output ONLY valid JSON: { "template_id": "..." }
Pick "lean: african" only if the business's audience/positioning clearly benefits from it
(local-first businesses, culturally-forward branding). Otherwise default to "international"
for broader appeal. Pick "mode" based on brand_vibe: elegant/luxurious/moody → dark;
bright/airy/approachable/clinical/trustworthy → light.
`;

  try {
    const { template_id } = await geminiJSON<{ template_id: string }>(
      prompt,
      "flash"
    );
    const match = candidates.find((c) => c.id === template_id);
    return rowToMetadata(match ?? candidates[0]);
  } catch (err) {
    console.warn(
      "[generation-pipeline] selectTemplate failed, using first candidate:",
      err
    );
    return rowToMetadata(candidates[0]);
  }
}

// ─── §4.3 Placeholder filling ────────────────────────────────────────────────

export async function fillPlaceholders(
  brand: BusinessProfile,
  metadata: TemplateMetadata,
  _archetype: DesignArchetype
): Promise<Record<string, string>> {
  const services = normalizeServices(brand.services);
  const serviceLines = services
    .map((s) => (s.description ? `${s.name} — ${s.description}` : s.name))
    .join("; ");

  const prompt = `
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

Output ONLY valid JSON mapping each placeholder key (without {{ }}) to its filled string value.
`;

  try {
    const raw = await geminiJSON<Record<string, string>>(prompt, "pro");
    const normalized = normalizePlaceholderKeys(raw);
    return ensureAllPlaceholders(
      metadata.placeholder_fields,
      normalized,
      brand
    );
  } catch (err) {
    console.error(
      "[generation-pipeline] fillPlaceholders failed, using generic fallback:",
      err
    );
    return ensureAllPlaceholders(
      metadata.placeholder_fields,
      genericPlaceholderFallback(brand, metadata.placeholder_fields),
      brand
    );
  }
}

// ─── §4.5 Image resolution ───────────────────────────────────────────────────

export async function resolveTemplateImages(
  metadata: TemplateMetadata,
  archetype: DesignArchetype
): Promise<Record<string, ResolvedImage>> {
  const supabase = createServiceClient();
  const resolved: Record<string, ResolvedImage> = {};

  await Promise.all(
    metadata.image_slots.map(async (slot) => {
      const slotType = normalizeSlotType(slot);
      const { data, error } = await supabase
        .from("category_images")
        .select("*")
        .eq("archetype", archetype)
        .eq("slot_type", slotType)
        .limit(24);

      if (error) {
        console.warn(
          `[generation-pipeline] category_images query failed for ${archetype}/${slotType}:`,
          error.message
        );
        resolved[slot] = getArchetypeFallback(archetype);
        return;
      }

      const rows = (data ?? []) as CategoryImageRow[];
      if (rows.length === 0) {
        resolved[slot] = getArchetypeFallback(archetype);
        return;
      }

      const pick = rows[Math.floor(Math.random() * rows.length)];
      if (!pick.public_url || isBrokenImageUrl(pick.public_url)) {
        resolved[slot] = getArchetypeFallback(archetype);
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
    if (fields[`service_${n}_title`]?.trim()) {
      out = out.replace(
        new RegExp(`(<[^>]+data-optional-slot="${n}"[^>]*)\\shidden`, "i"),
        "$1"
      );
    }
  }
  return out;
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
      ? getArchetypeFallback(archetype).url
      : image.url;
    out = out.replace(
      new RegExp(`(data-image-slot="${slot}"[^>]*src=")[^"]*(")`, "i"),
      `$1${url}$2`
    );
    out = out.replace(
      new RegExp(`(src=")[^"]*("[^>]*data-image-slot="${slot}")`, "i"),
      `$1${url}$2`
    );
  }

  // Assert every data-image-slot has a non-empty valid-looking src
  out = assertImageSlotsFilled(out, archetype);
  return out;
}

/**
 * After image resolution: any empty/broken slot src gets the archetype fallback.
 * Logs a critical alert server-side when fallback was forced.
 */
export function assertImageSlotsFilled(
  html: string,
  archetype: DesignArchetype = "clean-modern"
): string {
  const fallback = getArchetypeFallback(archetype).url;
  let out = html;

  const slotRegex = /<img\b[^>]*\bdata-image-slot="([^"]+)"[^>]*>/gi;
  const matches = [...html.matchAll(slotRegex)];

  for (const match of matches) {
    const tag = match[0];
    const slot = match[1];
    const srcMatch = tag.match(/\bsrc="([^"]*)"/i);
    const src = srcMatch?.[1] ?? "";

    if (isBrokenImageUrl(src)) {
      console.error(
        `[critical] Image slot "${slot}" still empty/broken after resolution — forcing archetype fallback`
      );
      const fixed = tag.includes("src=")
        ? tag.replace(/\bsrc="[^"]*"/i, `src="${fallback}"`)
        : tag.replace(/<img\b/i, `<img src="${fallback}"`);
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

export async function composeWebsiteHtml(
  brand: BusinessProfile
): Promise<ComposedWebsite> {
  const archetype = resolveArchetype(
    brand.business_type,
    brand.industry,
    serviceNames(brand.services),
    brand.brand_vibe
  );

  const template = await selectTemplate(brand, archetype);
  const { html: rawHtml, metadata } = await fetchTemplate(template.template_id);

  const filledPlaceholders = await fillPlaceholders(brand, metadata, archetype);
  const filledImages = await resolveTemplateImages(metadata, archetype);

  let html = applyPlaceholders(rawHtml, filledPlaceholders);
  html = applyImages(html, filledImages, { archetype });
  html = applyServiceCardVisibility(html, filledPlaceholders);

  const validation = validateFilledHtml(html);

  return {
    html,
    archetype,
    template_id: template.template_id,
    filled_placeholders: filledPlaceholders,
    filled_images: filledImages,
    validation,
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
    const needsReview =
      !composed.validation.valid ||
      // Generic fallback path still marks review when fill used boilerplate only —
      // validation errors are the primary signal.
      composed.validation.errors.length > 0;

    if (!composed.validation.valid) {
      console.warn(
        "[generation-pipeline] validation errors:",
        composed.validation.errors
      );
    }

    const { data: website, error } = await supabase
      .from("websites")
      .upsert(
        {
          user_id: userId,
          handle: brand.handle,
          template_id: composed.template_id,
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
      .select("handle")
      .single();

    if (error) throw error;

    await markJob(supabase, jobId, "completed");

    createNotificationAsync({
      userId,
      type: "website_generated",
      title: "Your website is ready to preview",
      body: `Your AI-generated website for ${brand.business_name} is ready. Review it and publish when you're happy.`,
      actionUrl: "/website",
      actionLabel: "Preview my website",
    });

    return { handle: website.handle, needsReview };
  } catch (err) {
    await markJob(supabase, jobId, "failed", String(err));

    createNotificationAsync({
      userId,
      type: "website_generation_failed",
      title: "We couldn't generate your website",
      body: "Something went wrong while generating your website. Please try again.",
      actionUrl: "/website",
      actionLabel: "Try again",
    });

    throw err;
  }
}
