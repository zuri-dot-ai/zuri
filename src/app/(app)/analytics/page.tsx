import { Suspense } from "react";
import Link from "next/link";
import {
  Eye,
  Users,
  Inbox,
  Share2,
  Instagram,
  Search,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { StatCard } from "@/components/app/stat-card";
import { AnalyticsRangeSelector } from "@/components/app/analytics-range-selector";
import { AnalyticsBarChart } from "@/components/app/analytics-bar-chart";
import { TrafficSourcesBreakdown } from "@/components/app/traffic-sources";
import { ContentPerformanceTeaser } from "@/components/app/content-performance-teaser";
import {
  getActivePlanId,
  isGrowthPlus,
} from "@/lib/payments/get-plan";
import { PLAN_CONFIG } from "@/lib/payments/plans";
import {
  getWebsiteAnalytics,
  type AnalyticsRange,
  type WebsiteAnalyticsSummary,
} from "@/lib/analytics/website-stats";
import { formatCompactNumber } from "@/lib/dashboard/home-helpers";
import { EmptyState } from "@/components/app/empty-state";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import type { MonthlyReport } from "@/lib/analytics/monthly-report-generator";

function parseRange(raw: string | string[] | undefined): AnalyticsRange {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "7" || v === "30" || v === "90") return v;
  return "30";
}

