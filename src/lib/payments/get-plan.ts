import type { PlanId } from "@/lib/payments/plans";
import { PLAN_CONFIG, isPlanId } from "@/lib/payments/plans";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getActivePlanId(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanId> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    console.warn(
      `[getActivePlanId] No subscriptions row for user ${userId} — defaulting to free`
    );
    return "free";
  }

  const active =
    data.status === "active" ||
    data.status === "grace_period" ||
    data.status === "trialing";

  if (!active) return "free";
  return isPlanId(data.plan_id) ? data.plan_id : "free";
}

export function planDisplayName(planId: PlanId): string {
  return PLAN_CONFIG[planId].name;
}

export function isGrowthPlus(planId: PlanId): boolean {
  return planId === "growth" || planId === "premium";
}

/** Pro+ can publish live to {handle}.buildzuri.com; Free is preview-only. */
export function canPublishWebsite(planId: PlanId): boolean {
  return PLAN_CONFIG[planId].limits.can_publish === true;
}

/** Growth+ can attach a custom domain. */
export function canUseCustomDomain(planId: PlanId): boolean {
  return PLAN_CONFIG[planId].limits.custom_domain === true;
}
