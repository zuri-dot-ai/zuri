import type { SupabaseClient } from "@supabase/supabase-js";

export type AnalyticsRange = "7" | "30" | "90";

export interface DailyPoint {
  date: string;
  views: number;
  unique: number;
}

export interface ReferrerShare {
  domain: string;
  count: number;
  share: number; // 0–100
}

export interface TopPageRow {
  path: string;
  views: number;
  submissions: number;
}

export interface WebsiteAnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  submissions: number;
  /** Top traffic source share — substitute for session duration (docs/13 §5). */
  topSource: ReferrerShare | null;
  series: DailyPoint[];
  topPages: TopPageRow[];
  sources: ReferrerShare[];
}

function startDateForRange(range: AnalyticsRange): string {
  const days = Number(range);
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

function classifyReferrer(raw: string | null | undefined): string {
  if (!raw || raw === "" || raw === "direct") return "Direct";
  const host = raw
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .toLowerCase();
  if (!host || host === "direct") return "Direct";
  if (host.includes("instagram") || host === "l.instagram.com") return "Instagram";
  if (host.includes("google") || host.includes("bing") || host.includes("yahoo"))
    return "Google";
  if (host.includes("whatsapp") || host.includes("wa.me")) return "WhatsApp";
  if (host.includes("facebook") || host.includes("fb.")) return "Facebook";
  return "Other";
}

function toShares(counts: Record<string, number>): ReferrerShare[] {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(counts)
    .map(([domain, count]) => ({
      domain,
      count,
      share: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

function emptySeries(range: AnalyticsRange): DailyPoint[] {
  const days = Number(range);
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), views: 0, unique: 0 });
  }
  return out;
}

/**
 * Aggregates analytics for a website handle.
 * Must be called with a service-role client (RLS blocks owner reads on raw tables).
 */
export async function getWebsiteAnalytics(
  service: SupabaseClient,
  opts: {
    handle: string;
    ownerId: string;
    range: AnalyticsRange;
  }
): Promise<WebsiteAnalyticsSummary> {
  const { handle, ownerId, range } = opts;
  const from = startDateForRange(range);
  const fromIso = `${from}T00:00:00.000Z`;

  let series = emptySeries(range);
  let totalViews = 0;
  let uniqueVisitors = 0;
  const referrerCounts: Record<string, number> = {};
  let topPages: TopPageRow[] = [];

  const { data: daily } = await service
    .from("website_analytics_daily")
    .select("date, total_views, unique_visitors, top_referrers")
    .eq("website_handle", handle)
    .gte("date", from)
    .order("date", { ascending: true });

  const { data: views } = await service
    .from("website_pageviews")
    .select("page_path, referrer, referrer_domain, created_at, anonymized_ip")
    .eq("website_handle", handle)
    .gte("created_at", fromIso);

  const pageCounts: Record<string, number> = {};
  for (const v of views ?? []) {
    const path = (v.page_path as string) || "/";
    pageCounts[path] = (pageCounts[path] ?? 0) + 1;
  }
  topPages = Object.entries(pageCounts)
    .map(([path, count]) => ({ path, views: count, submissions: 0 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  if (daily && daily.length > 0) {
    const byDate = new Map(
      daily.map((row) => [
        String(row.date).slice(0, 10),
        row as {
          total_views: number;
          unique_visitors: number;
          top_referrers: { domain?: string; count?: number }[] | null;
        },
      ])
    );
    series = series.map((p) => {
      const row = byDate.get(p.date);
      if (!row) return p;
      totalViews += row.total_views ?? 0;
      uniqueVisitors += row.unique_visitors ?? 0;
      for (const r of row.top_referrers ?? []) {
        const label = classifyReferrer(r.domain ?? null);
        referrerCounts[label] =
          (referrerCounts[label] ?? 0) + (r.count ?? 0);
      }
      return {
        date: p.date,
        views: row.total_views ?? 0,
        unique: row.unique_visitors ?? 0,
      };
    });
  } else {
    const dayMap = new Map<string, { views: number; ips: Set<string> }>();
    for (const v of views ?? []) {
      const day = String(v.created_at).slice(0, 10);
      const bucket = dayMap.get(day) ?? { views: 0, ips: new Set<string>() };
      bucket.views += 1;
      if (v.anonymized_ip) bucket.ips.add(v.anonymized_ip as string);
      dayMap.set(day, bucket);

      const label = classifyReferrer(
        (v.referrer_domain as string | null) ??
          (v.referrer as string | null)
      );
      referrerCounts[label] = (referrerCounts[label] ?? 0) + 1;
    }

    series = series.map((p) => {
      const b = dayMap.get(p.date);
      const viewsCount = b?.views ?? 0;
      const unique = b?.ips.size ?? (viewsCount > 0 ? viewsCount : 0);
      totalViews += viewsCount;
      uniqueVisitors += unique;
      return { date: p.date, views: viewsCount, unique };
    });
  }

  // If daily path had referrers empty but raw views exist, backfill sources
  if (Object.keys(referrerCounts).length === 0 && views && views.length > 0) {
    for (const v of views) {
      const label = classifyReferrer(
        (v.referrer_domain as string | null) ??
          (v.referrer as string | null)
      );
      referrerCounts[label] = (referrerCounts[label] ?? 0) + 1;
    }
  }

  const { count: submissions } = await service
    .from("contact_submissions")
    .select("*", { count: "exact", head: true })
    .eq("website_owner_id", ownerId)
    .gte("created_at", fromIso);

  if (topPages.length > 0 && (submissions ?? 0) > 0) {
    const home = topPages.find((p) => p.path === "/") ?? topPages[0];
    home.submissions = submissions ?? 0;
  }

  const sources = toShares(referrerCounts);
  const topSource = sources[0] ?? null;

  return {
    totalViews,
    uniqueVisitors,
    submissions: submissions ?? 0,
    topSource,
    series,
    topPages,
    sources,
  };
}

export async function getMonthPageviewCount(
  service: SupabaseClient,
  handle: string
): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const from = start.toISOString().slice(0, 10);

  const { data: daily } = await service
    .from("website_analytics_daily")
    .select("total_views")
    .eq("website_handle", handle)
    .gte("date", from);

  if (daily && daily.length > 0) {
    return daily.reduce((sum, r) => sum + (r.total_views ?? 0), 0);
  }

  const { count } = await service
    .from("website_pageviews")
    .select("*", { count: "exact", head: true })
    .eq("website_handle", handle)
    .gte("created_at", start.toISOString());

  return count ?? 0;
}
