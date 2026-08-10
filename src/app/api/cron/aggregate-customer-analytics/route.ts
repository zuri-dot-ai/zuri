import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "edge";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const now = new Date();
  const thisHour = new Date(now);
  thisHour.setUTCMinutes(0, 0, 0);
  const lastHour = new Date(thisHour.getTime() - 60 * 60 * 1000);

  const { data: sites } = await supabase
    .from("websites")
    .select("id")
    .eq("status", "published");

  const siteIds = (sites ?? []).map((s) => s.id);
  let processed = 0;

  for (const websiteId of siteIds) {
    try {
      await aggregateHour(supabase, websiteId, lastHour);
      processed++;
    } catch (err) {
      console.error(`[aggregate-customer-analytics] failed for ${websiteId}:`, err);
    }
  }

  return NextResponse.json({ ok: true, processed });
}

async function aggregateHour(
  supabase: ReturnType<typeof createServiceClient>,
  websiteId: string,
  hourStart: Date
): Promise<void> {
  const hourIso = hourStart.toISOString();
  const nextHour = new Date(hourStart.getTime() + 60 * 60 * 1000).toISOString();

  const { data: events } = await supabase
    .from("analytics_events")
    .select("*")
    .eq("website_id", websiteId)
    .gte("created_at", hourIso)
    .lt("created_at", nextHour);

  if (!events?.length) return;

  const pageViews = events.filter((e) => e.event_type === "page_view").length;
  const sessions = new Set(events.map((e) => e.session_id)).size;
  const visitors = new Set(events.map((e) => e.visitor_id)).size;
  const newVisitors = events.filter((e) => e.is_new_visitor).length;

  const whatsappClicks = events.filter((e) => e.event_type === "whatsapp_click").length;
  const phoneClicks = events.filter((e) => e.event_type === "phone_click").length;
  const formSubmits = events.filter((e) => e.event_type === "form_submit").length;
  const ctaClicks = events.filter((e) => e.event_type === "cta_click").length;

  const deviceCounts: Record<string, number> = {};
  events.forEach((e) => {
    const t = e.device_type || "desktop";
    deviceCounts[t] = (deviceCounts[t] ?? 0) + 1;
  });

  const pageCounts: Record<string, number> = {};
  events
    .filter((e) => e.event_type === "page_view")
    .forEach((e) => {
      const p = e.page_path || "/";
      pageCounts[p] = (pageCounts[p] ?? 0) + 1;
    });
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, count]) => ({ path, count }));

  const referrerCounts: Record<string, number> = {};
  events.forEach((e) => {
    const r = e.referrer_domain || "Direct";
    referrerCounts[r] = (referrerCounts[r] ?? 0) + 1;
  });
  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  const countryCounts: Record<string, number> = {};
  events.forEach((e) => {
    if (e.country) {
      countryCounts[e.country] = (countryCounts[e.country] ?? 0) + 1;
    }
  });
  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([country, count]) => ({ country, count }));

  await supabase.from("analytics_rollups_hourly").upsert(
    {
      website_id: websiteId,
      hour_bucket: hourIso,
      page_views: pageViews,
      unique_visitors: visitors,
      new_visitors: newVisitors,
      sessions,
      whatsapp_clicks: whatsappClicks,
      phone_clicks: phoneClicks,
      form_submits: formSubmits,
      cta_clicks: ctaClicks,
      mobile_count: deviceCounts.mobile || 0,
      desktop_count: deviceCounts.desktop || 0,
      tablet_count: deviceCounts.tablet || 0,
      top_pages: topPages,
      top_referrers: topReferrers,
      top_countries: topCountries,
    },
    { onConflict: "website_id,hour_bucket" }
  );
}
