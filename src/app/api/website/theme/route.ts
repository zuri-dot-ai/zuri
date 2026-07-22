import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import {
  normalizeFilledImages,
  persistRecomposedWebsite,
} from "@/lib/website/recompose-html";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import type { ActiveTheme } from "@/types/website";

const VALID_THEMES = new Set<ActiveTheme>(["theme-1", "theme-2", "theme-3"]);

export async function PATCH(req: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  const rateLimit = await checkRateLimit(supabase, user.id, "api:general");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

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
    return NextResponse.json(
      { error: ERROR_MESSAGES.WEBSITE_NOT_FOUND },
      { status: 404 }
    );
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
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, { supportRef: ref, userId: user?.id, route: "/api/website/theme" });
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR, support_ref: ref },
      { status: 500 }
    );
  }
}
