"use client";

import { useNotificationsContext } from "@/components/app/notifications-provider";

/**
 * Read notification state from the shared NotificationsProvider.
 * Realtime + fetch run once per app shell — safe for bell + sidebar popover.
 */
export function useNotifications(limit = 8) {
  return useNotificationsContext(limit);
}
