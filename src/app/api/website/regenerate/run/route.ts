// src/app/api/website/regenerate/run/route.ts
//
// Internal worker route — does the actual regenerateWebsite() call plus
// job bookkeeping. Only ever called server-to-server via the
// x-internal-secret header, fired unawaited from
// POST /api/website/regenerate. Mirrors
// src/app/api/ai/generate-website/route.ts's structure closely so the two
// generation paths (first-time vs regenerate) stay consistent and both
// benefit from the same markJob()/retry/error-handling behavior.
//
// This route is allowed to run long (up to maxDuration, itself capped by
// the Vercel plan) because nothing is waiting on its HTTP response — the
// caller in regenerate/route.ts already returned a response to the
// browser before this fires.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { regenerateWebsite } from "@/lib/website/generation-pipeline";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import type { BusinessProfile } from "@/types/brand";
import { normalizeServices } from "@/types/brand";

export const maxDuration = 60;

function isInternalRequest(req: Request): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  return req.headers.get("x-internal-secret") === secret;
}

function mapBrand(
  row: Record<string, unknown>,
  handle: string
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
    console.error(`[regenerate/run] markJob(${status}) failed:`, error.message);
  }
}

export async function POST(req: Request) {
  if (!isInternalRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { userId?: string; jobId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, jobId } = body;
  if (!userId || !jobId) {
    return NextResponse.json(
      { error: "userId and jobId are required" },
      { status: 400 }
    );
  }

  const service = createServiceClient();
  await markJob(service, jobId, "processing");

  const [{ data: biz }, { data: profile }] = await Promise.all([
    service
      .from("business_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    service.from("profiles").select("handle").eq("id", userId).maybeSingle(),
  ]);

  if (!biz) {
    await markJob(service, jobId, "failed", "Business profile not found");
    return NextResponse.json(
      { error: "Business profile not found" },
      { status: 404 }
    );
  }

  const handle =
    (typeof profile?.handle === "string" && profile.handle.trim()) ||
    String(biz.business_name ?? "site")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) ||
    "site";

  const brand = mapBrand(biz as Record<string, unknown>, handle);

  try {
    const result = await regenerateWebsite(brand, userId);

    // Consume one regeneration credit only on success — a failed
    // regeneration shouldn't cost the user their monthly allotment.
    await service.rpc("increment_usage", {
      p_user_id: userId,
      p_metric: "website_regenerations",
    });

    await markJob(service, jobId, "completed");

    return NextResponse.json({
      success: true,
      handle: result.handle,
      needsReview: result.needsReview,
      templateId: result.templateId,
    });
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId,
      route: "/api/website/regenerate/run",
    });
    const message = err instanceof Error ? err.message : String(err);
    await markJob(service, jobId, "failed", message);

    return NextResponse.json(
      { error: "Regeneration failed. Please try again.", support_ref: ref },
      { status: 500 }
    );
  }
}