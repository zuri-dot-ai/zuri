import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import {
  normalizeFilledImages,
  persistRecomposedWebsite,
} from "@/lib/website/recompose-html";
import {
  isBrokenImageUrl,
  resolveTemplateImages,
} from "@/lib/website/generation-pipeline";
import { fetchTemplate } from "@/lib/website/template-registry";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import type {
  ActiveTheme,
  DesignArchetype,
  ResolvedImage,
} from "@/types/website";

function htmlHasBrokenSlots(html: string | null | undefined): boolean {
  if (!html) return false;
  return /picsum\.photos/i.test(html) || /\/images\/fallbacks\//i.test(html);
}

/**
 * Re-resolve curated/fallback images and recompose HTML.
 * Forces a full recompose when template_html still contains picsum or
 * filled_images has broken URLs — even if some slots look fine.
 */
export async function POST() {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  const rateLimit = await checkRateLimit(supabase, user.id, "api:general");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const { data: website } = await supabase
    .from("websites")
    .select(
      "id, template_id, archetype, template_html, filled_placeholders, filled_images, active_theme"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!website?.template_id || !website.archetype) {
    return NextResponse.json(
      { error: ERROR_MESSAGES.WEBSITE_NOT_FOUND },
      { status: 404 }
    );
  }

  try {
    const existing = normalizeFilledImages(website.filled_images);
    const htmlBroken = htmlHasBrokenSlots(website.template_html);
    const imagesBroken = Object.values(existing).some((img) =>
      isBrokenImageUrl(img.url)
    );
    const needsRepair = htmlBroken || imagesBroken;

    const { metadata } = await fetchTemplate(website.template_id);
    const archetype = website.archetype as DesignArchetype;
    const resolved = await resolveTemplateImages(metadata, archetype);

    // Keep valid user uploads; replace broken/missing slots with curated/fallback.
    // When HTML itself still has picsum, replace every slot that is broken or
    // was only a picsum/fallback source so recompose clears template_html.
    const filledImages: Record<string, ResolvedImage> = { ...resolved };
    for (const [slot, img] of Object.entries(existing)) {
      if (
        img.source === "user-upload" &&
        !isBrokenImageUrl(img.url)
      ) {
        filledImages[slot] = img;
      } else if (!needsRepair && !isBrokenImageUrl(img.url)) {
        filledImages[slot] = img;
      }
    }

    const placeholders =
      (website.filled_placeholders as Record<string, string>) ?? {};
    const activeTheme = (website.active_theme as ActiveTheme) ?? "theme-1";

    const result = await persistRecomposedWebsite(
      supabase,
      website.id,
      user.id,
      {
        templateId: website.template_id,
        filledPlaceholders: placeholders,
        filledImages,
        activeTheme,
        archetype,
      }
    );

    return NextResponse.json({
      success: true,
      filledImages,
      needsReview: result.needsReview,
      repaired: needsRepair,
    });
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, { supportRef: ref, userId: user?.id, route: "/api/website/refresh-images" });
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR, support_ref: ref },
      { status: 500 }
    );
  }
}
