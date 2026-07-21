import type { SupabaseClient } from "@supabase/supabase-js";
import { geminiJSON } from "@/lib/gemini";
import { createServiceClient } from "@/lib/supabase/service";

export interface MonthlyReport {
  executive_summary: string;
  sections: { title: string; content: string }[];
  top_win: string;
  improvement_area: string;
  recommendations: string[];
}

async function getWebsiteAnalyticsForPeriod(
  supabase: SupabaseClient,
  userId: string,
  monthStart: string,
  monthEnd: string
) {
  const { data: website } = await supabase
    .from("websites")
    .select("handle")
    .eq("user_id", userId)
    .maybeSingle();

  if (!website?.handle) {
    return {
      total_views: 0,
      unique_visitors: 0,
      change_percent: 0,
      top_referrer: null as string | null,
      mobile_percent: 0,
    };
  }

  const { data: daily } = await supabase
    .from("website_analytics_daily")
    .select("*")
    .eq("website_handle", website.handle)
    .gte("date", monthStart)
    .lte("date", monthEnd);

  const total_views = (daily ?? []).reduce(
    (a, d) => a + (d.total_views ?? 0),
    0
  );
  const unique_visitors = (daily ?? []).reduce(
    (a, d) => a + (d.unique_visitors ?? 0),
    0
  );
  const mobile = (daily ?? []).reduce((a, d) => a + (d.mobile_views ?? 0), 0);
  const mobile_percent =
    total_views > 0 ? Math.round((mobile / total_views) * 100) : 0;

  const referrerMap: Record<string, number> = {};
  (daily ?? []).forEach((d) => {
    const refs = (d.top_referrers ?? []) as { domain: string; count: number }[];
    refs.forEach((r) => {
      referrerMap[r.domain] = (referrerMap[r.domain] ?? 0) + r.count;
    });
  });
  const top_referrer =
    Object.entries(referrerMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    total_views,
    unique_visitors,
    change_percent: 0,
    top_referrer,
    mobile_percent,
  };
}

async function getMetaInsightsForPeriod(
  supabase: SupabaseClient,
  userId: string,
  monthStart: string,
  monthEnd: string
) {
  const { data: rows } = await supabase
    .from("meta_insights")
    .select("platform, metric_name, metric_value")
    .eq("user_id", userId)
    .gte("period_date", monthStart)
    .lte("period_date", monthEnd);

  if (!rows?.length) return null;

  const sum = (platform: string, name: string) =>
    rows
      .filter((r) => r.platform === platform && r.metric_name === name)
      .reduce((a, r) => a + Number(r.metric_value || 0), 0);

  return {
    ig_reach: sum("instagram", "reach"),
    ig_impressions: sum("instagram", "impressions"),
    follower_change: sum("instagram", "follower_count"),
    fb_reach: sum("facebook", "page_reach"),
  };
}

async function getSearchConsoleForPeriod(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: snapshot } = await supabase
    .from("search_console_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!snapshot) return null;

  const topQuery = Array.isArray(snapshot.top_queries)
    ? (snapshot.top_queries[0] as { keys?: string[] })?.keys?.[0]
    : null;

  return {
    impressions: snapshot.total_impressions ?? 0,
    clicks: snapshot.total_clicks ?? 0,
    avg_position: snapshot.avg_position ?? 0,
    top_query: topQuery ?? "—",
  };
}

async function getContentActivityForPeriod(
  supabase: SupabaseClient,
  userId: string,
  monthStart: string,
  monthEnd: string
) {
  const { count: posts } = await supabase
    .from("generated_content")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", `${monthStart}T00:00:00Z`)
    .lte("created_at", `${monthEnd}T23:59:59Z`);

  const { count: blogs } = await supabase
    .from("generated_content")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("format_type", "blog_post")
    .gte("created_at", `${monthStart}T00:00:00Z`)
    .lte("created_at", `${monthEnd}T23:59:59Z`);

  const { count: newsletters } = await supabase
    .from("generated_content")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("format_type", "newsletter")
    .gte("created_at", `${monthStart}T00:00:00Z`)
    .lte("created_at", `${monthEnd}T23:59:59Z`);

  return {
    posts_created: posts ?? 0,
    blog_posts: blogs ?? 0,
    newsletters: newsletters ?? 0,
  };
}

