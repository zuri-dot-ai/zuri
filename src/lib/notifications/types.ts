// docs/08_NOTIFICATIONS.md §3 — notification data model.

export type NotificationType =
  | "website_generated"
  | "website_published"
  | "website_generation_failed"
  | "website_unpublished"
  | "website_suspended"
  | "contact_form_received"
  | "domain_connected"
  | "domain_dns_delayed"
  | "calendar_ready"
  | "content_generated"
  | "content_generation_failed"
  | "usage_limit_warning"
  | "usage_limit_reached"
  | "meta_token_expired"
  | "search_console_expired"
  | "monthly_report_ready"
  | "payment_successful"
  | "payment_failed"
  | "grace_period_started"
  | "grace_period_ending"
  | "trial_ending"
  | "trial_expired"
  | "plan_upgraded"
  | "plan_downgraded"
  | "subscription_cancelled"
  | "agency_inquiry_sent";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url: string | null;
  action_label: string | null;
  icon: string;
  icon_color: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const NOTIFICATION_DISPLAY: Record<
  NotificationType,
  { icon: string; color: string }
> = {
  website_generated: { icon: "Globe", color: "text-gold" },
  website_published: { icon: "CheckCircle", color: "text-green-400" },
  website_generation_failed: { icon: "AlertTriangle", color: "text-red-400" },
  website_unpublished: { icon: "EyeOff", color: "text-white/50" },
  website_suspended: { icon: "AlertOctagon", color: "text-red-400" },
  contact_form_received: { icon: "Mail", color: "text-gold" },
  domain_connected: { icon: "Link", color: "text-green-400" },
  domain_dns_delayed: { icon: "Clock", color: "text-amber-400" },
  calendar_ready: { icon: "CalendarCheck", color: "text-gold" },
  content_generated: { icon: "Sparkles", color: "text-gold" },
  content_generation_failed: { icon: "AlertCircle", color: "text-red-400" },
  usage_limit_warning: { icon: "AlertCircle", color: "text-amber-400" },
  usage_limit_reached: { icon: "AlertOctagon", color: "text-red-400" },
  meta_token_expired: { icon: "RefreshCw", color: "text-amber-400" },
  search_console_expired: { icon: "RefreshCw", color: "text-amber-400" },
  monthly_report_ready: { icon: "BarChart3", color: "text-gold" },
  payment_successful: { icon: "CreditCard", color: "text-green-400" },
  payment_failed: { icon: "AlertTriangle", color: "text-red-400" },
  grace_period_started: { icon: "Clock", color: "text-amber-400" },
  grace_period_ending: { icon: "Clock", color: "text-red-400" },
  trial_ending: { icon: "Clock", color: "text-amber-400" },
  trial_expired: { icon: "XCircle", color: "text-red-400" },
  plan_upgraded: { icon: "ArrowUpCircle", color: "text-green-400" },
  plan_downgraded: { icon: "ArrowDownCircle", color: "text-amber-400" },
  subscription_cancelled: { icon: "XCircle", color: "text-white/50" },
  agency_inquiry_sent: { icon: "Send", color: "text-gold" },
};

/** Templates that must always send regardless of user notification preferences. */
export const MANDATORY_EMAIL_TEMPLATES = new Set([
  "welcome",
  "password_reset",
  "payment_successful",
  "payment_failed",
  "grace_period_started",
  "grace_period_ending",
  "trial_ending",
  "trial_expired",
  "plan_downgraded",
  "subscription_cancelled",
  "website_suspended",
  "account_deleted",
]);
