// Monday morning weekly digest email. docs/08_NOTIFICATIONS.md §9.1

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email/resend";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: subscribers } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .eq("email_weekly_digest", true);

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const periodStart = new Date();
  periodStart.setDate(1);
  const periodStartStr = periodStart.toISOString().split("T")[0];

  let sent = 0;

  for (const sub of subscribers) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", sub.user_id)
        .maybeSingle();
      if (!profile?.email) continue;

      const { data: business } = await supabase
        .from("business_profiles")
        .select("business_name")
        .eq("user_id", sub.user_id)
        .maybeSingle();

      const { data: website } = await supabase
        .from("websites")
        .select("handle")
        .eq("user_id", sub.user_id)
        .eq("status", "published")
        .maybeSingle();

      let weeklyViews: number | null = null;
      let viewsChange: number | null = null;
      if (website?.handle) {
        const { data: thisWeek } = await supabase
          .from("website_analytics_daily")
          .select("total_views")
          .eq("website_handle", website.handle)
          .gte("date", weekAgo);
        const { data: lastWeek } = await supabase
          .from("website_analytics_daily")
          .select("total_views")
          .eq("website_handle", website.handle)
          .gte("date", twoWeeksAgo)
          .lt("date", weekAgo);

        weeklyViews = (thisWeek ?? []).reduce((s, r) => s + r.total_views, 0);
        const lastWeekViews = (lastWeek ?? []).reduce((s, r) => s + r.total_views, 0);
        viewsChange =
          lastWeekViews > 0
            ? Math.round(((weeklyViews - lastWeekViews) / lastWeekViews) * 100)
            : null;
      }

      const { count: postsScheduled } = await supabase
        .from("content_calendar")
        .select("id", { count: "exact" })
        .eq("user_id", sub.user_id)
        .gte("scheduled_date", weekAgo);

      const { data: usage } = await supabase
        .from("usage_tracking")
        .select("images_generated")
        .eq("user_id", sub.user_id)
        .eq("period_start", periodStartStr)
        .maybeSingle();

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", sub.user_id)
        .maybeSingle();

      const imageLimits: Record<string, number> = {
        free: 0,
        pro: 50,
        growth: 80,
        premium: 200,
      };
      const imageLimit = imageLimits[subscription?.plan_id ?? "free"] ?? null;

      await sendEmail({
        to: profile.email,
        subject: `Your week at Zuri — ${business?.business_name ?? "your business"}`,
        template: "weekly_digest",
        templateProps: {
          firstName: profile.full_name?.split(" ")[0] ?? "there",
          businessName: business?.business_name ?? "your business",
          weeklyViews,
          viewsChange,
          postsScheduledThisWeek: postsScheduled ?? 0,
          imagesUsed: usage?.images_generated ?? 0,
          imageLimit,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        },
        userId: sub.user_id,
      });
      sent++;
    } catch (err) {
      console.error(`Weekly digest failed for user ${sub.user_id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
