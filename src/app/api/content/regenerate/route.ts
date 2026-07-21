import { NextResponse } from "next/server";
import {
  mapBrandForCalendar,
  requireContentUser,
} from "@/lib/content/api-helpers";
import { generateCaption } from "@/lib/content/caption-generator";
import { getAspectRatio } from "@/lib/content/image-dimensions";
import { generateImagePrompt } from "@/lib/content/image-prompt-generator";
import { generateImageWithSafetyRetry } from "@/lib/content/imagen";
import { uploadImageToStorage } from "@/lib/content/image-storage";
import { resolveArchetype } from "@/lib/content/pillars";
import { createServiceClient } from "@/lib/supabase/service";
import { checkUsageLimit } from "@/lib/payments/feature-gate";
import type { DesignArchetype } from "@/lib/website/archetypes";
import type { GenerationInput } from "@/lib/content/types";

const VALID_FIELDS = new Set(["caption", "hashtags", "image", "all"]);

export async function POST(req: Request) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contentId = String(body.contentId ?? body.content_id ?? "");
  const regenerateField = String(
    body.regenerateField ?? body.regenerate_field ?? ""
  );

  if (!contentId) {
    return NextResponse.json(
      { error: "contentId is required" },
      { status: 400 }
    );
  }
  if (!VALID_FIELDS.has(regenerateField)) {
    return NextResponse.json(
      {
        error:
          "regenerateField must be one of: caption, hashtags, image, all",
      },
      { status: 400 }
    );
  }

  const { data: content } = await supabase
    .from("generated_content")
    .select("*")
    .eq("id", contentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  if (regenerateField === "image" || regenerateField === "all") {
    const gate = await checkUsageLimit(supabase, user.id, "images_generated");
    if (!gate.allowed) {
      return NextResponse.json(
        { error: "Image generation limit reached" },
        { status: 403 }
      );
    }
  }

  const { data: brandRow } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!brandRow) {
    return NextResponse.json(
      { error: "No brand profile found" },
      { status: 404 }
    );
  }

  const brand = mapBrandForCalendar(brandRow as Record<string, unknown>);
  const { data: website } = await supabase
    .from("websites")
    .select("archetype")
    .eq("user_id", user.id)
    .maybeSingle();

  const archetype = (website?.archetype ??
    resolveArchetype({
      business_type: brand.business_type,
      industry: brand.industry,
      services: brand.services,
      brand_vibe: brand.brand_vibe,
      business_name: brand.business_name,
    })) as DesignArchetype;

  const input: GenerationInput = {
    userId: user.id,
    calendarSlotId: content.calendar_slot_id ?? undefined,
    platform: content.platform,
    formatType: content.format_type,
    topic: content.caption?.slice(0, 120) || content.format_type,
    hook: "",
    brief: content.image_prompt_used ?? "",
    brand,
    archetype,
  };

  // Prefer calendar slot topic/hook/brief when available
  if (content.calendar_slot_id) {
    const { data: slot } = await supabase
      .from("content_calendar")
      .select("topic, hook, brief")
      .eq("id", content.calendar_slot_id)
      .maybeSingle();
    if (slot) {
      input.topic = slot.topic ?? input.topic;
      input.hook = slot.hook ?? "";
      input.brief = slot.brief ?? "";
    }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  const warnings: string[] = [];
  const service = createServiceClient();

  try {
    if (regenerateField === "image" || regenerateField === "all") {
      const imagePromptUsed = await generateImagePrompt(input);
      const aspect = getAspectRatio(input.platform, input.formatType);
      const result = await generateImageWithSafetyRetry(imagePromptUsed, aspect);
      if (result.warning) warnings.push(result.warning);
      if (result.base64) {
        const imageUrl = await uploadImageToStorage(
          service,
          user.id,
          result.base64,
          input.formatType
        );
        updates.image_url = imageUrl;
        updates.image_prompt_used = imagePromptUsed;
        await service.rpc("increment_usage", {
          p_user_id: user.id,
          p_metric: "images_generated",
          p_amount: 1,
        });
      }
    }

    if (
      regenerateField === "caption" ||
      regenerateField === "hashtags" ||
      regenerateField === "all"
    ) {
      const { caption, hashtags } = await generateCaption(
        input,
        (updates.image_url as string | undefined) ?? content.image_url ?? undefined
      );
      if (regenerateField === "hashtags") {
        updates.hashtags = hashtags;
      } else {
        updates.caption = caption;
        updates.hashtags = hashtags;
      }
    }

    if (warnings.length > 0) {
      updates.status = "partial";
    }

    const { data: updatedContent, error } = await supabase
      .from("generated_content")
      .update(updates)
      .eq("id", contentId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update content" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      content: updatedContent,
      warnings,
    });
  } catch (err) {
    console.error("Regeneration failed:", err);
    return NextResponse.json(
      { error: "Regeneration failed. Please try again." },
      { status: 500 }
    );
  }
}