async function getFormSubmissionsForPeriod(
  supabase: SupabaseClient,
  userId: string,
  monthStart: string,
  monthEnd: string
) {
  const { data, count } = await supabase
    .from("contact_submissions")
    .select("service_interest", { count: "exact" })
    .eq("website_owner_id", userId)
    .gte("created_at", `${monthStart}T00:00:00Z`)
    .lte("created_at", `${monthEnd}T23:59:59Z`);

  const map: Record<string, number> = {};
  (data ?? []).forEach((s) => {
    const key = s.service_interest ?? "General";
    map[key] = (map[key] ?? 0) + 1;
  });
  const top_service =
    Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { total: count ?? 0, top_service };
}

export async function generateMonthlyReport(
  userId: string
): Promise<MonthlyReport> {
  const supabase = createServiceClient();

  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const monthName = prevMonth.toLocaleString("en-NG", {
    month: "long",
    year: "numeric",
  });
  const monthStart = new Date(
    prevMonth.getFullYear(),
    prevMonth.getMonth(),
    1
  )
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(
    prevMonth.getFullYear(),
    prevMonth.getMonth() + 1,
    0
  )
    .toISOString()
    .split("T")[0];

  const [websiteData, metaData, searchData, contentData, formData] =
    await Promise.all([
      getWebsiteAnalyticsForPeriod(supabase, userId, monthStart, monthEnd),
      getMetaInsightsForPeriod(supabase, userId, monthStart, monthEnd),
      getSearchConsoleForPeriod(supabase, userId),
      getContentActivityForPeriod(supabase, userId, monthStart, monthEnd),
      getFormSubmissionsForPeriod(supabase, userId, monthStart, monthEnd),
    ]);

  const prompt = `
You are a digital marketing analyst writing a monthly performance report for a Nigerian small business.
Write a clear, encouraging, actionable report for ${monthName}.

WEBSITE ANALYTICS:
- Total page views: ${websiteData.total_views}
- Unique visitors: ${websiteData.unique_visitors}
- Change from previous month: ${websiteData.change_percent}%
- Top traffic source: ${websiteData.top_referrer ?? "direct"}
- Mobile traffic: ${websiteData.mobile_percent}%

SOCIAL MEDIA (Meta):
${
  metaData
    ? `
- Instagram reach: ${metaData.ig_reach}
- Instagram impressions: ${metaData.ig_impressions}
- Follower change: ${metaData.follower_change}
- Facebook reach: ${metaData.fb_reach}
`
    : "Not connected"
}

SEARCH VISIBILITY:
${
  searchData
    ? `
- Total search impressions: ${searchData.impressions}
- Total clicks from search: ${searchData.clicks}
- Average position: ${searchData.avg_position}
- Top search query: ${searchData.top_query}
`
    : "Not connected"
}

CONTENT ACTIVITY:
- Posts created: ${contentData.posts_created}
- Blog posts: ${contentData.blog_posts}
- Newsletters: ${contentData.newsletters}

CONTACT FORM ENQUIRIES:
- Total enquiries: ${formData.total}
- Most requested service: ${formData.top_service ?? "General"}

Write a structured report with these sections:
1. Executive Summary (2-3 sentences, encouraging and specific)
2. Website Performance (what happened, why it matters)
3. Social Media Performance (if data available)
4. Visibility on Search (if data available)
5. Top Win This Month (single most positive highlight)
6. One Area to Improve (honest, specific, actionable)
7. 3 Recommendations for Next Month (concrete, specific to this business)

Tone: professional but warm. Like a trusted advisor, not a corporate report.
Write for a Nigerian entrepreneur — reference local context where relevant.

Output ONLY valid JSON:
{
  "executive_summary": "2-3 sentence summary",
  "sections": [
    { "title": "Website Performance", "content": "section text" },
    { "title": "Social Media", "content": "..." },
    { "title": "Search Visibility", "content": "..." }
  ],
  "top_win": "single highlight",
  "improvement_area": "one specific area",
  "recommendations": ["rec 1", "rec 2", "rec 3"]
}
`;

  const report = await geminiJSON<MonthlyReport>(prompt, "pro");

  await supabase.from("monthly_reports").upsert(
    {
      user_id: userId,
      report_month: monthStart,
      report_data: report,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,report_month" }
  );

  return report;
}
