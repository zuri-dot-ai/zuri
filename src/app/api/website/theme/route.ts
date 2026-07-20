import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeFilledImages,
  persistRecomposedWebsite,
} from "@/lib/website/recompose-html";
import type { ActiveTheme } from "@/types/website";

const VALID_THEMES = new Set<ActiveTheme>(["theme-1", "theme-2", "theme-3"]);

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { theme?: string };
  const theme = body.theme as ActiveTheme;

  if (!theme || !VALID_THEMES.has(theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  const { data: website } = await supabase
    .from("websites")
    .select(
      "id, template_id, archetype, filled_placeholders, filled_images, active_theme"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!website?.template_id) {
    return NextResponse.json({ error: "No website found" }, { status: 404 });
  }

  const placeholders =
    (website.filled_placeholders as Record<string, string>) ?? {};
  const images = normalizeFilledImages(website.filled_images);
  const archetype =
    (website.archetype as import("@/types/website").DesignArchetype) ??
    "clean-modern";

  try {
    const result = await persistRecomposedWebsite(
      supabase,
      website.id,
      user.id,
      {
        templateId: website.template_id,
        filledPlaceholders: placeholders,
        filledImages: images,
        activeTheme: theme,
        archetype,
      }
    );

    return NextResponse.json({
      success: true,
      theme,
      needsReview: result.needsReview,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Theme update failed" },
      { status: 500 }
    );
  }
}
