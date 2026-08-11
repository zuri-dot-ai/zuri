/**
 * Zuri Notification System — Core Types
 *
 * Priority tiers (highest wins, lower numbers = higher priority):
 *  1. Critical account alerts (payment failed, account suspended)
 *  2. Blocking upgrade prompts (triggered by a blocked action)
 *  3. What's New changelog modal
 *  4. Onboarding coachmarks
 *  5. Feature callouts / marketing nudges
 *
 * Rules enforced by the queue (see notification-queue.ts):
 *  - Only one modal-class item visible at a time.
 *  - Max one "interruption" (modal or coachmark) per session.
 *  - Toasts are exempt — they never queue against modals.
 *  - Corner cards are exempt from the "one interruption" rule but only
 *    one corner card shows at a time (highest priority wins).
 */

export type NotificationPriority = 1 | 2 | 3 | 4 | 5;

export type NotificationSurface = "modal" | "coachmark" | "corner-card" | "toast";

export type NotificationType =
  | "website_generated"
  | "website_published"
  | "website_generation_failed"
  | "website_unpublished"
  | "website_suspended"
  | "website_generation_started"
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
  | "agency_inquiry_sent"
  | "agency_application_received"
  | "custom_site_request_received";

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

export const NOTIFICATION_DISPLAY: Record<NotificationType, { icon: string; color: string }> = {
  website_generated:            { icon: "Globe",          color: "text-gold" },
  website_published:            { icon: "CheckCircle",    color: "text-green-400" },
  website_generation_failed:    { icon: "AlertTriangle",  color: "text-red-400" },
  website_unpublished:          { icon: "EyeOff",         color: "text-white/50" },
  website_suspended:            { icon: "AlertOctagon",   color: "text-red-400" },
  website_generation_started:   { icon: "Loader2",        color: "text-gold" },
  contact_form_received:        { icon: "Mail",           color: "text-gold" },
  domain_connected:             { icon: "Link",           color: "text-green-400" },
  domain_dns_delayed:           { icon: "Clock",          color: "text-amber-400" },
  calendar_ready:               { icon: "CalendarCheck",  color: "text-gold" },
  content_generated:            { icon: "Sparkles",       color: "text-gold" },
  content_generation_failed:    { icon: "AlertCircle",    color: "text-red-400" },
  usage_limit_warning:          { icon: "AlertCircle",    color: "text-amber-400" },
  usage_limit_reached:          { icon: "AlertOctagon",   color: "text-red-400" },
  meta_token_expired:           { icon: "RefreshCw",      color: "text-amber-400" },
  search_console_expired:       { icon: "RefreshCw",      color: "text-amber-400" },
  monthly_report_ready:         { icon: "BarChart3",      color: "text-gold" },
  payment_successful:           { icon: "CreditCard",     color: "text-green-400" },
  payment_failed:               { icon: "AlertTriangle",  color: "text-red-400" },
  grace_period_started:         { icon: "Clock",          color: "text-amber-400" },
  grace_period_ending:          { icon: "Clock",          color: "text-red-400" },
  trial_ending:                 { icon: "Clock",          color: "text-amber-400" },
  trial_expired:                { icon: "XCircle",        color: "text-red-400" },
  plan_upgraded:                { icon: "ArrowUpCircle",  color: "text-green-400" },
  plan_downgraded:              { icon: "ArrowDownCircle",color: "text-amber-400" },
  subscription_cancelled:       { icon: "XCircle",        color: "text-white/50" },
  agency_inquiry_sent:          { icon: "Send",           color: "text-gold" },
  agency_application_received:  { icon: "FileText",       color: "text-gold" },
  custom_site_request_received: { icon: "FileText",       color: "text-gold" },
};

export interface BaseNotification {
  /** Stable unique id — used for dedup and dismissal tracking. */
  id: string;
  priority: NotificationPriority;
  surface: NotificationSurface;
  /**
   * Whether this counts against the "one interruption per session" budget.
   * Modals and coachmarks are interruptions. Corner cards and toasts are not.
   */
  isInterruption: boolean;
  /** Optional: called when the item is dismissed by the user. */
  onDismiss?: () => void;
}

export interface ModalNotification extends BaseNotification {
  surface: "modal";
  isInterruption: true;
  render: () => React.ReactNode;
}

export interface CoachmarkNotification extends BaseNotification {
  surface: "coachmark";
  isInterruption: true;
  targetSelector: string;
  title: string;
  body: string;
  step: number;
  totalSteps: number;
}

export interface CornerCardNotification extends BaseNotification {
  surface: "corner-card";
  isInterruption: false;
  variant: "warning" | "error" | "info";
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export type QueueableNotification =
  | ModalNotification
  | CoachmarkNotification
  | CornerCardNotification;