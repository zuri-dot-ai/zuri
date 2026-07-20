import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeFilledImages,
  persistRecomposedWebsite,
} from "@/lib/website/recompose-html";
import { resolveTemplateImages } from "@/lib/website/generation-pipeline";
import { fetchTemplate } from "@/lib/website/template-registry";
import type { ActiveTheme, DesignArchetype } from "@/types/website";

/** Re-resolve curated/fallback images and recompose HTML (fixes broken fallback paths). */
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
      "id, template_id, archetype, filled_placeholders, filled_images, active_theme"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!website?.template_id || !website.archetype) {
    return NextResponse.json({ error: "No website found" }, { status: 404 });
  }

  const { metadata } = await fetchTemplate(website.template_id);
  const archetype = website.archetype as DesignArchetype;
  const filledImages = await resolveTemplateImages(metadata, archetype);
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
      }
    );

    return NextResponse.json({
      success: true,
      filledImages,
      needsReview: result.needsReview,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
