import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PLAN_CONFIG, isPlanId } from "@/lib/payments/plans";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("user_id, plan_id, status");

  let purgedUsers = 0;

  for (const sub of subscriptions ?? []) {
    const planId =
      sub.status === "active" ||
      sub.status === "grace_period" ||
      sub.status === "trialing"
        ? isPlanId(sub.plan_id)
          ? sub.plan_id
          : "free"
        : "free";
    const retentionDays =
      PLAN_CONFIG[planId]?.limits.analytics_retention_days;

    if (!retentionDays) continue;

    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0];

    await supabase
      .from("website_pageviews")
      .delete()
      .eq("website_owner_id", sub.user_id)
      .lt("created_at", `${cutoffDate}T00:00:00Z`);

    const { data: sites } = await supabase
      .from("websites")
      .select("handle")
      .eq("user_id", sub.user_id);

    const handles = (sites ?? []).map((s) => s.handle).filter(Boolean);
    if (handles.length > 0) {
      await supabase
        .from("website_analytics_daily")
        .delete()
        .in("website_handle", handles)
        .lt("date", cutoffDate);
    }

    await supabase
      .from("meta_insights")
      .delete()
      .eq("user_id", sub.user_id)
      .lt("period_date", cutoffDate);

    purgedUsers++;
  }

  return NextResponse.json({ ok: true, purged_users: purgedUsers });
}
