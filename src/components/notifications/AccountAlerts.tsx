"use client";

/**
 * Replaces the old `slot="banners"` block in src/app/(app)/layout.tsx:
 *
 *   {inGracePeriod && <GracePeriodBanner gracePeriodEnd={gracePeriodEnd} />}
 *   {!inGracePeriod && <TrialPrompts {...trialProps} slot="banners" />}
 *
 * which rendered GracePeriodBanner, TrialEndingBanner, and TrialEndedNotice
 * as sticky top-of-page banners.
 *
 * This component renders nothing itself — it just enqueues the relevant
 * corner-card notification(s) via the shared queue. Actual rendering
 * happens through <CornerCardHost /> (already mounted in NotificationHost).
 *
 * Mount this once inside <NotificationQueueProvider>, alongside
 * <NotificationHost />, passing the same data the old banners used.
 */

import { useEffect } from "react";
import { useNotificationQueue } from "@/lib/notifications/notification-queue";
import { freeTierLossSummary } from "@/lib/payments/trials";
import {
  dismissForDay,
  isDismissedForDay,
  PROMPT_KEYS,
} from "@/lib/billing/prompt-dismiss";

interface AccountAlertsProps {
  inGracePeriod: boolean;
  gracePeriodEnd: string;
  trialing: boolean;
  daysLeft: number | null;
  endingSoon: boolean;
  showEnded: boolean;
  trialEndedAt: string | null;
  trialTierName: string;
}

export function AccountAlerts({
  inGracePeriod,
  gracePeriodEnd,
  daysLeft,
  endingSoon,
  showEnded,
  trialEndedAt,
  trialTierName,
}: AccountAlertsProps) {
  const { enqueue } = useNotificationQueue();

  // Grace period — highest priority account alert (payment overdue).
  useEffect(() => {
    if (!inGracePeriod) return;

    enqueue({
      id: "grace-period",
      priority: 1,
      surface: "corner-card",
      isInterruption: false,
      variant: "error",
      title: "Update your payment method",
      body: `Your subscription is in a grace period. Update your payment method by ${gracePeriodEnd} to avoid losing access.`,
      actionLabel: "Update payment",
      onAction: () => {
        window.location.href = "/settings?tab=billing";
      },
      // No onDismiss dismissForDay here on purpose — an unpaid grace period
      // should keep reappearing each session until resolved, not be
      // suppressible for a full day like a soft nudge would be.
    });
  }, [inGracePeriod, gracePeriodEnd, enqueue]);

  // Trial ending soon (<=3 days) — dismissible for the day.
  useEffect(() => {
    if (inGracePeriod || !endingSoon || daysLeft === null) return;
    if (isDismissedForDay(PROMPT_KEYS.trialEndingBannerDay)) return;

    const dayLabel = daysLeft <= 1 ? "1 day" : `${daysLeft} days`;
    const losses = freeTierLossSummary();

    enqueue({
      id: "trial-ending",
      priority: 1,
      surface: "corner-card",
      isInterruption: false,
      variant: "warning",
      title: `Your ${trialTierName} trial ends in ${dayLabel}`,
      body: `You'll move to Free automatically — no charge. You'll lose: ${losses
        .slice(0, 2)
        .join("; ")
        .toLowerCase()}${losses.length > 2 ? "; and more" : ""}.`,
      actionLabel: "Upgrade to keep access",
      onAction: () => {
        window.location.href = "/settings?tab=billing";
      },
      onDismiss: () => dismissForDay(PROMPT_KEYS.trialEndingBannerDay),
    });
  }, [inGracePeriod, endingSoon, daysLeft, trialTierName, enqueue]);

  // Trial already ended, now on Free — one-time-ish notice, dismissible for the day.
  useEffect(() => {
    if (inGracePeriod || !showEnded || !trialEndedAt) return;
    if (isDismissedForDay(PROMPT_KEYS.trialEndedNoticeDay)) return;

    enqueue({
      id: "trial-ended",
      priority: 2,
      surface: "corner-card",
      isInterruption: false,
      variant: "info",
      title: "Your trial has ended",
      body: "You're now on the Free plan. Upgrade anytime to unlock premium features again.",
      actionLabel: "See plans",
      onAction: () => {
        window.location.href = "/settings?tab=billing";
      },
      onDismiss: () => dismissForDay(PROMPT_KEYS.trialEndedNoticeDay),
    });
  }, [inGracePeriod, showEnded, trialEndedAt, enqueue]);

  return null;
}
