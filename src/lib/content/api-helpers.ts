import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  checkFeatureAccess,
  checkUsageLimit,
} from "@/lib/payments/feature-gate";
import { getActivePlanId, isGrowthPlus } from "@/lib/payments/get-plan";
import { PLAN_CONFIG, type PlanId } from "@/lib/payments/plans";
import { notifyUsageLimitReached } from "@/lib/notifications/usage-email";
import { serviceNames } from "@/types/brand";
import { parseContentProfile } from "./content-profile";

export async function requireContentUser(): Promise<
  | { supabase: SupabaseClient; user: User; planId: PlanId }
  | { error: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const planId = await getActivePlanId(supabase, user.id);
  return { supabase, user, planId };
}

export async function requireProCalendar(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { error: NextResponse }> {
  const gate = await checkFeatureAccess(
    supabase,
    userId,
    "calendar_posts_per_month"
  );
  if (!gate.allowed) {
    return {
      error: NextResponse.json(
        {
          error:
            "Content calendar is available from the Pro plan. Upgrade to continue.",
          upgradeRequired: gate.upgradeRequired ?? "pro",
        },
        { status: 403 }
      ),
    };
  }
  return { ok: true };
}

export function requireGrowthPlus(
  planId: PlanId,
  featureLabel: string
): { ok: true } | { error: NextResponse } {
  if (!isGrowthPlus(planId)) {
    return {
      error: NextResponse.json(
        {
          error: `${featureLabel} is available from the Growth plan. Upgrade to continue.`,
          upgradeRequired: "growth",
        },
        { status: 403 }
      ),
    };
  }
  return { ok: true };
}

export async function assertCalendarQuota(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<{ ok: true; remaining: number | null } | { error: NextResponse }> {
  const usage = await checkUsageLimit(
    supabase,
    userId,
    "content_calendar_posts"
  );
  if (!usage.allowed || (usage.remaining !== null && usage.remaining < amount)) {
    const planId = await getActivePlanId(supabase, userId);
    const limit = PLAN_CONFIG[planId].limits.calendar_posts_per_month;
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
    void notifyUsageLimitReached(
      supabase,
      userId,
      "content_calendar_posts",
      limit ?? usage.limit ?? 0
    );
    return {
      error: NextResponse.json(
        {
          error: `You've used all ${limit ?? usage.limit} calendar posts for this month. Upgrade for more, or wait until ${nextMonth.toLocaleDateString("en-NG", { month: "long", day: "numeric" })}.`,
        },
        { status: 403 }
      ),
    };
  }
  return { ok: true, remaining: usage.remaining };
}

export async function incrementCalendarUsage(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<void> {
  if (amount <= 0) return;
  await supabase.rpc("increment_usage", {
    p_user_id: userId,
    p_metric: "content_calendar_posts",
    p_amount: amount,
  });
}

export function mapBrandForCalendar(row: Record<string, unknown>) {
  // business_profiles.services is jsonb (V2: [{name, description}], legacy
  // rows: plain strings) — normalize to flat names for the string-based
  // prompt builders that consume this mapped shape.
  const services = serviceNames(row.services);
  const platforms = Array.isArray(row.platforms)
    ? row.platforms.filter((s): s is string => typeof s === "string")
    : ["instagram", "facebook"];

  const content_profile = parseContentProfile(row.content_profile, {
    brand_tone: row.brand_tone == null ? null : String(row.brand_tone),
    target_audience:
      row.target_audience == null ? null : String(row.target_audience),
    services: row.services,
  });

  // Prefer content_profile tones/audience when present so every prompt
  // builder that still reads brand_tone / target_audience stays consistent.
  const brand_tone = content_profile.primary_tone;
  const target_audience =
    content_profile.target_customer || String(row.target_audience ?? "");

  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    handle: "",
    business_name: String(row.business_name ?? "Business"),
    industry: String(row.industry ?? row.business_type ?? ""),
    business_type: String(row.business_type ?? ""),
    services:
      content_profile.key_offerings.length > 0
        ? content_profile.key_offerings
        : services,
    target_audience,
    location: String(row.location ?? "Nigeria"),
    location_city:
      row.location_city == null ? null : String(row.location_city),
    brand_tone,
    unique_value: String(row.unique_value ?? ""),
    tagline: String(row.tagline ?? ""),
    brand_vibe: String(row.brand_vibe ?? "clean-modern"),
    color_primary: String(row.color_primary ?? row.primary_color ?? "#0C0C0E"),
    color_accent: String(row.color_accent ?? "#C9A84C"),
    platforms,
    content_profile,
    pitch_line: row.pitch_line == null ? "" : String(row.pitch_line),
    tone_sample_choice:
      row.tone_sample_choice == null ? "" : String(row.tone_sample_choice),
  };
}

export const VALID_PLATFORMS = [
  "instagram",
  "facebook",
  "linkedin",
  "x",
  "tiktok",
] as const;

export function isValidPlatform(p: string): boolean {
  return (VALID_PLATFORMS as readonly string[]).includes(p);
}
