import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeFilledImages,
  persistRecomposedWebsite,
} from "@/lib/website/recompose-html";
import {
  isBrokenImageUrl,
  resolveTemplateImages,
} from "@/lib/website/generation-pipeline";
import { fetchTemplate } from "@/lib/website/template-registry";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: website } = await supabase
    .from("websites")
    .select(
      "id, template_id, archetype, template_html, filled_placeholders, filled_images, active_theme"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!website?.template_id || !website.archetype) {
    return NextResponse.json({ error: "No website found" }, { status: 404 });
  }

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

  try {
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
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
