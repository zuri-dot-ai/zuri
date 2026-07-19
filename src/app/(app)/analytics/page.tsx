import { Suspense } from "react";
import {
  Eye,
  Users,
  Inbox,
  Share2,
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
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = parseRange(params.range);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const planId = await getActivePlanId(supabase, user!.id);
  const analyticsEnabled = PLAN_CONFIG[planId].limits.analytics_enabled;

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

  return (
    <div className="relative mx-auto max-w-5xl space-y-7 pb-8 page-enter">
      <header className="page-head flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1>Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Deeper performance for your live site
            {website?.handle ? ` · ${website.handle}` : ""}
          </p>
        </div>
        <Suspense fallback={null}>
          <AnalyticsRangeSelector current={range} />
        </Suspense>
      </header>

      {!analyticsEnabled ? (
        <EmptyState
          variant="analytics"
          title="Analytics unlocks on Pro"
          description="Upgrade to see pageviews, visitors, traffic sources, and form submissions for your website."
          actionLabel="View plans"
          actionHref="/settings?tab=billing"
          actionVariant="secondary"
        />
      ) : (
        <>
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
            <AnalyticsBarChart series={summary.series} />
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

          <ContentPerformanceTeaser unlocked={isGrowthPlus(planId)} />
        </>
      )}
    </div>
  );
}
