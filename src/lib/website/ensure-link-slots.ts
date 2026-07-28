import {
  normalizeFilledEmbeds,
  normalizeFilledImages,
  normalizeFilledLinks,
  persistRecomposedWebsite,
} from "@/lib/website/recompose-html";
import { discoverLinkSlots } from "@/lib/website/link-slots";
import { fetchTemplate } from "@/lib/website/template-registry";
import { captureError } from "@/lib/monitoring/sentry";
import type {
  ActiveTheme,
  DesignArchetype,
  ResolvedEmbed,
  ResolvedImage,
  ResolvedLink,
} from "@/types/website";
import type { SupabaseClient } from "@supabase/supabase-js";

export type { LinkSlotsHealReason } from "@/lib/website/link-slots";
import type { LinkSlotsHealReason } from "@/lib/website/link-slots";

export interface EnsureLinkSlotsInput {
  id: string;
  user_id: string;
  template_id: string | null;
  template_html: string | null;
  filled_placeholders: unknown;
  filled_images: unknown;
  filled_links: unknown;
  filled_embeds: unknown;
  active_theme: unknown;
  archetype: unknown;
}

export interface EnsureLinkSlotsResult {
  templateHtml: string;
  linkSlots: string[];
  recomposed: boolean;
  /** True when we needed slots but could not heal (Storage/DB/recompose). */
  healFailed: boolean;
  healReason: LinkSlotsHealReason;
}

/**
 * If stored template_html has no data-link-slot but the raw Storage template
 * does, recompose once so Links panel / preview clicks work without a full
 * site regenerate.
 */
export async function ensureLinkSlotsInWebsite(
  supabase: SupabaseClient,
  website: EnsureLinkSlotsInput
): Promise<EnsureLinkSlotsResult> {
  const currentHtml = website.template_html ?? "";
  const existingSlots = discoverLinkSlots(currentHtml);
  const filledLinks = normalizeFilledLinks(website.filled_links);
  const linkSlots = Array.from(
    new Set([...existingSlots, ...Object.keys(filledLinks)])
  );

  if (linkSlots.length > 0) {
    return {
      templateHtml: currentHtml,
      linkSlots,
      recomposed: false,
      healFailed: false,
      healReason: "already_present",
    };
  }

  if (!website.template_id) {
    return {
      templateHtml: currentHtml,
      linkSlots,
      recomposed: false,
      healFailed: true,
      healReason: "no_template_id",
    };
  }

  let rawHtml: string;
  try {
    const fetched = await fetchTemplate(website.template_id);
    rawHtml = fetched.html;
  } catch (err) {
    captureError(err, {
      route: "ensureLinkSlots.fetchTemplate",
      userId: website.user_id,
      extra: { templateId: website.template_id },
    });
    console.warn(
      "[ensureLinkSlots] fetchTemplate failed:",
      err instanceof Error ? err.message : err
    );
    return {
      templateHtml: currentHtml,
      linkSlots,
      recomposed: false,
      healFailed: true,
      healReason: "fetch_failed",
    };
  }

  const rawSlots = discoverLinkSlots(rawHtml);
  if (rawSlots.length === 0) {
    console.warn(
      "[ensureLinkSlots] Storage template has no data-link-slot:",
      website.template_id
    );
    return {
      templateHtml: currentHtml,
      linkSlots,
      recomposed: false,
      healFailed: true,
      healReason: "storage_missing_slots",
    };
  }

  const filledPlaceholders =
    (website.filled_placeholders as Record<string, string>) ?? {};
  const filledImages: Record<string, ResolvedImage> = normalizeFilledImages(
    website.filled_images
  );
  const filledEmbeds: ResolvedEmbed[] = normalizeFilledEmbeds(
    website.filled_embeds
  );
  const links: Record<string, ResolvedLink> = filledLinks;
  const activeTheme = (website.active_theme as ActiveTheme) ?? "theme-1";
  const archetype =
    (website.archetype as DesignArchetype) ?? "clean-modern";

  try {
    const result = await persistRecomposedWebsite(
      supabase,
      website.id,
      website.user_id,
      {
        templateId: website.template_id,
        filledPlaceholders,
        filledImages,
        filledLinks: links,
        filledEmbeds,
        activeTheme,
        archetype,
      }
    );

    const nextSlots = Array.from(
      new Set([
        ...discoverLinkSlots(result.html),
        ...Object.keys(links),
      ])
    );

    return {
      templateHtml: result.html,
      linkSlots: nextSlots,
      recomposed: true,
      healFailed: nextSlots.length === 0,
      healReason: nextSlots.length === 0 ? "recompose_failed" : "ok",
    };
  } catch (err) {
    captureError(err, {
      route: "ensureLinkSlots.recompose",
      userId: website.user_id,
      extra: { templateId: website.template_id, websiteId: website.id },
    });
    console.warn(
      "[ensureLinkSlots] recompose failed:",
      err instanceof Error ? err.message : err
    );
    return {
      templateHtml: currentHtml,
      linkSlots,
      recomposed: false,
      healFailed: true,
      healReason: "recompose_failed",
    };
  }
}
