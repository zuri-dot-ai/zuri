import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLAN_CONFIG, isPlanId, type PlanId } from "@/lib/payments/plans";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      "plan_id, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, grace_period_end"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const status = sub?.status ?? "active";
  const active =
    status === "active" || status === "grace_period" || status === "trialing";
  const planId: PlanId =
    active && isPlanId(sub?.plan_id) ? sub!.plan_id : "free";
  const plan = PLAN_CONFIG[planId];

  const periodStart = new Date();
  periodStart.setDate(1);
  const periodStartStr = periodStart.toISOString().split("T")[0];

  const { data: usage } = await supabase
    .from("usage_tracking")
    .select(
      "images_generated, blog_posts_generated, newsletters_generated, content_calendar_posts, website_regenerations, content_ideas_used, storage_used_mb, period_start"
    )
    .eq("user_id", user.id)
    .eq("period_start", periodStartStr)
    .maybeSingle();

  return NextResponse.json({
    planId,
    planName: plan.name,
    status,
    billingCycle: sub?.billing_cycle ?? "monthly",
    periodStart: sub?.current_period_start ?? null,
    periodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
    gracePeriodEnd: sub?.grace_period_end ?? null,
    limits: plan.limits,
    prices: {
      monthly: plan.price_monthly,
      annual: plan.price_annual,
    },
    usage: {
      images_generated: usage?.images_generated ?? 0,
      blog_posts_generated: usage?.blog_posts_generated ?? 0,
      newsletters_generated: usage?.newsletters_generated ?? 0,
      content_calendar_posts: usage?.content_calendar_posts ?? 0,
      website_regenerations: usage?.website_regenerations ?? 0,
      content_ideas_used: usage?.content_ideas_used ?? 0,
      storage_used_mb: Number(usage?.storage_used_mb ?? 0),
      period_start: usage?.period_start ?? periodStartStr,
    },
  });
}
