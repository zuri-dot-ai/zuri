import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { geminiJSON, FLASH } from "@/lib/gemini";
import { CONTENT_DRAFT_SYSTEM, contentDraftPrompt } from "@/lib/prompts";
import { canvaDeepLink } from "@/lib/canva";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import { isRateLimitError, RATE_LIMIT_MESSAGE } from "@/lib/errors/gemini-errors";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import type { ContentDraft } from "@/types/brand";
import type { Platform, PostType } from "@/types/database";

export async function POST(request: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  const rateLimit = await checkRateLimit(supabase, user.id, "generation:content");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const body = (await request.json()) as {
    platform: Platform;
    postType?: PostType;
    theme?: string;
    topic?: string;
    dayNumber?: number;
    slotId?: string;
  };

  const { platform, slotId } = body;
  const theme = body.theme ?? body.topic ?? "";
  const postType = body.postType ?? "educational";
  const dayNumber = body.dayNumber ?? 1;

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 400 });

  const { getActivePlanId, isGrowthPlus } = await import("@/lib/payments/get-plan");
  const planId = await getActivePlanId(supabase, user.id);
  const includeVideo = isGrowthPlus(planId);

  try {
    const draft = await geminiJSON<ContentDraft>(
      contentDraftPrompt({
        profile,
        platform,
        postType,
        theme,
        dayNumber,
        includeVideo,
      }),
      { model: FLASH, system: CONTENT_DRAFT_SYSTEM, temperature: 0.85 }
    );

    const canva_url = canvaDeepLink(draft.canva_search_term);

    if (slotId) {
      const { data: generated, error: genErr } = await supabase
        .from("generated_content")
        .insert({
          user_id: user.id,
          calendar_slot_id: slotId,
          platform,
          format_type: "static_image",
          caption: draft.caption,
          hashtags: draft.hashtags ?? [],
          image_url: null,
          status: "ready",
        })
        .select("id")
        .single();

      if (!genErr && generated) {
        await supabase
          .from("content_calendar")
          .update({
            status: "generated",
            content_id: generated.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", slotId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("content_calendar")
          .update({
            status: "generated",
            updated_at: new Date().toISOString(),
          })
          .eq("id", slotId)
          .eq("user_id", user.id);
      }
    }

    return NextResponse.json({ draft, canva_url });
  } catch (err) {
    if (isRateLimitError(err)) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId: user.id,
      route: "/api/ai/generate-content",
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
