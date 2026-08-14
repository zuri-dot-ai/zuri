// src/app/api/website/refresh-images/route.ts
//
// REBUILT (2026-08): the previous version only repaired slots whose URL
// was literally malformed (picsum, Unsplash, empty, or /images/fallbacks/
// via isBrokenImageUrl()). A slot that resolved to the archetype FALLBACK
// POOL (source: "fallback") — because category_images had zero/thin
// coverage for that archetype/slot_type AT GENERATION TIME — has a
// perfectly well-formed Cloudinary URL. isBrokenImageUrl() never flags
// it, so needsRepair was always false for these sites, and they stayed
// permanently stuck on fallback images even after real curated images
// were later added to category_images (confirmed via production trace:
// FUD Republic's 4 gallery slots all resolved to the same warm-sensory
// fallback image, and this route's imagesBroken check never caught it).
//
// FIX: now explicitly checks `source === "fallback"` as its own repair
// trigger, separate from isBrokenImageUrl(). Any slot currently on
// fallback gets re-resolved against category_images — if real coverage
// now exists, it upgrades to a real curated image; if the library is
// still thin, resolveTemplateImages() naturally returns the (now
// rotating, per the earlier image-url.ts fix) fallback pool again, so
// this is always safe to call repeatedly and never makes things worse.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import {
  normalizeFilledEmbeds,
  normalizeFilledImages,
  normalizeFilledLinks,
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
 *
 * Repair triggers, in order of severity:
 *   1. HTML still has picsum/local-fallback references (legacy breakage)
 *   2. filled_images has a literally malformed URL (isBrokenImageUrl)
 *   3. filled_images has ANY slot with source === "fallback" — this is
 *      the fix: these are valid-looking URLs that were only ever a
 *      last-resort pick, and may now have a real curated replacement
 *      available in category_images.
 *
 * A user-uploaded image (source: "user-upload") is NEVER touched by this
 * route regardless of trigger — the owner's own photo always wins.
 */
export async function POST() {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  const rateLimit = await checkRateLimit(supabase, user.id, "api:general");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select(
      "id, template_id, archetype, template_html, filled_placeholders, filled_images, filled_links, filled_embeds, active_theme"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (websiteError) {
    console.error(
      `[api/website/refresh-images] websites query failed for user=${user.id}:`,
      websiteError.message,
      websiteError.code,
      websiteError.details
    );
  }

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
    // THE FIX: fallback-sourced slots are a repair trigger even though
    // their URL is well-formed — they represent "best we had at the
    // time," not "correct," and category_images coverage changes over
    // time (via the Cloudinary seeding workflow).
    const hasFallbackSlots = Object.values(existing).some(
      (img) => img.source === "fallback"
    );
    const needsRepair = htmlBroken || imagesBroken || hasFallbackSlots;

    // Nothing to do — every slot is either a real user upload or a
    // confirmed curated image. Skip the recompose entirely to avoid an
    // unnecessary DB write and Storage fetch on every studio load.
    if (!needsRepair) {
      return NextResponse.json({
        success: true,
        filledImages: existing,
        needsReview: false,
        repaired: false,
      });
    }

    const { metadata } = await fetchTemplate(website.template_id);
    const archetype = website.archetype as DesignArchetype;
    const resolved = await resolveTemplateImages(metadata, archetype);

    // Build the final image set: start from freshly-resolved values for
    // every slot the template declares, then restore any slot that's
    // either a real user upload or an already-good curated pick —
    // meaning only genuinely fallback/broken slots actually change.
    const filledImages: Record<string, ResolvedImage> = { ...resolved };
    for (const [slot, img] of Object.entries(existing)) {
      const isGoodUserUpload =
        img.source === "user-upload" && !isBrokenImageUrl(img.url);
      const isGoodCurated =
        img.source === "curated" && !isBrokenImageUrl(img.url);

      if (isGoodUserUpload || isGoodCurated) {
        filledImages[slot] = img;
      }
      // Anything else (source === "fallback", or a broken URL of any
      // source) is intentionally left as the freshly-resolved value from
      // `resolved` above — this is the actual repair.
    }

    const placeholders =
      (website.filled_placeholders as Record<string, string>) ?? {};
    const links = normalizeFilledLinks(website.filled_links);
    const embeds = normalizeFilledEmbeds(website.filled_embeds);
    const activeTheme = (website.active_theme as ActiveTheme) ?? "theme-1";

    const result = await persistRecomposedWebsite(
      supabase,
      website.id,
      user.id,
      {
        templateId: website.template_id,
        filledPlaceholders: placeholders,
        filledImages,
        filledLinks: links,
        filledEmbeds: embeds,
        activeTheme,
        archetype,
      }
    );

    // Count how many slots actually changed, for an accurate response —
    // useful for the frontend to show "3 images upgraded" rather than a
    // generic "repaired: true".
    const upgradedSlots = Object.keys(filledImages).filter(
      (slot) => existing[slot]?.url !== filledImages[slot]?.url
    );

    return NextResponse.json({
      success: true,
      filledImages,
      needsReview: result.needsReview,
      repaired: needsRepair,
      upgradedCount: upgradedSlots.length,
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