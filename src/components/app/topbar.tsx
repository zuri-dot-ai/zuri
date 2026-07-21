"use client";

import { useState, useCallback } from "react";
import { Logo } from "@/components/ui/logo";
import { NotificationBell } from "@/components/app/notification-bell";
import {
  HamburgerButton,
  MobileNavDrawer,
} from "@/components/app/mobile-nav-drawer";

/**
 * Mobile-only top bar: logo + notification bell + gold hamburger.
 */
export function Topbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-5">
        <div className="flex min-w-0 flex-1 items-center py-1">
          <Logo variant="app" href="/dashboard" size="sm" />
        </div>

        <div className="flex items-center gap-1">
          <NotificationBell />
          <HamburgerButton
            open={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
          />
        </div>
      </header>

      <MobileNavDrawer open={drawerOpen} onClose={closeDrawer} />
    </>
  );
}
