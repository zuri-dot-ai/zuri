"use client";

/**
 * REPLACEMENT EXAMPLE for src/components/app/TrialEndingBanner.tsx
 *
 * Old: sticky border-b banner pinned under the header, dismissed via
 * dismissForDay() + local state, re-appears next calendar day.
 *
 * New: enqueues a corner-card notification through the shared queue.
 * Same dismiss-for-a-day behavior, but it no longer competes for the
 * top-of-page banner slot, and it automatically yields priority to any
 * higher-tier alert (e.g. GracePeriodBanner's replacement) without any
 * manual "if (inGracePeriod) show this ELSE show that" branching in the
 * layout — the queue handles it.
 */

import { useEffect } from "react";
import { useNotificationQueue } from "@/lib/notifications/notification-queue";
import { freeTierLossSummary } from "@/lib/payments/trials";
import {
  dismissForDay,
  isDismissedForDay,
  PROMPT_KEYS,
} from "@/lib/billing/prompt-dismiss";

interface Props {
  daysLeft: number;
  trialTierName: string;
}

export function TrialEndingAlert({ daysLeft, trialTierName }: Props) {
  const { enqueue } = useNotificationQueue();

  useEffect(() => {
    if (isDismissedForDay(PROMPT_KEYS.trialEndingBannerDay)) return;

    const dayLabel = daysLeft <= 1 ? "1 day" : `${daysLeft} days`;
    const losses = freeTierLossSummary();

    enqueue({
      id: "trial-ending",
      priority: 1, // critical account alert tier
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
  }, [daysLeft, trialTierName, enqueue]);

  return null; // rendering happens via <CornerCardHost /> in NotificationHost
}
