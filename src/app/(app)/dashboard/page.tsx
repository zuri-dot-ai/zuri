import Link from "next/link";
import {
  Eye,
  FileText,
  Flame,
  Inbox,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/app/stat-card";
import { TodaysActionCard } from "@/components/app/todays-action-card";
import { ConsistencyTracker } from "@/components/app/consistency-tracker";
import type { ConsistencyDay } from "@/components/app/consistency-tracker";
import { QuickLinksRow } from "@/components/app/quick-links-row";
import { RecentActivityFeed } from "@/components/app/recent-activity-feed";
import type { ActivityItem } from "@/components/app/recent-activity-feed";
import { GenerationStatusCard } from "@/components/app/generation-status-card";
import { CustomProjectStatusCard } from "@/components/app/custom-project-status-card";
import {
  getActivePlanId,
  isGrowthPlus,
  planDisplayName,
} from "@/lib/payments/get-plan";
import {
  greetingForNow,
  formatCompactNumber,
  isWebsiteLive,
  websiteStatusLabel,
} from "@/lib/dashboard/home-helpers";
import { getMonthPageviewCount } from "@/lib/analytics/website-stats";
import {
  getCustomerAnalytics,
  emptyCustomerAnalytics,
} from "@/lib/analytics/customer-analytics-stats";
import {
  isActiveCustomSiteStatus,
  type CustomSiteRequestStatus,
} from "@/lib/custom-site/types";
import type { ActionPlanTaskRow } from "@/types/database";

function last7Days(): ConsistencyDay[] {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days: ConsistencyDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().slice(0, 10),
      label: labels[d.getDay()],
      done: false,
    });
  }
  return days;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();
  const weekStart = last7Days()[0].date;

  const [
    { data: account },
    { data: progress },
    { data: website },
    planId,
    { data: todayTasks },
    { count: contentPublished },
    { count: formCount },
    { data: completedThisWeek },
    { data: postedThisWeek },
    { data: notifications },
    { data: latestJob },
    { data: customRequest },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user!.id)
      .maybeSingle(),
    supabase
      .from("user_progress")
      .select("current_streak")
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("websites")
      .select("status, handle, template_html")
      .eq("user_id", user!.id)
      .maybeSingle(),
    getActivePlanId(supabase, user!.id),
    supabase
      .from("action_plan_tasks")
      .select("*")
      .eq("user_id", user!.id)
      .lte("due_date", today)
      .eq("is_completed", false)
      .order("day_number", { ascending: true })
      .limit(1),
    supabase
      .from("content_calendar")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("status", "posted")
      .gte("scheduled_date", monthStart.toISOString().slice(0, 10)),
    supabase
      .from("contact_submissions")
      .select("*", { count: "exact", head: true })
      .eq("website_owner_id", user!.id)
      .gte("created_at", monthStartIso),
    supabase
      .from("action_plan_tasks")
      .select("completed_at, task_type")
      .eq("user_id", user!.id)
      .eq("is_completed", true)
      .eq("task_type", "content")
      .gte("completed_at", `${weekStart}T00:00:00.000Z`),
    supabase
      .from("content_calendar")
      .select("scheduled_date")
      .eq("user_id", user!.id)
      .eq("status", "posted")
      .gte("scheduled_date", weekStart),
    supabase
      .from("notifications")
      .select("id, title, body, action_url, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("website_generation_jobs")
      .select("id, status, error_message")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("custom_site_requests")
      .select("id, status, project_type, reviewer_notes")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let monthViews = 0;
  let whatsappClicks = 0;
  let phoneClicks = 0;
  if (website?.handle) {
    try {
      const service = createServiceClient();
      const { data: site } = await service
        .from("websites")
        .select("id")
        .eq("handle", website.handle)
        .maybeSingle();

      if (site?.id) {
        const customer = await getCustomerAnalytics(service, {
          websiteId: site.id,
          range: "30",
        });
        monthViews = customer.totalViews;
        whatsappClicks = customer.whatsappClicks;
        phoneClicks = customer.phoneClicks;
      } else {
        monthViews = await getMonthPageviewCount(service, website.handle);
      }
    } catch {
      monthViews = 0;
    }
  }

  const firstName = account?.full_name?.split(" ")[0] || "there";
  const streak = progress?.current_streak ?? 0;
  const todayTask = (todayTasks?.[0] as ActionPlanTaskRow | undefined) ?? null;
  const published = isWebsiteLive(website?.status);
  const statusLabel = websiteStatusLabel(website?.status);

  const doneDates = new Set<string>();
  for (const t of completedThisWeek ?? []) {
    if (t.completed_at) doneDates.add(String(t.completed_at).slice(0, 10));
  }
  for (const p of postedThisWeek ?? []) {
    if (p.scheduled_date) doneDates.add(String(p.scheduled_date).slice(0, 10));
  }
  const consistencyDays = last7Days().map((d) => ({
    ...d,
    done: doneDates.has(d.date),
  }));

  const activity: ActivityItem[] = (notifications ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    time: n.created_at,
    href: n.action_url,
  }));

  const jobStatus =
    (latestJob?.status as
      | "queued"
      | "processing"
      | "failed"
      | "completed"
      | null) ?? null;

  const customStatus = customRequest?.status as
    | CustomSiteRequestStatus
    | undefined;
  const hasUsableWebsite = Boolean(website?.template_html);
  const showCustomStatus =
    customStatus != null &&
    (isActiveCustomSiteStatus(customStatus) || customStatus === "declined") &&
    !hasUsableWebsite;
  const showGenerationCard = !showCustomStatus;

  return (
    <div className="relative mx-auto max-w-5xl space-y-7 pb-8 page-enter">
      <header className="page-head">
        <h1 className="font-heading heading-rule">
          {greetingForNow()}, {firstName}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="default">{planDisplayName(planId)}</Badge>
          {showCustomStatus ? (
            <Badge variant="muted">Custom project</Badge>
          ) : (
            <Badge
              variant={
                statusLabel === "Published"
                  ? "success"
                  : statusLabel === "Suspended"
                    ? "outline"
                    : "muted"
              }
            >
              {statusLabel}
              {website?.handle ? ` · ${website.handle}` : ""}
            </Badge>
          )}
          {!published && !showCustomStatus && (
            <Link href="/website" className="text-xs text-gold hover:underline">
              Finish setup →
            </Link>
          )}
        </div>
      </header>

      {showCustomStatus && customRequest && (
        <CustomProjectStatusCard
          status={customStatus!}
          projectType={customRequest.project_type}
          reviewerNotes={customRequest.reviewer_notes}
        />
      )}

      {showGenerationCard && (
        <GenerationStatusCard
          status={jobStatus}
          errorMessage={latestJob?.error_message}
          jobId={latestJob?.id}
        />
      )}

      {!showCustomStatus && (
        <TodaysActionCard task={todayTask} websitePublished={published} />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Website views"
          value={formatCompactNumber(monthViews)}
          hint="This month"
          icon={Eye}
        />
        <StatCard
          label="Content published"
          value={contentPublished ?? 0}
          hint="This month"
          icon={FileText}
        />
        <StatCard
          label="Consistency streak"
          value={`${streak} ${streak === 1 ? "day" : "days"}`}
          icon={Flame}
          accent={streak > 0}
        />
        {whatsappClicks > 0 || phoneClicks > 0 ? (
          <StatCard
            label="WhatsApp clicks"
            value={whatsappClicks}
            hint={phoneClicks > 0 ? `${phoneClicks} phone taps` : undefined}
            icon={Inbox}
          />
        ) : (
          <StatCard
            label="Form submissions"
            value={formCount ?? 0}
            hint="This month"
            icon={Inbox}
          />
        )}
      </div>

      <ConsistencyTracker days={consistencyDays} streak={streak} />

      <QuickLinksRow agenciesUnlocked={isGrowthPlus(planId)} />

      <RecentActivityFeed items={activity} />
    </div>
  );
}
