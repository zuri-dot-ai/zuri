"use client";

import type { ReactNode } from "react";
import { NotificationsProvider } from "@/components/app/notifications-provider";

/** Client-only providers for the authenticated app shell. */
export function AppShellProviders({ children }: { children: ReactNode }) {
  return <NotificationsProvider>{children}</NotificationsProvider>;
}
