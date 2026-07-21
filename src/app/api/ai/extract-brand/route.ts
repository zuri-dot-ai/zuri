import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiJSON, PRO } from "@/lib/gemini";
import { BRAND_EXTRACTION_SYSTEM, brandExtractionPrompt } from "@/lib/prompts";
import type { ExtractedBrand } from "@/types/brand";
import type { OnboardingMethod } from "@/types/database";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    if (error) throw error;

    return NextResponse.json({ profile, extracted: brand });
  } catch (err) {
    console.error("[extract-brand]", err);
    return NextResponse.json(
      { error: "Could not extract your brand. Please try again." },
      { status: 500 }
    );
  }
}