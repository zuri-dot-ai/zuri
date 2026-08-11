// src/app/api/website/regenerate/route.ts
//
// Full website regeneration — was entirely missing from the app (confirmed
// by audit: only per-field placeholder regeneration existed via
// PATCH /api/website/placeholder with action:"regenerate"; there was no
// way for a user to regenerate the whole site with a fresh template pick).
//
// Re-runs the entire generation pipeline (new archetype resolution → new
// template → new module selection → new copy → new images), matching the
// "full re-run" semantics of composeWebsiteHtml(), gated by the
// website_regenerations monthly usage limit (pro=2, growth=4, premium=7,
// free=0 — see src/lib/payments/plans.ts).
//
// Free-tier users see the Regenerate button as visible-but-locked in the
// UI (upsell prompt) — this route still enforces the same 403 server-side
// as the belt-and-braces check, since UI state can't be trusted alone.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkUsageLimit } from "@/lib/payments/feature-gate";
import { getActivePlanId, planDisplayName } from "@/lib/payments/get-plan";
import { regenerateWebsite } from "@/lib/website/generation-pipeline";
import { createNotificationAsync } from "@/lib/notifications/create-notification";
import type { BusinessProfile } from "@/types/brand";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Plan gate ──────────────────────────────────────────────────────────
  const gate = await checkUsageLimit(supabase, user.id, "website_regenerations");
  if (!gate.allowed) {
    const planId = await getActivePlanId(supabase, user.id);
    return NextResponse.json(
      {
        error:
          gate.limit === 0
            ? `Regenerating your website requires a paid plan. Upgrade to Pro or higher.`
            : `You've used all ${gate.limit} of your regenerations this month on the ${planDisplayName(
                planId
              )} plan.`,
        upgradeRequired: gate.limit === 0 ? "pro" : undefined,
        used: gate.used,
        limit: gate.limit,
      },
      { status: 403 }
    );
  }

  // ── Load business profile ────────────────────────────────────────────
  const { data: brand, error: brandError } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (brandError || !brand) {
    return NextResponse.json(
      { error: "No business profile found. Complete onboarding first." },
      { status: 404 }
    );
  }

  // ── Confirm a website already exists (regenerate, not first generation) ─
  const { data: existingWebsite } = await supabase
    .from("websites")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingWebsite) {
    return NextResponse.json(
      {
        error:
          "No website found to regenerate. Generate your website first from onboarding.",
      },
      { status: 404 }
    );
  }

  // ── Run full pipeline (uses service client internally for the actual
  //    save, same as generateWebsite() — matches existing pipeline pattern) ─
  try {
    const result = await regenerateWebsite(brand as BusinessProfile, user.id);

    // Consume one regeneration credit only on success — a failed
    // regeneration shouldn't cost the user their monthly allotment.
    const serviceClient = createServiceClient();
    await serviceClient.rpc("increment_usage", {
      p_user_id: user.id,
      p_metric: "website_regenerations",
    });

    createNotificationAsync({
      userId: user.id,
      type: "website_generated",
      title: "Your website has been regenerated",
      body: `A fresh version of your website for ${brand.business_name} is ready to preview.`,
      actionUrl: "/website",
      actionLabel: "Preview my website",
    });

    return NextResponse.json({
      success: true,
      handle: result.handle,
      needsReview: result.needsReview,
      templateId: result.templateId,
      remaining:
        gate.limit === null ? null : Math.max(0, gate.limit - (gate.used + 1)),
    });
  } catch (err) {
    console.error("[api/website/regenerate] Failed:", err);
    return NextResponse.json(
      { error: "Regeneration failed. Please try again." },
      { status: 500 }
    );
  }
}

/** Lightweight GET for the frontend to check remaining regenerations before
 *  rendering the button state (used/limit), without triggering a regenerate. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await checkUsageLimit(supabase, user.id, "website_regenerations");
  const planId = await getActivePlanId(supabase, user.id);

  return NextResponse.json({
    allowed: gate.allowed,
    used: gate.used,
    limit: gate.limit,
    remaining: gate.remaining,
    planId,
  });
}
