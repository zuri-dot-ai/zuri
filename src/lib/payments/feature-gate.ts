import { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_CONFIG, PlanId, PlanLimits, isPlanId } from "./plans";

export interface GateResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: string; // plan ID the user needs to upgrade to
}

/** Columns on usage_tracking that are enforced as monthly quotas. */
export interface UsageTracking {
  images_generated: number;
  blog_posts_generated: number;
  newsletters_generated: number;
  content_calendar_posts: number;
  website_regenerations: number;
  content_ideas_used: number;
  storage_used_mb: number;
}

const USAGE_TO_LIMIT: Record<keyof UsageTracking, keyof PlanLimits> = {
  images_generated: "images_per_month",
  blog_posts_generated: "blog_posts_per_month",
  newsletters_generated: "newsletters_per_month",
  content_calendar_posts: "calendar_posts_per_month",
  website_regenerations: "website_regenerations",
  content_ideas_used: "content_ideas_per_month",
  storage_used_mb: "storage_mb",
};

function resolvePlanId(
  planId: string | null | undefined,
  status: string | null | undefined
): PlanId {
  const active =
    status === "active" || status === "grace_period" || status === "trialing";
  if (!active) return "free";
  return isPlanId(planId) ? planId : "free";
}

export async function checkFeatureAccess(
  supabase: SupabaseClient,
  userId: string,
  feature: keyof PlanLimits
): Promise<GateResult> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("user_id", userId)
    .single();

  const planId = resolvePlanId(sub?.plan_id, sub?.status);
  const limits = PLAN_CONFIG[planId]?.limits;
  if (!limits) return { allowed: false, reason: "Plan not found" };

  const value = limits[feature];

  // Boolean feature
  if (typeof value === "boolean") {
    if (value) return { allowed: true };
    const upgradeTarget = findMinimumPlanFor(feature, true);
    return {
      allowed: false,
      reason: `Not available on ${PLAN_CONFIG[planId].name} plan`,
      upgradeRequired: upgradeTarget,
    };
  }

  // Numeric limit — 0 means blocked
  if (typeof value === "number" && value === 0) {
    const upgradeTarget = findMinimumPlanFor(feature, 1);
    return {
      allowed: false,
      reason: `Not available on ${PLAN_CONFIG[planId].name} plan`,
      upgradeRequired: upgradeTarget,
    };
  }

  // Empty supported_branches array means blocked
  if (Array.isArray(value) && value.length === 0) {
    const upgradeTarget = findMinimumPlanFor(feature, 1);
    return {
      allowed: false,
      reason: `Not available on ${PLAN_CONFIG[planId].name} plan`,
      upgradeRequired: upgradeTarget,
    };
  }

  return { allowed: true };
}

export async function checkUsageLimit(
  supabase: SupabaseClient,
  userId: string,
  metric: keyof UsageTracking
): Promise<{
  allowed: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
}> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("user_id", userId)
    .single();

  const planId = resolvePlanId(sub?.plan_id, sub?.status);
  const limits = PLAN_CONFIG[planId]?.limits;
  const limitKey = USAGE_TO_LIMIT[metric];
  const limit = limits?.[limitKey] as number | null | undefined;

  if (limit === null || limit === undefined) {
    return { allowed: true, used: 0, limit: null, remaining: null }; // Unlimited
  }

  const periodStart = new Date();
  periodStart.setDate(1); // First of current month — adjust to billing anniversary if needed
  const periodStartStr = periodStart.toISOString().split("T")[0];

  const { data: usage } = await supabase
    .from("usage_tracking")
    .select(metric)
    .eq("user_id", userId)
    .eq("period_start", periodStartStr)
    .single();

  const used =
    (usage as Record<string, number> | null)?.[metric] ?? 0;
  const remaining = Math.max(0, limit - used);

  return { allowed: used < limit, used, limit, remaining };
}

function findMinimumPlanFor(
  feature: keyof PlanLimits,
  requiredValue: boolean | number
): string {
  for (const planId of ["pro", "growth", "premium"] as PlanId[]) {
    const value = PLAN_CONFIG[planId].limits[feature];
    if (typeof requiredValue === "boolean" && value === true) return planId;
    if (
      typeof requiredValue === "number" &&
      typeof value === "number" &&
      value >= requiredValue
    ) {
      return planId;
    }
    if (Array.isArray(value) && value.length > 0) return planId;
    if (value !== null && value !== false && value !== 0) return planId;
  }
  return "premium";
}
