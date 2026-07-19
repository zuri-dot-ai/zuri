"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useUser } from "@/hooks/use-user";
import {
  PRIMARY_NAV,
  WORKSPACE_NAV,
  MARKETPLACE_NAV,
  DRAWER_UTILITY_NAV,
  type NavItem,
} from "@/components/app/nav-config";

function DrawerLink({
  href,
  label,
  icon: Icon,
  onNavigate,
}: NavItem & { onNavigate: () => void }) {
  const pathname = usePathname();
  const active =
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium tracking-[-0.01em] transition-colors",
        active
          ? "bg-[var(--bg-elevated)] text-gold"
          : "text-muted-foreground hover:bg-[var(--bg-elevated)] hover:text-foreground"
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-[55%] w-[2px] -translate-y-1/2 rounded-full bg-gold"
        />
      )}
      <Icon className="size-[18px]" strokeWidth={1.75} />
      {label}
    </Link>
  );
}

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const { user, avatarUrl } = useUser();
  const displayName = user?.full_name || user?.email || "Account";

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const mainNav = [...PRIMARY_NAV, ...WORKSPACE_NAV, ...MARKETPLACE_NAV];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal aria-label="Navigation menu">
          <motion.button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.aside
            className="absolute bottom-0 left-0 top-0 flex w-[80%] max-w-sm flex-col border-r border-border bg-background shadow-[var(--elevation-3)]"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
              <Logo variant="app" size="navbar" href="/dashboard" />
            </div>

            <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-y-contain p-3">
              {mainNav.map((item) => (
                <DrawerLink key={item.href} {...item} onNavigate={onClose} />
              ))}

              <div className="mx-3 my-3 border-t border-border" />

              {DRAWER_UTILITY_NAV.map((item) => (
                <DrawerLink key={item.href} {...item} onNavigate={onClose} />
              ))}
            </nav>

            <div className="shrink-0 border-t border-border p-3">
              <Link
                href="/settings"
                onClick={onClose}
                className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[var(--bg-elevated)]"
              >
                <UserAvatar
                  name={user?.full_name}
                  email={user?.email}
                  src={avatarUrl}
                  size={36}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {displayName}
                  </span>
                  <span className="block text-caption text-[var(--text-tertiary)]">
                    View profile
                  </span>
                </span>
              </Link>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Animated gold hamburger ↔ X (~200ms) — mobile only, top-right */
export function HamburgerButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex size-9 items-center justify-center rounded-md text-gold transition-colors hover:bg-gold/10 md:hidden"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
    >
      <span className="relative block size-5" aria-hidden>
        <span
          className={cn(
            "absolute left-0.5 top-[5px] h-[1.5px] w-4 rounded-full bg-current transition-all duration-200 ease-out",
            open && "top-[9px] rotate-45"
          )}
        />
        <span
          className={cn(
            "absolute left-0.5 top-[9px] h-[1.5px] w-4 rounded-full bg-current transition-all duration-200 ease-out",
            open && "opacity-0"
          )}
        />
        <span
          className={cn(
            "absolute left-0.5 top-[13px] h-[1.5px] w-4 rounded-full bg-current transition-all duration-200 ease-out",
            open && "top-[9px] -rotate-45"
          )}
        />
      </span>
    </button>
  );
}
