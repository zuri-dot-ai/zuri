import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { geminiJSON, PRO } from "@/lib/gemini";
import { BRAND_EXTRACTION_SYSTEM, brandExtractionPrompt } from "@/lib/prompts";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import { classifySupabaseError } from "@/lib/errors/supabase-errors";
import { isRateLimitError, RATE_LIMIT_MESSAGE } from "@/lib/errors/gemini-errors";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import type { ExtractedBrand } from "@/types/brand";
import type { OnboardingMethod } from "@/types/database";

export async function POST(request: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  const rateLimit = await checkRateLimit(supabase, user.id, "generation:content");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const { input, method } = (await request.json()) as {
    input: string;
    method: OnboardingMethod;
  };

  if (!input?.trim()) {
    return NextResponse.json({ error: "No input provided" }, { status: 400 });
  }

  try {
    // ── GEMINI 2.5 PRO: extract structured brand profile ──
    const brand = await geminiJSON<ExtractedBrand>(
      brandExtractionPrompt(input),
      { model: PRO, system: BRAND_EXTRACTION_SYSTEM, temperature: 0.4 }
    );

    // Upsert into business_profiles (1 per user in V1)
    const { data: profile, error } = await supabase
      .from("business_profiles")
      .upsert(
        {
          user_id: user.id,
          business_name: brand.business_name,
          industry: brand.industry,
          services: brand.services,
          target_audience: brand.target_audience,
          brand_tone: brand.tone,
          unique_value: brand.unique_value,
          location: brand.location,
          tagline: brand.tagline_suggestion,
          onboarding_transcript: input,
          onboarding_method: method,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      const { status, message } = classifySupabaseError(error);
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ profile, extracted: brand });
  } catch (err) {
    if (isRateLimitError(err)) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId: user.id,
      route: "/api/ai/extract-brand",
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
      { error: ERROR_MESSAGES.SERVER_ERROR, support_ref: ref },
      { status: 500 }
    );
  }
}