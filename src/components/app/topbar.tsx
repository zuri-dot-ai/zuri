"use client";

import { useState, useCallback } from "react";
import { Logo } from "@/components/ui/logo";
import {
  HamburgerButton,
  MobileNavDrawer,
} from "@/components/app/mobile-nav-drawer";

/**
 * Mobile-only top bar: logo + gold hamburger.
 * Notifications live in the drawer / sidebar utility nav.
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

        <HamburgerButton
          open={drawerOpen}
          onClick={() => setDrawerOpen((v) => !v)}
        />
      </header>

      <MobileNavDrawer open={drawerOpen} onClose={closeDrawer} />
    </>
  );
}
