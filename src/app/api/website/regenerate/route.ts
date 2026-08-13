// src/app/api/website/regenerate/route.ts
//
// CORRECTED (2026-08, second pass): the previous version fired an
// UNAWAITED fetch() to a second route (/regenerate/run) to do the real
// work, intending to mimic complete-session.ts's fire-and-forget pattern.
// That pattern actually relies on the CALLING function itself (the
// onboarding completion route) already being done with its own response
// lifecycle in a context where Vercel tolerates the dangling promise long
// enough in practice — but there is no hard guarantee of that, and in our
// case here it visibly failed: the job sat at "queued" for 2+ minutes,
// meaning the second fetch() was almost certainly killed by Vercel before
// it completed (or even fully sent), the moment this route's own response
// went out.
//
// FIX: use Next.js 15.1's stable `after()` API (next/server), which exists
// specifically to extend a serverless invocation's lifetime past the
// response for exactly this case — no second HTTP hop, no dangling
// unawaited fetch. The actual regenerateWebsite() call now runs inside
// this same route via after(), guaranteed to keep running until it
// settles (bounded by this route's own maxDuration).
//
// maxDuration is set to 60 (Vercel Hobby's real ceiling for Node.js
// functions — anything higher is silently clamped on Hobby regardless of
// what's declared). If the pipeline genuinely needs longer than 60s in
// practice, that's a Vercel plan upgrade question (Pro allows up to 300s+),
// not something fixable in code alone.

import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkUsageLimit } from "@/lib/payments/feature-gate";
import { getActivePlanId, planDisplayName } from "@/lib/payments/get-plan";
import { regenerateWebsite } from "@/lib/website/generation-pipeline";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import type { BusinessProfile } from "@/types/brand";
import { normalizeServices } from "@/types/brand";

export const maxDuration = 60;

function mapBrand(
  row: Record<string, unknown>,
  handle: string,
  firstName: string | null
): BusinessProfile {
  const services = normalizeServices(row.services);
  const platforms = Array.isArray(row.platforms)
    ? row.platforms.filter((s): s is string => typeof s === "string")
    : [];

  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    handle,
    business_name: String(row.business_name ?? "Business"),
    industry: String(row.industry ?? row.business_type ?? ""),
    business_type: String(row.business_type ?? ""),
    services,
    target_audience: String(row.target_audience ?? ""),
    location: String(row.location ?? "Nigeria"),
    location_city:
      row.location_city == null ? null : String(row.location_city),
    brand_tone: String(row.brand_tone ?? row.tone ?? "professional"),
    unique_value: String(row.unique_value ?? ""),
    tagline: String(row.tagline ?? ""),
    brand_vibe: String(row.brand_vibe ?? "clean-modern"),
    color_primary: String(row.color_primary ?? row.primary_color ?? "#0C0C0E"),
    color_accent: String(row.color_accent ?? "#C9A84C"),
    platforms,
    pitch_line: row.pitch_line == null ? null : String(row.pitch_line),
    primary_goal: row.primary_goal == null ? null : String(row.primary_goal),
    tone_sample_choice:
      row.tone_sample_choice == null ? null : String(row.tone_sample_choice),
    social_handle:
      row.social_handle == null ? null : String(row.social_handle),
    logo_url: row.logo_url == null ? null : String(row.logo_url),
    reference_url:
      row.reference_url == null ? null : String(row.reference_url),
    first_name: firstName,
  };
}

async function markJob(
  service: ReturnType<typeof createServiceClient>,
  jobId: string,
  status: "processing" | "completed" | "failed",
  errorMessage?: string
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "failed") {
    patch.error_message = errorMessage ?? "Unknown error";
    const { data: row } = await service
      .from("website_generation_jobs")
      .select("retry_count")
      .eq("id", jobId)
      .maybeSingle();
    patch.retry_count = (row?.retry_count ?? 0) + 1;
  }
  if (status === "processing" || status === "completed") {
    patch.error_message = null;
  }

  const { error } = await service
    .from("website_generation_jobs")
    .update(patch)
    .eq("id", jobId);

  if (error) {
    console.error(`[regenerate] markJob(${status}) failed:`, error.message);
  }
}

/**
 * The actual regeneration work, run via after() so it survives past this
 * route's response but is still bounded by maxDuration above.
 */
async function runRegeneration(userId: string, jobId: string): Promise<void> {
  const service = createServiceClient();
  await markJob(service, jobId, "processing");

  const [{ data: biz }, { data: profile }] = await Promise.all([
    service
      .from("business_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    service.from("profiles").select("handle, full_name").eq("id", userId).maybeSingle(),
  ]);

  if (!biz) {
    await markJob(service, jobId, "failed", "Business profile not found");
    return;
  }

  const handle =
    (typeof profile?.handle === "string" && profile.handle.trim()) ||
    String(biz.business_name ?? "site")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) ||
    "site";

  const firstName =
    typeof profile?.full_name === "string" && profile.full_name.trim()
      ? profile.full_name.trim()
      : null;

  const brand = mapBrand(biz as Record<string, unknown>, handle, firstName);

  try {
    await regenerateWebsite(brand, userId);

    // Consume one regeneration credit only on success.
    await service.rpc("increment_usage", {
      p_user_id: userId,
      p_metric: "website_regenerations",
    });

    await markJob(service, jobId, "completed");
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId,
      route: "/api/website/regenerate (after)",
    });
    const message = err instanceof Error ? err.message : String(err);
    await markJob(service, jobId, "failed", message);
  }
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Plan gate ──
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

  // ── Confirm a website already exists ──
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

  // ── Prevent double-submission ──
  const service = createServiceClient();
  const { data: activeJob } = await service
    .from("website_generation_jobs")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeJob) {
    return NextResponse.json({
      success: true,
      jobId: activeJob.id,
      alreadyInProgress: true,
    });
  }

  // ── Create the job row ──
  const { data: job, error: jobErr } = await service
    .from("website_generation_jobs")
    .insert({ user_id: user.id, status: "queued" })
    .select("id")
    .single();

  if (jobErr || !job) {
    return NextResponse.json(
      { error: "Could not start regeneration. Please try again." },
      { status: 500 }
    );
  }

  // ── Schedule the real work via after() — this is what keeps the
  //    invocation alive past the response below, unlike a bare unawaited
  //    fetch()/promise, which Vercel is free to kill immediately. ──
  after(() => runRegeneration(user.id, job.id));

  return NextResponse.json({ success: true, jobId: job.id });
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