function emptySummary(range: AnalyticsRange): WebsiteAnalyticsSummary {
  const days = Number(range);
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    series.push({
      date: d.toISOString().slice(0, 10),
      views: 0,
      unique: 0,
    });
  }
  return {
    totalViews: 0,
    uniqueVisitors: 0,
    submissions: 0,
    topSource: null,
    series,
    topPages: [],
    sources: [],
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    meta_connect?: string;
    gsc_connect?: string;
  }>;
}) {
  const params = await searchParams;
  const range = parseRange(params.range);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const planId = await getActivePlanId(supabase, user!.id);
  const limits = PLAN_CONFIG[planId].limits;
  const analyticsEnabled = limits.analytics_enabled;
  const growthPlus = isGrowthPlus(planId);
  const isPremium = planId === "premium";

  const { data: website } = await supabase
    .from("websites")
    .select("handle, status")
    .eq("user_id", user!.id)
    .maybeSingle();

  let summary = emptySummary(range);
  if (website?.handle && analyticsEnabled) {
    try {
      const service = createServiceClient();
      summary = await getWebsiteAnalytics(service, {
        handle: website.handle,
        ownerId: user!.id,
        range,
      });
    } catch {
      summary = emptySummary(range);
    }
  }

  const service = createServiceClient();

  let metaConnected = false;
  let metaOverview: {
    ig_reach: number;
    ig_impressions: number;
    ig_followers: number;
    fb_reach: number;
  } | null = null;

  let gscConnected = false;
  let gscSnapshot: {
    total_clicks: number;
    total_impressions: number;
    avg_position: number;
    top_queries: { keys?: string[]; clicks?: number; impressions?: number }[];
  } | null = null;

  let monthlyReport: {
    report_month: string;
    report_data: MonthlyReport;
  } | null = null;

  if (growthPlus && analyticsEnabled) {
    const { data: metaConn } = await service
      .from("meta_connections")
      .select("status")
      .eq("user_id", user!.id)
      .maybeSingle();
    metaConnected = metaConn?.status === "active";

    if (metaConnected) {
      const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const { data: rows } = await service
        .from("meta_insights")
        .select("platform, metric_name, metric_value")
        .eq("user_id", user!.id)
        .gte("period_date", since);

      const sum = (platform: string, name: string) =>
        (rows ?? [])
          .filter((r) => r.platform === platform && r.metric_name === name)
          .reduce((a, r) => a + Number(r.metric_value || 0), 0);
      const latest = (platform: string, name: string) => {
        const m = (rows ?? []).filter(
          (r) => r.platform === platform && r.metric_name === name
        );
        return m.length ? Number(m[m.length - 1].metric_value || 0) : 0;
      };
      metaOverview = {
        ig_reach: sum("instagram", "reach"),
        ig_impressions: sum("instagram", "impressions"),
        ig_followers: latest("instagram", "follower_count"),
        fb_reach: sum("facebook", "page_reach"),
      };
    }

    const { data: gscConn } = await service
      .from("search_console_connections")
      .select("status")
      .eq("user_id", user!.id)
      .maybeSingle();
    gscConnected = gscConn?.status === "active";

    if (gscConnected) {
      const { data: snap } = await service
        .from("search_console_snapshots")
        .select(
          "total_clicks, total_impressions, avg_position, top_queries"
        )
        .eq("user_id", user!.id)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (snap) {
        gscSnapshot = {
          total_clicks: snap.total_clicks ?? 0,
          total_impressions: snap.total_impressions ?? 0,
          avg_position: Number(snap.avg_position ?? 0),
          top_queries: (snap.top_queries ?? []) as {
            keys?: string[];
            clicks?: number;
            impressions?: number;
          }[],
        };
      }
    }
  }

  if (isPremium && analyticsEnabled) {
    const { data: report } = await service
      .from("monthly_reports")
      .select("report_month, report_data")
      .eq("user_id", user!.id)
      .order("report_month", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (report) {
      monthlyReport = {
        report_month: report.report_month,
        report_data: report.report_data as MonthlyReport,
      };
    }
  }

  const fourthStat = summary.topSource
    ? {
        label: "Top source",
        value: `${summary.topSource.share}%`,
        hint: `via ${summary.topSource.domain}`,
      }
    : {
        label: "Top source",
        value: "—",
        hint: "No traffic yet",
      };

  const banner =
    params.meta_connect === "success"
      ? "Meta connected successfully."
      : params.meta_connect === "failed"
        ? "Meta connection was not completed. Please try again."
        : params.gsc_connect === "success"
          ? "Search Console connected successfully."
          : params.gsc_connect === "failed"
            ? "Google connection was not completed. Please try again."
            : null;

  return (
    <ErrorBoundary context="analytics">
    <div className="relative mx-auto max-w-5xl space-y-7 pb-8 page-enter">
      <header className="page-head flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1>Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Deeper performance for your live site
            {website?.handle ? ` · ${website.handle}` : ""}
          </p>
          {analyticsEnabled && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded border border-border px-2 py-0.5 text-muted-foreground">
                Website {website?.status === "published" ? "Connected" : "—"}
              </span>
              {growthPlus && (
                <>
                  <span className="rounded border border-border px-2 py-0.5 text-muted-foreground">
                    Meta: {metaConnected ? "Connected" : "Not connected"}
                  </span>
                  <span className="rounded border border-border px-2 py-0.5 text-muted-foreground">
                    Search Console:{" "}
                    {gscConnected ? "Connected" : "Not connected"}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <Suspense fallback={null}>
          <AnalyticsRangeSelector current={range} />
        </Suspense>
      </header>

      {banner && (
        <p
          className={`rounded border px-4 py-3 text-sm ${
            banner.includes("not completed")
              ? "border-destructive/40 text-destructive"
              : "border-border text-foreground"
          }`}
        >
          {banner}
        </p>
      )}

      {!analyticsEnabled ? (
        <EmptyState
          variant="analytics"
          title="Analytics unlocks on Pro"
          description="Upgrade to see pageviews, visitors, traffic sources, and form submissions for your website."
          actionLabel="View plans"
          actionHref="/settings?tab=billing"
          actionVariant="secondary"
        />
      ) : !website ? (
        <EmptyState
          variant="analytics"
          title="Publish your website to start tracking"
          description="Once your site is live, visitor analytics will appear here."
          actionLabel="Go to website"
          actionHref="/website"
          actionVariant="secondary"
        />
      ) : (
        <>
          {isPremium && (
            <section className="surface p-5 md:p-6">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Monthly report</h3>
              </div>
              {monthlyReport ? (
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    {new Date(monthlyReport.report_month).toLocaleString(
                      "en-NG",
                      { month: "long", year: "numeric" }
                    )}{" "}
                    — ready
                  </p>
                  <p>{monthlyReport.report_data.executive_summary}</p>
                  <p>
                    <span className="font-medium">Top win:</span>{" "}
                    {monthlyReport.report_data.top_win}
                  </p>
                  {monthlyReport.report_data.recommendations?.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      {monthlyReport.report_data.recommendations.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your first monthly report will be ready on the 1st of next
                  month.
                </p>
              )}
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Pageviews"
              value={formatCompactNumber(summary.totalViews)}
              icon={Eye}
            />
            <StatCard
              label="Unique visitors"
              value={formatCompactNumber(summary.uniqueVisitors)}
              icon={Users}
            />
            <StatCard
              label="Form submissions"
              value={summary.submissions}
              icon={Inbox}
            />
            <StatCard
              label={fourthStat.label}
              value={fourthStat.value}
              hint={fourthStat.hint}
              icon={Share2}
              accent={!!summary.topSource}
            />
          </div>

          <section className="surface p-5 md:p-6">
            <div className="card-head mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium">Traffic over time</h3>
            </div>
            {summary.totalViews === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                Your analytics will appear here once visitors start arriving.
                Share your site to get started.
              </p>
            ) : (
              <AnalyticsBarChart series={summary.series} />
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface overflow-hidden p-0">
              <div className="border-b border-border px-5 py-4">
                <h3 className="text-sm font-medium">Top pages</h3>
              </div>
              {summary.topPages.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground">
                  No pageviews in this range.
                </p>
              ) : (
                <div className="table-wrap overflow-x-auto">
                  <table className="data-table w-full text-sm">
                    <thead>
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Page
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Views
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Submissions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.topPages.map((row) => (
                        <tr
                          key={row.path}
                          className="border-t border-border"
                        >
                          <td className="px-5 py-3 font-medium">{row.path}</td>
                          <td className="px-5 py-3 text-right font-mono">
                            {row.views}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                            {row.submissions || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="surface p-5 md:p-6">
              <h3 className="mb-4 text-sm font-medium">Traffic sources</h3>
              <TrafficSourcesBreakdown sources={summary.sources} />
            </section>
          </div>

          {growthPlus && (
            <>
              <section className="surface p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Meta overview</h3>
                  </div>
                  {!metaConnected && (
                    <Link
                      href="/api/analytics/meta/connect"
                      className="text-sm font-medium underline underline-offset-4"
                    >
                      Connect
                    </Link>
                  )}
                </div>
                {metaConnected && metaOverview ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                      label="IG reach (28d)"
                      value={formatCompactNumber(metaOverview.ig_reach)}
                    />
                    <StatCard
                      label="IG impressions"
                      value={formatCompactNumber(metaOverview.ig_impressions)}
                    />
                    <StatCard
                      label="IG followers"
                      value={formatCompactNumber(metaOverview.ig_followers)}
                    />
                    <StatCard
                      label="FB page reach"
                      value={formatCompactNumber(metaOverview.fb_reach)}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Connect Instagram &amp; Facebook to see your social media
                    performance alongside your website data.{" "}
                    <Link
                      href="/api/analytics/meta/connect"
                      className="font-medium underline underline-offset-4"
                    >
                      Connect
                    </Link>
                  </p>
                )}
              </section>

              <section className="surface p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Search Console</h3>
                  </div>
                  {!gscConnected && (
                    <Link
                      href="/api/analytics/search-console/connect"
                      className="text-sm font-medium underline underline-offset-4"
                    >
                      Connect
                    </Link>
                  )}
                </div>
                {gscConnected && gscSnapshot ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <StatCard
                        label="Impressions"
                        value={formatCompactNumber(
                          gscSnapshot.total_impressions
                        )}
                      />
                      <StatCard
                        label="Clicks"
                        value={formatCompactNumber(gscSnapshot.total_clicks)}
                      />
                      <StatCard
                        label="Avg position"
                        value={gscSnapshot.avg_position.toFixed(1)}
                      />
                    </div>
                    {gscSnapshot.top_queries.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="data-table w-full text-sm">
                          <thead>
                            <tr>
                              <th className="px-2 py-2 text-left text-xs uppercase text-muted-foreground">
                                Query
                              </th>
                              <th className="px-2 py-2 text-right text-xs uppercase text-muted-foreground">
                                Clicks
                              </th>
                              <th className="px-2 py-2 text-right text-xs uppercase text-muted-foreground">
                                Impr.
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {gscSnapshot.top_queries.slice(0, 5).map((q, i) => (
                              <tr key={i} className="border-t border-border">
                                <td className="px-2 py-2">
                                  {q.keys?.[0] ?? "—"}
                                </td>
                                <td className="px-2 py-2 text-right font-mono">
                                  {q.clicks ?? 0}
                                </td>
                                <td className="px-2 py-2 text-right font-mono">
                                  {q.impressions ?? 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Connect Google Search Console to see how people find your
                    site on Google.{" "}
                    <Link
                      href="/api/analytics/search-console/connect"
                      className="font-medium underline underline-offset-4"
                    >
                      Connect
                    </Link>
                  </p>
                )}
              </section>
            </>
          )}

          <ContentPerformanceTeaser unlocked={growthPlus} />
        </>
      )}
    </div>
    </ErrorBoundary>
  );
}
