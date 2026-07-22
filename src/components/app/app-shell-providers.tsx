"use client";

import type { ReactNode } from "react";
import { NotificationsProvider } from "@/components/app/notifications-provider";
import { SessionExpiredModal } from "@/components/app/SessionExpiredModal";
import { useSessionMonitor } from "@/hooks/use-session-monitor";
import { useSubscriptionMonitor } from "@/hooks/use-subscription-monitor";

/** Client-only providers for the authenticated app shell. */
export function AppShellProviders({ children }: { children: ReactNode }) {
  const { expired, resume, dismiss } = useSessionMonitor();
  useSubscriptionMonitor();

  return (
    <NotificationsProvider>
      {children}
      <SessionExpiredModal
        open={expired}
        onResume={resume}
        onDismiss={dismiss}
      />
    </NotificationsProvider>
  );
}
