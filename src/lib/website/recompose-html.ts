import { fetchTemplate } from "@/lib/website/template-registry";
import {
  applyEmbeds,
  applyImages,
  applyLinks,
  applyPlaceholders,
  applyServiceCardVisibility,
  validateFilledHtml,
  type ValidationResult,
} from "@/lib/website/generation-pipeline";
import {
  getArchetypeFallback,
  isBrokenImageUrl,
} from "@/lib/website/image-url";
import { normalizeFilledEmbeds } from "@/lib/website/embed-sanitize";
import { normalizeFilledLinks } from "@/lib/website/link-sanitize";
import type {
  ActiveTheme,
  DesignArchetype,
  ResolvedEmbed,
  ResolvedImage,
  ResolvedLink,
} from "@/types/website";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RecomposeInput {
  templateId: string;
  filledPlaceholders: Record<string, string>;
  filledImages: Record<string, ResolvedImage>;
  filledLinks?: Record<string, ResolvedLink>;
  filledEmbeds?: ResolvedEmbed[];
  activeTheme?: ActiveTheme;
  archetype?: DesignArchetype;
}

export interface RecomposeResult {
  html: string;
  validation: ValidationResult;
}

/** Apply active theme class on `<body>`. */
export function applyActiveTheme(html: string, theme: ActiveTheme): string {
  if (html.match(/<body[^>]*class="[^"]*theme-\d/i)) {
    return html.replace(
      /(<body[^>]*class="[^"]*)\btheme-\d\b([^"]*")/i,
      `$1${theme}$2`
    );
  }
  if (html.match(/<body[^>]*class="/i)) {
    return html.replace(
      /(<body[^>]*class=")([^"]*)(")/i,
      `$1$2 ${theme}$3`
    );
  }
  return html.replace(/<body/i, `<body class="${theme}"`);
}

export async function recomposeWebsiteHtml(
  input: RecomposeInput
): Promise<RecomposeResult> {
  const { html: rawHtml } = await fetchTemplate(input.templateId);
  const archetype = input.archetype ?? "clean-modern";

  // Sanitize any broken image URLs before apply
  const filledImages: Record<string, ResolvedImage> = {};
  for (const [slot, image] of Object.entries(input.filledImages)) {
    filledImages[slot] = isBrokenImageUrl(image.url)
      ? getArchetypeFallback(archetype)
      : image;
  }

  const filledLinks = normalizeFilledLinks(input.filledLinks ?? {});
  const filledEmbeds = normalizeFilledEmbeds(input.filledEmbeds ?? []);

  let html = applyPlaceholders(rawHtml, input.filledPlaceholders);
  html = applyImages(html, filledImages, { archetype });
  const gallery1Match = html.match(/<img\b[^>]*data-image-slot="gallery_1"[^>]*>/i);
  console.log(`[IMG-DEBUG-3] gallery_1 full tag after applyImages: ${gallery1Match ? gallery1Match[0] : "TAG NOT FOUND AT ALL"}`);  console.log(`[IMG-DEBUG-2] gallery_1 in filledImages: ${filledImages.gallery_1?.url}`);
  console.log(`[IMG-DEBUG-2] gallery_1 in html after applyImages: ${(html.match(/data-image-slot="gallery_1"[^>]*src="([^"]*)"/) ?? [])[1] ?? "NOT FOUND"}`);
  html = applyServiceCardVisibility(html, input.filledPlaceholders);
  html = applyLinks(html, filledLinks);
  html = applyEmbeds(html, filledEmbeds);

  if (input.activeTheme) {
    html = applyActiveTheme(html, input.activeTheme);
  }

  const validation = validateFilledHtml(html);
  return { html, validation };
}

export function normalizeFilledImages(
  raw: unknown
): Record<string, ResolvedImage> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, ResolvedImage> = {};
  for (const [slot, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") {
      out[slot] = { url: value, source: "user-upload" };
      continue;
    }
    if (value && typeof value === "object" && "url" in value) {
      const v = value as ResolvedImage;
      out[slot] = {
        url: String(v.url),
        source: v.source ?? "user-upload",
        width: v.width ?? null,
        height: v.height ?? null,
        alt: v.alt,
      };
    }
  }
  return out;
}

export { normalizeFilledLinks } from "@/lib/website/link-sanitize";
export { normalizeFilledEmbeds } from "@/lib/website/embed-sanitize";

export async function persistRecomposedWebsite(
  supabase: SupabaseClient,
  websiteId: string,
  userId: string,
  input: RecomposeInput
): Promise<RecomposeResult & { needsReview: boolean }> {
  const filledLinks = normalizeFilledLinks(input.filledLinks ?? {});
  const filledEmbeds = normalizeFilledEmbeds(input.filledEmbeds ?? []);
  const { html, validation } = await recomposeWebsiteHtml({
    ...input,
    filledLinks,
    filledEmbeds,
  });

  const { error } = await supabase
    .from("websites")
    .update({
      template_html: html,
      filled_placeholders: input.filledPlaceholders,
      filled_images: input.filledImages,
      filled_links: filledLinks,
      filled_embeds: filledEmbeds,
      active_theme: input.activeTheme ?? "theme-1",
      needs_review: !validation.valid,
      updated_at: new Date().toISOString(),
    })
    .eq("id", websiteId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return { html, validation, needsReview: !validation.valid };
}
