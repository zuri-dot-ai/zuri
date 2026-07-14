// ZURI compose-website route — V2 pipeline
// Runs the multi-stage composition pipeline (archetype → structure → copy →
// images → critique → patches → validate) instead of a single Gemini call.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCompositionPipeline } from "@/lib/website/composition-pipeline";
import type { WebsiteComposition } from "@/types/website";
import type { WebsiteType } from "@/types/database";

// Multi-stage pipeline can take 60-90s end-to-end.
export const maxDuration = 90;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    websiteType?: WebsiteType | string;
    stylePreference?: string;
    features?: string[];
  };
  const websiteType = body.websiteType || "business";
  const stylePreference = body.stylePreference || "default";

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Complete onboarding first" }, { status: 400 });
  }

  try {
    const { composition, needsReview, patchCount, timingMs } = await runCompositionPipeline(
      profile,
      String(websiteType)
    );

    const typedComposition: WebsiteComposition = composition;
    const now = new Date().toISOString();

    const baseRow: Record<string, unknown> = {
      user_id: user.id,
      business_profile_id: profile.id,
      website_type: String(websiteType),
      style_preference: stylePreference,
      motion_style: typedComposition.motion_style,
      composition_json: typedComposition,
      is_published: false,
      last_edited: now,
    };

    const v2Row: Record<string, unknown> = {
      archetype: (typedComposition as any).archetype || null,
      generation_version: 2,
      needs_review: needsReview,
    };

    // v2 persistence — upsert keyed on user_id is idempotent
    let save = await supabase
      .from("websites")
      .upsert({ ...baseRow, ...v2Row, updated_at: now }, { onConflict: "user_id" })
      .select()
      .single();

    // Fallback for legacy deployments missing the v2 columns
    if (save.error) {
      save = await supabase
        .from("websites")
        .upsert(baseRow, { onConflict: "user_id" })
        .select()
        .single();
    }

    if (save.error || !save.data) {
      throw save.error || new Error("Website save returned no row");
    }

    // Audit (best-effort)
    try {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "website.compose",
        resource_type: "website",
        resource_id: save.data.id,
        metadata: {
          archetype: (typedComposition as any).archetype,
          needs_review: needsReview,
          sections_count: typedComposition.sections?.length ?? 0,
          patch_count: patchCount,
          pipeline_version: 2,
          timing_ms: timingMs,
        },
      });
    } catch {
      /* audit failure must never block compose */
    }

    return NextResponse.json({
      website: save.data,
      needsReview,
      archetype: (typedComposition as any).archetype,
      patchCount,
      timing: timingMs,
    });
  } catch (err) {
    console.error("[compose-website v2]", err);
    return NextResponse.json(
      {
        error: "Could not compose your website. Please try again.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
