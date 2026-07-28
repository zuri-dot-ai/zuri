// Shared helpers for usage_warning / usage_limit_reached emails.
// Respects email_usage_alerts preference (default true).

import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotificationAsync } from "@/lib/notifications/create-notification";
import { PLAN_CONFIG, type PlanId } from "@/lib/payments/plans";
import { getActivePlanId } from "@/lib/payments/get-plan";

const METRIC_LABELS: Record<string, string> = {
  images_generated: "images",
  blog_posts_generated: "blog posts",
  newsletters_generated: "newsletters",
  content_calendar_posts: "calendar posts",
  website_regenerations: "website regenerations",
  content_ideas_used: "content ideas",
  storage_used_mb: "storage (MB)",
};

const UPGRADE_PLAN: Record<PlanId, string> = {
  free: "Pro",
  pro: "Growth",
  growth: "Premium",
  premium: "Premium",
};

async function wantsUsageEmails(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("email_usage_alerts")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.email_usage_alerts !== false;
}

function resetDateLabel(): string {
  const next = new Date();
  next.setMonth(next.getMonth() + 1, 1);
  return next.toLocaleDateString("en-NG", { month: "long", day: "numeric" });
}

export async function notifyUsageLimitReached(
  supabase: SupabaseClient,
  userId: string,
  metric: string,
  limit: number
): Promise<void> {
  if (!(await wantsUsageEmails(supabase, userId))) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();

  const planId = await getActivePlanId(supabase, userId);
  const metricLabel = METRIC_LABELS[metric] ?? metric;
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const upgradeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`;
  const resetDate = resetDateLabel();

  createNotificationAsync({
    userId,
    type: "usage_limit_reached",
    title: `You've reached your ${metricLabel} limit`,
    body: `You've used all ${limit} ${metricLabel} this month.`,
    actionUrl: "/settings?tab=billing",
    actionLabel: "Upgrade my plan",
    email: profile?.email
      ? {
          to: profile.email,
          subject: `You've reached your ${metricLabel} limit`,
          template: "usage_limit_reached",
          templateProps: {
            firstName,
            metric: metricLabel,
            limit,
            resetDate,
            upgradeUrl,
            currentPlan: PLAN_CONFIG[planId].name,
            upgradePlan: UPGRADE_PLAN[planId],
          },
        }
      : undefined,
  });
}

/** Send usage_warning when usage is at/above 80% but still under the hard limit. */
export async function maybeNotifyUsageWarning(
  supabase: SupabaseClient,
  userId: string,
  metric: string,
  used: number,
  limit: number | null
): Promise<void> {
  if (limit === null || limit <= 0) return;
  const percentUsed = Math.round((used / limit) * 100);
  if (percentUsed < 80 || used >= limit) return;
  if (!(await wantsUsageEmails(supabase, userId))) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();

  const metricLabel = METRIC_LABELS[metric] ?? metric;
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const upgradeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`;

  createNotificationAsync({
    userId,
    type: "usage_limit_warning",
    title: `You're at ${percentUsed}% of your ${metricLabel} limit`,
    body: `You've used ${used} of ${limit} ${metricLabel} this month.`,
    actionUrl: "/settings?tab=billing",
    actionLabel: "View my plan",
    email: profile?.email
      ? {
          to: profile.email,
          subject: `You're at ${percentUsed}% of your ${metricLabel} limit`,
          template: "usage_warning",
          templateProps: {
            firstName,
            metric: metricLabel,
            percentUsed,
            upgradeUrl,
          },
        }
      : undefined,
  });
}
