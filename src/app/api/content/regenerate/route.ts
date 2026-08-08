import { NextResponse } from "next/server";
import {
  mapBrandForCalendar,
  requireContentUser,
} from "@/lib/content/api-helpers";
import { generateCaption } from "@/lib/content/caption-generator";
import { CONTENT_IMAGES_ENABLED } from "@/lib/content/feature-flags";
import { getAspectRatio } from "@/lib/content/image-dimensions";
import { generateImagePrompt } from "@/lib/content/image-prompt-generator";
import { generateImageWithSafetyRetry } from "@/lib/content/imagen";
import { uploadImageToStorage } from "@/lib/content/image-storage";
import { resolveArchetype } from "@/lib/content/pillars";
import { createServiceClient } from "@/lib/supabase/service";
import { checkUsageLimit } from "@/lib/payments/feature-gate";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import {
  maybeNotifyUsageWarning,
  notifyUsageLimitReached,
} from "@/lib/notifications/usage-email";
import type { DesignArchetype } from "@/lib/website/archetypes";
import type { GenerationInput } from "@/lib/content/types";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import { classifySupabaseError } from "@/lib/errors/supabase-errors";
import { isRateLimitError, RATE_LIMIT_MESSAGE } from "@/lib/errors/gemini-errors";
import { ERROR_MESSAGES } from "@/lib/errors/messages";

/** Caption/image regenerate can include a full Imagen call — match generate route. */
export const maxDuration = 120;

const VALID_FIELDS = new Set(["caption", "hashtags", "image", "all"]);
const ADJUST_MODES = new Set([
  "punchier",
  "shorter",
  "more_formal",
  "more_casual",
  "custom",
]);

function adjustInstruction(
  mode: string | undefined,
  custom: string | undefined
): string | null {
  switch (mode) {
    case "punchier":
      return "Revise to be punchier and more attention-grabbing. Keep the same idea and direction — do not invent a new topic.";
    case "shorter":
      return "Make it significantly shorter while keeping the same idea and CTA direction.";
    case "more_formal":
      return "Make the tone more formal and polished. Keep the same idea.";
    case "more_casual":
      return "Make the tone more casual and conversational. Keep the same idea.";
    case "custom":
      return custom?.trim()
        ? `Apply this instruction while keeping the same core idea: ${custom.trim().slice(0, 400)}`
        : null;
    default:
      return null;
  }
}

export async function POST(req: Request) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const rateLimit = await checkRateLimit(supabase, user.id, "generation:content");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contentId = String(body.contentId ?? body.content_id ?? "");
  const regenerateField = String(
    body.regenerateField ?? body.regenerate_field ?? "caption"
  );
  const adjustMode =
    typeof body.mode === "string" && ADJUST_MODES.has(body.mode)
      ? body.mode
      : undefined;
  const customInstruction =
    typeof body.instruction === "string" ? body.instruction : undefined;
  const instruction = adjustInstruction(adjustMode, customInstruction);

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

  if (
    (regenerateField === "image" || regenerateField === "all") &&
    !CONTENT_IMAGES_ENABLED
  ) {
    return NextResponse.json(
      { error: "Image generation is temporarily unavailable." },
      { status: 403 }
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
      void notifyUsageLimitReached(
        supabase,
        user.id,
        "images_generated",
        gate.limit ?? 0
      );
      return NextResponse.json(
        { error: "Image generation limit reached" },
        { status: 403 }
      );
    }
    void maybeNotifyUsageWarning(
      supabase,
      user.id,
      "images_generated",
      gate.used,
      gate.limit
    );
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
      // Contextual adjust: revise existing copy rather than inventing a new idea
      if (instruction && content.caption) {
        const { geminiJSON } = await import("@/lib/gemini");
        const { formatContentProfileForPrompt } = await import(
          "@/lib/content/content-profile"
        );
        const profileBlock = formatContentProfileForPrompt(
          brand.content_profile
        );
        const adjusted = await geminiJSON<{
          caption: string;
          hashtags: string[];
          variants: {
            instagram: { caption: string; hashtags: string[] };
            whatsapp: { caption: string };
            x: { caption: string };
          };
        }>(
          `You are revising social copy for ${brand.business_name}.
${profileBlock}

ORIGINAL TOPIC: ${input.topic}
ORIGINAL HOOK: ${input.hook}
ORIGINAL BRIEF: ${input.brief}
ORIGINAL CAPTION:
${content.caption}

INSTRUCTION: ${instruction}

Keep the same underlying idea. Output ONLY valid JSON:
{
  "caption": "revised primary caption",
  "hashtags": ["#a","#b"],
  "variants": {
    "instagram": { "caption": "...", "hashtags": ["#a","#b","#c"] },
    "whatsapp": { "caption": "short, no hashtags" },
    "x": { "caption": "under 280 chars" }
  }
}`,
          "flash"
        );
        if (regenerateField === "hashtags") {
          updates.hashtags = adjusted.hashtags ?? content.hashtags;
        } else {
          updates.caption = adjusted.caption;
          updates.hashtags = adjusted.hashtags ?? [];
          updates.platform_variants = adjusted.variants ?? null;
        }
      } else {
        const { caption, hashtags, variants } = await generateCaption(
          input,
          (updates.image_url as string | undefined) ??
            content.image_url ??
            undefined
        );
        if (regenerateField === "hashtags") {
          updates.hashtags = hashtags;
        } else {
          updates.caption = caption;
          updates.hashtags = hashtags;
          updates.platform_variants = variants;
        }
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
      const { status, message } = classifySupabaseError(error);
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({
      success: true,
      content: updatedContent,
      warnings,
    });
  } catch (err) {
    if (isRateLimitError(err)) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId: user.id,
      route: "/api/content/regenerate",
    });
    const isTimeout =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("timeout"));
    if (isTimeout) {
      return NextResponse.json(
        { error: "The request timed out. Please try again." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: ERROR_MESSAGES.CONTENT_GENERATION_FAILED, support_ref: ref },
      { status: 500 }
    );
  }
}
