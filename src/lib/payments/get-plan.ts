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

  const active =
    data?.status === "active" ||
    data?.status === "grace_period" ||
    data?.status === "trialing";

  if (!active) return "free";
  return isPlanId(data?.plan_id) ? data.plan_id : "free";
}

export function planDisplayName(planId: PlanId): string {
  return PLAN_CONFIG[planId].name;
}

export function isGrowthPlus(planId: PlanId): boolean {
  return planId === "growth" || planId === "premium";
}
