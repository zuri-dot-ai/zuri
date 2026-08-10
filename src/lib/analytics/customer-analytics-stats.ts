import type { SupabaseClient } from "@supabase/supabase-js";

export type CustomerAnalyticsRange = "7" | "30" | "90";

export interface CustomerDailyPoint {
  date: string;
  views: number;
  visitors: number;
  whatsapp: number;
  phone: number;
}

export interface CustomerAnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  whatsappClicks: number;
  phoneClicks: number;
  formSubmits: number;
  ctaClicks: number;
  series: CustomerDailyPoint[];
  topPages: { path: string; views: number }[];
  deviceSplit: { mobile: number; desktop: number; tablet: number };
  topReferrers: { domain: string; count: number }[];
  topCountries: { country: string; count: number }[];
}

function startDateForRange(range: CustomerAnalyticsRange): string {
  const days = Number(range);
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

function emptySeries(range: CustomerAnalyticsRange): CustomerDailyPoint[] {
  const days = Number(range);
  const out: CustomerDailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    out.push({
      date: d.toISOString().slice(0, 10),
      views: 0,
      visitors: 0,
      whatsapp: 0,
      phone: 0,
    });
  }
  return out;
}

export async function getCustomerAnalytics(
  service: SupabaseClient,
  opts: {
    websiteId: string;
    range: CustomerAnalyticsRange;
  }
): Promise<CustomerAnalyticsSummary> {
  const { websiteId, range } = opts;
  const from = startDateForRange(range);

  let series = emptySeries(range);
  let totalViews = 0;
  let uniqueVisitors = 0;
  let newVisitors = 0;
  let returningVisitors = 0;
  let whatsappClicks = 0;
  let phoneClicks = 0;
  let formSubmits = 0;
  let ctaClicks = 0;

  const { data: daily } = await service
    .from("analytics_rollups_daily")
    .select(
      "day_bucket, page_views, unique_visitors, new_visitors, returning_visitors, whatsapp_clicks, phone_clicks, form_submits, cta_clicks, top_pages, top_referrers, top_countries, mobile_count, desktop_count, tablet_count"
    )
    .eq("website_id", websiteId)
    .gte("day_bucket", from)
    .order("day_bucket", { ascending: true });

  const byDate = new Map(
    (daily ?? []).map((row) => [
      String(row.day_bucket).slice(0, 10),
      row as {
        page_views: number;
        unique_visitors: number;
        new_visitors: number;
        returning_visitors: number;
        whatsapp_clicks: number;
        phone_clicks: number;
        form_submits: number;
        cta_clicks: number;
        top_pages: { path: string; count: number }[];
        top_referrers: { domain: string; count: number }[];
        top_countries: { country: string; count: number }[];
        mobile_count: number;
        desktop_count: number;
        tablet_count: number;
      },
    ])
  );

  const allTopPages: Record<string, number> = {};
  const allReferrers: Record<string, number> = {};
  const allCountries: Record<string, number> = {};
  let mobile = 0;
  let desktop = 0;
  let tablet = 0;

  for (const row of byDate.values()) {
    totalViews += row.page_views ?? 0;
    uniqueVisitors += row.unique_visitors ?? 0;
    newVisitors += row.new_visitors ?? 0;
    returningVisitors += row.returning_visitors ?? 0;
    whatsappClicks += row.whatsapp_clicks ?? 0;
    phoneClicks += row.phone_clicks ?? 0;
    formSubmits += row.form_submits ?? 0;
    ctaClicks += row.cta_clicks ?? 0;
    mobile += row.mobile_count ?? 0;
    desktop += row.desktop_count ?? 0;
    tablet += row.tablet_count ?? 0;

    for (const p of row.top_pages ?? []) {
      allTopPages[p.path] = (allTopPages[p.path] ?? 0) + (p.count ?? 0);
    }
    for (const r of row.top_referrers ?? []) {
      allReferrers[r.domain] = (allReferrers[r.domain] ?? 0) + (r.count ?? 0);
    }
    for (const c of row.top_countries ?? []) {
      allCountries[c.country] = (allCountries[c.country] ?? 0) + (c.count ?? 0);
    }
  }

  series = series.map((p) => {
    const row = byDate.get(p.date);
    if (!row) return p;
    return {
      date: p.date,
      views: row.page_views ?? 0,
      visitors: row.unique_visitors ?? 0,
      whatsapp: row.whatsapp_clicks ?? 0,
      phone: row.phone_clicks ?? 0,
    };
  });

  const topPages = Object.entries(allTopPages)
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const topReferrers = Object.entries(allReferrers)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topCountries = Object.entries(allCountries)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalViews,
    uniqueVisitors,
    newVisitors,
    returningVisitors,
    whatsappClicks,
    phoneClicks,
    formSubmits,
    ctaClicks,
    series,
    topPages,
    deviceSplit: { mobile, desktop, tablet },
    topReferrers,
    topCountries,
  };
}

export function emptyCustomerAnalytics(
  range: CustomerAnalyticsRange
): CustomerAnalyticsSummary {
  return {
    totalViews: 0,
    uniqueVisitors: 0,
    newVisitors: 0,
    returningVisitors: 0,
    whatsappClicks: 0,
    phoneClicks: 0,
    formSubmits: 0,
    ctaClicks: 0,
    series: emptySeries(range),
    topPages: [],
    deviceSplit: { mobile: 0, desktop: 0, tablet: 0 },
    topReferrers: [],
    topCountries: [],
  };
}
