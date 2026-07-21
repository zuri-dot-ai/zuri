import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  const { data: activeHandles } = await supabase
    .from("website_pageviews")
    .select("website_handle")
    .gte("created_at", `${dateStr}T00:00:00Z`)
    .lte("created_at", `${dateStr}T23:59:59Z`);

  const handles = [
    ...new Set((activeHandles ?? []).map((r) => r.website_handle)),
  ];

  for (const handle of handles) {
    try {
      await aggregateDayForHandle(supabase, handle, dateStr);
    } catch (err) {
      console.error(`Aggregation failed for ${handle}:`, err);
    }
  }

  return NextResponse.json({ ok: true, handles_processed: handles.length });
}

async function aggregateDayForHandle(
  supabase: SupabaseClient,
  handle: string,
  date: string
): Promise<void> {
  const { data: views } = await supabase
    .from("website_pageviews")
    .select("*")
    .eq("website_handle", handle)
    .gte("created_at", `${date}T00:00:00Z`)
    .lte("created_at", `${date}T23:59:59Z`);

  if (!views?.length) return;

  const totalViews = views.length;
  const uniqueVisitors = new Set(views.map((v) => v.anonymized_ip)).size;
  const mobileViews = views.filter((v) => v.device_type === "mobile").length;
  const desktopViews = views.filter((v) => v.device_type === "desktop").length;
  const tabletViews = views.filter((v) => v.device_type === "tablet").length;

  const referrerCounts: Record<string, number> = {};
  views.forEach((v) => {
    if (v.referrer_domain) {
      referrerCounts[v.referrer_domain] =
        (referrerCounts[v.referrer_domain] ?? 0) + 1;
    }
  });
  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  const countryCounts: Record<string, number> = {};
  views.forEach((v) => {
    if (v.country) {
      countryCounts[v.country] = (countryCounts[v.country] ?? 0) + 1;
    }
  });

  await supabase.from("website_analytics_daily").upsert(
    {
      website_handle: handle,
      date,
      total_views: totalViews,
      unique_visitors: uniqueVisitors,
      mobile_views: mobileViews,
      desktop_views: desktopViews,
      tablet_views: tabletViews,
      top_referrers: topReferrers,
      country_breakdown: countryCounts,
    },
    { onConflict: "website_handle,date" }
  );
}
