// POST /api/ai/generate-website
// docs/02_WEBSITE_BUILDER.md §4, §13
// Auth: x-internal-secret (server-to-server) OR valid user session.
// Generation is allowed on all plans (Free = preview; Pro+ can publish).

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";
import { generateWebsite } from "@/lib/website/generation-pipeline";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import { classifySupabaseError } from "@/lib/errors/supabase-errors";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import type { BusinessProfile } from "@/types/brand";

export const maxDuration = 120;

function isInternalRequest(req: Request): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  return req.headers.get("x-internal-secret") === secret;
}

function mapBrand(
  row: Record<string, unknown>,
  handle: string
): BusinessProfile {
  const services = Array.isArray(row.services)
    ? row.services.filter((s): s is string => typeof s === "string")
    : [];
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
  };
}

export async function POST(req: Request) {
  const internal = isInternalRequest(req);

  let body: { userId?: string; jobId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let userId: string | undefined = body.userId;
  let jobId: string | undefined = body.jobId;
  let authUserId: string | undefined;

  if (!internal) {
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;
    userId = user.id;
    authUserId = user.id;
  }

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  if (!internal) {
    const rateLimit = await checkRateLimit(service, userId, "generation:website");
    if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);
  }

  // Ensure a generation job row exists
  if (!jobId) {
    const { data: job, error: jobErr } = await service
      .from("website_generation_jobs")
      .insert({ user_id: userId, status: "queued" })
      .select("id")
      .single();
    if (jobErr || !job) {
      const { status, message } = classifySupabaseError(jobErr);
      return NextResponse.json({ error: message }, { status });
    }
    jobId = job.id;
  } else {
    const { data: existing } = await service
      .from("website_generation_jobs")
      .select("id, user_id")
      .eq("id", jobId)
      .maybeSingle();
    if (!existing || existing.user_id !== userId) {
      return NextResponse.json(
        { error: "Generation job not found" },
        { status: 404 }
      );
    }
  }

  const [{ data: biz }, { data: profile }] = await Promise.all([
    service
      .from("business_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    service.from("profiles").select("handle").eq("id", userId).maybeSingle(),
  ]);

  if (!biz) {
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
    const result = await generateWebsite(brand, userId, jobId!);
    return NextResponse.json({
      success: true,
      handle: result.handle,
      needsReview: result.needsReview,
      jobId,
    });
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId: authUserId ?? userId,
      route: "/api/ai/generate-website",
    });
    const isTimeout =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("timeout"));
    if (isTimeout) {
      return NextResponse.json(
        { error: "The request timed out. Please try again.", jobId },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: ERROR_MESSAGES.WEBSITE_GENERATION_FAILED, support_ref: ref, jobId },
      { status: 500 }
    );
  }
}
