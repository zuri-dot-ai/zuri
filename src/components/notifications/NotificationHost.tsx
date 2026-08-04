"use client";

import { useEffect } from "react";
import { useWhatsNew } from "@/hooks/use-whats-new";
import { WhatsNewModal } from "./WhatsNewModal";
import { CornerCardHost } from "./CornerCard";
import { useNotificationQueue } from "@/lib/notifications/notification-queue";

/**
 * Mount this once inside NotificationQueueProvider, near the root of the
 * (app) layout — replaces the old scattered banner rendering
 * (TrialEndingBanner / GracePeriodBanner top-of-page pattern).
 *
 * It does NOT replace OfflineBanner or ConsentBanner — those are
 * system-status / legal notices, not "content" notifications, and are
 * fine to leave as-is (see brainstorm notes on why account alerts moved
 * to corner cards but these two stayed put).
 */
export function NotificationHost({ userId }: { userId: string | null }) {
  const { shouldShow, entries, latestVersion, markDismissed } =
    useWhatsNew(userId);
  const { enqueue, activeInterruption, dismissActiveInterruption } =
    useNotificationQueue();

  useEffect(() => {
    if (!shouldShow || !latestVersion || entries.length === 0) return;

    enqueue({
      id: `whats-new-${latestVersion}`,
      priority: 3,
      surface: "modal",
      isInterruption: true,
      render: () => null, // WhatsNewModal renders itself below; this entry just reserves the queue slot
    });
  }, [shouldShow, latestVersion, entries.length, enqueue]);

  const isWhatsNewActive =
    activeInterruption?.id === `whats-new-${latestVersion}`;

  if (!userId) return <CornerCardHost />;

  return (
    <>
      <WhatsNewModal
        open={isWhatsNewActive}
        onOpenChange={(open) => {
          if (!open) dismissActiveInterruption();
        }}
        entries={entries}
        latestVersion={latestVersion ?? ""}
        userId={userId}
        onDismissed={markDismissed}
      />
      <CornerCardHost />
    </>
  );
}
