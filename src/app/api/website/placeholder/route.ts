import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiJSON, FLASH } from "@/lib/gemini";
import { checkUsageLimit } from "@/lib/payments/feature-gate";
import { sanitizeText } from "@/lib/utils/sanitize";
import {
  normalizeFilledImages,
  persistRecomposedWebsite,
} from "@/lib/website/recompose-html";
import type { ActiveTheme } from "@/types/website";

const MAX_FIELD_LENGTH = 500;

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    field?: string;
    value?: string;
    action?: "edit" | "regenerate";
  };

  const field = body.field?.trim();
  if (!field) {
    return NextResponse.json({ error: "Missing field" }, { status: 400 });
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
  const activeTheme = (website.active_theme as ActiveTheme) ?? "theme-1";
  const archetype = website.archetype as import("@/types/website").DesignArchetype | undefined;

  let newValue = body.value ?? "";

  if (body.action === "regenerate") {
    const gate = await checkUsageLimit(
      supabase,
      user.id,
      "website_regenerations"
    );
    if (!gate.allowed) {
      return NextResponse.json(
        {
          error: "Regeneration limit reached this month",
          upgradeRequired: "pro",
        },
        { status: 403 }
      );
    }

    const { data: brand } = await supabase
      .from("business_profiles")
      .select("business_name, industry, brand_tone, location")
      .eq("user_id", user.id)
      .maybeSingle();

    try {
      const result = await geminiJSON<{ value: string }>(
        `Regenerate the "${field}" field for ${brand?.business_name ?? "this business"}.
Industry: ${brand?.industry ?? "general"}
Tone: ${brand?.brand_tone ?? "professional"}
Location: ${brand?.location ?? "Nigeria"}
Current value: "${placeholders[field] ?? ""}"
Return JSON: { "value": "..." }
Same tone and similar length. No placeholders or brackets.`,
        { model: FLASH, temperature: 0.7 }
      );
      newValue = result.value?.trim() ?? placeholders[field] ?? "";
    } catch {
      return NextResponse.json({ error: "Regeneration failed" }, { status: 500 });
    }
  } else {
    newValue = sanitizeText(body.value ?? "");
  }

  if (newValue.length > MAX_FIELD_LENGTH) {
    return NextResponse.json(
      { error: "This field is too long for this template." },
      { status: 400 }
    );
  }

  const updatedPlaceholders = { ...placeholders, [field]: newValue };

  try {
    const result = await persistRecomposedWebsite(
      supabase,
      website.id,
      user.id,
      {
        templateId: website.template_id,
        filledPlaceholders: updatedPlaceholders,
        filledImages: images,
        activeTheme,
        archetype: archetype ?? "clean-modern",
      }
    );

    return NextResponse.json({
      success: true,
      field,
      value: newValue,
      needsReview: result.needsReview,
      validation: result.validation,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}
