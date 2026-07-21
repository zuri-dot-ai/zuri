import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkFeatureAccess } from "@/lib/payments/feature-gate";
import { getActivePlanId } from "@/lib/payments/get-plan";
import { PLAN_CONFIG } from "@/lib/payments/plans";

function aggregateFormsByService(
  submissions: { service_interest?: string | null }[]
): { service: string; count: number }[] {
  const map: Record<string, number> = {};
  submissions.forEach((s) => {
    const key = s.service_interest ?? "General inquiry";
    map[key] = (map[key] ?? 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([service, count]) => ({ service, count }));
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await checkFeatureAccess(supabase, user.id, "analytics_enabled");
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Upgrade required", upgradeRequired: gate.upgradeRequired },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "30d";
  const planId = await getActivePlanId(supabase, user.id);

  const retentionDays =
    PLAN_CONFIG[planId]?.limits.analytics_retention_days ?? 30;
  const requestedDays = range === "365d" ? 365 : range === "90d" ? 90 : 30;
  const actualDays = Math.min(requestedDays, retentionDays ?? 30);

  const { data: website } = await supabase
    .from("websites")
    .select("handle")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!website?.handle) {
    return NextResponse.json({ error: "No website found" }, { status: 404 });
  }

  const sinceDate = new Date(Date.now() - actualDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Daily aggregates are service-role only (RLS)
  const service = createServiceClient();
  const { data: dailyData } = await service
    .from("website_analytics_daily")
    .select("*")
    .eq("website_handle", website.handle)
    .gte("date", sinceDate)
    .order("date", { ascending: true });

  const { data: formSubmissions, count: formCount } = await service
    .from("contact_submissions")
    .select("created_at, service_interest", { count: "exact" })
    .eq("website_owner_id", user.id)
    .gte("created_at", `${sinceDate}T00:00:00Z`);

  const totalViews = (dailyData ?? []).reduce(
    (a, d) => a + (d.total_views ?? 0),
    0
  );
  const totalUniqueVisitors = (dailyData ?? []).reduce(
    (a, d) => a + (d.unique_visitors ?? 0),
    0
  );
  const avgDailyViews = dailyData?.length
    ? Math.round(totalViews / dailyData.length)
    : 0;

  const deviceBreakdown = {
    mobile: (dailyData ?? []).reduce((a, d) => a + (d.mobile_views ?? 0), 0),
    desktop: (dailyData ?? []).reduce((a, d) => a + (d.desktop_views ?? 0), 0),
    tablet: (dailyData ?? []).reduce((a, d) => a + (d.tablet_views ?? 0), 0),
  };

  const referrerMap: Record<string, number> = {};
  (dailyData ?? []).forEach((d) => {
    const refs = (d.top_referrers ?? []) as { domain: string; count: number }[];
    refs.forEach((r) => {
      referrerMap[r.domain] = (referrerMap[r.domain] ?? 0) + r.count;
    });
  });
  const topReferrers = Object.entries(referrerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  const prevSinceDate = new Date(
    Date.now() - actualDays * 2 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split("T")[0];
  const { data: prevData } = await service
    .from("website_analytics_daily")
    .select("total_views, unique_visitors")
    .eq("website_handle", website.handle)
    .gte("date", prevSinceDate)
    .lt("date", sinceDate);

  const prevTotalViews = (prevData ?? []).reduce(
    (a, d) => a + (d.total_views ?? 0),
    0
  );
  const viewsChange =
    prevTotalViews > 0
      ? Math.round(((totalViews - prevTotalViews) / prevTotalViews) * 100)
      : null;

  return NextResponse.json({
    range: `${actualDays}d`,
    summary: {
      total_views: totalViews,
      total_unique_visitors: totalUniqueVisitors,
      avg_daily_views: avgDailyViews,
      views_change_percent: viewsChange,
      form_submissions: formCount ?? 0,
    },
    daily_chart: (dailyData ?? []).map((d) => ({
      date: d.date,
      views: d.total_views,
      unique_visitors: d.unique_visitors,
    })),
    device_breakdown: deviceBreakdown,
    top_referrers: topReferrers,
    form_submissions_by_service: aggregateFormsByService(formSubmissions ?? []),
  });
}
