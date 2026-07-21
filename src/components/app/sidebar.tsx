"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PRIMARY_NAV,
  WORKSPACE_NAV,
  MARKETPLACE_NAV,
  UTILITY_NAV,
  type NavItem,
} from "@/components/app/nav-config";
import { NotificationsPopover } from "@/components/app/notifications-popover";

const STORAGE_KEY = "zuri-sidebar-collapsed";

function NavLink({
  href,
  label,
  icon: Icon,
  collapsed,
}: NavItem & { collapsed: boolean }) {
  const pathname = usePathname();
  const active =
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      prefetch
      title={collapsed ? label : undefined}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-[40px] items-center rounded-md text-sm font-medium tracking-[-0.01em] transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,162,39,0.35)] focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
        active
          ? "bg-[var(--bg-elevated)] text-gold"
          : "text-muted-foreground hover:bg-[var(--bg-elevated)] hover:text-foreground"
      )}
    >
      {active && !collapsed && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-[55%] w-[2px] -translate-y-1/2 rounded-full bg-gold"
        />
      )}
      <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
      <span
        className={cn(
          "truncate transition-opacity duration-200",
          collapsed ? "sr-only" : "opacity-100"
        )}
      >
        {label}
      </span>
    </Link>
  );
}

function NavGroup({
  label,
  items,
  collapsed,
}: {
  label?: string;
  items: NavItem[];
  collapsed: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && !collapsed && (
        <p className="px-3 pb-1.5 pt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
          {label}
        </p>
      )}
      {label && collapsed && (
        <div className="mx-auto my-2 h-px w-6 bg-border" aria-hidden />
      )}
      {items.map((item) =>
        item.href === "/notifications" ? (
          <NotificationsPopover key={item.href} collapsed={collapsed} />
        ) : (
          <NavLink key={item.href} {...item} collapsed={collapsed} />
        )
      )}
    </div>
  );
}

function SidebarAvatarMenu({ collapsed }: { collapsed: boolean }) {
  const { user, avatarUrl } = useUser();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const name = user?.full_name || user?.email || "Account";

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center rounded-md text-left transition-all active:scale-[0.98] hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,162,39,0.35)]",
          collapsed ? "justify-center px-1 py-2" : "gap-3 px-2 py-2"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        title={collapsed ? name : undefined}
      >
        <UserAvatar
          name={user?.full_name}
          email={user?.email}
          src={avatarUrl}
          size={32}
        />
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {name}
            </span>
            <span className="block text-caption text-[var(--text-tertiary)]">
              Account
            </span>
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mb-2 overflow-hidden rounded-md border border-border bg-[var(--bg-elevated)] py-1 shadow-[var(--elevation-3)]",
            collapsed
              ? "bottom-0 left-full ml-2 w-44"
              : "bottom-full left-0 right-0"
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-[var(--bg-secondary)] hover:text-foreground"
          >
            <LogOut className="size-4" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

const HOVER_EXPAND_DELAY_MS = 350;
const HOVER_COLLAPSE_DELAY_MS = 150;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  // Hover-expand is a purely visual, temporary overlay on top of the
  // pinned `collapsed` state — it never touches localStorage or flips the
  // click-to-pin toggle, and only engages after a short intentional delay
  // so an accidental mouse-over doesn't cause flicker (Linear/Vercel
  // pattern).
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
    setHoverExpanded(false);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  }

  function handleMouseEnter() {
    if (!collapsed) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(
      () => setHoverExpanded(true),
      HOVER_EXPAND_DELAY_MS
    );
  }

  function handleMouseLeave() {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (!hoverExpanded) return;
    hoverTimerRef.current = setTimeout(
      () => setHoverExpanded(false),
      HOVER_COLLAPSE_DELAY_MS
    );
  }

  const visuallyExpanded = !collapsed || hoverExpanded;
  // While hover-expanded, the outer <aside> keeps its pinned collapsed
  // width (no layout shift for the main content) and the inner panel
  // absolutely overlays on top at full width — the Linear/Vercel rail
  // pattern. When pinned open/closed (no hover), inner panel just tracks
  // the outer box 1:1.
  const overlaying = collapsed && hoverExpanded;

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative hidden h-full shrink-0 md:flex",
        "transition-[width] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        collapsed ? "w-[72px]" : "w-[240px]",
        !ready && "transition-none"
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col border-r border-border bg-background",
          "transition-[width] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          overlaying
            ? "absolute left-0 top-0 z-40 w-[240px] shadow-[var(--elevation-3)]"
            : "w-full"
        )}
      >
      {/* Logo row + underline + collapse toggle */}
      <div
        className={cn(
          "flex shrink-0 flex-col px-4 pt-5",
          visuallyExpanded ? "pb-4" : "items-center pb-3"
        )}
      >
        {!visuallyExpanded ? (
          <>
            <Link
              href="/dashboard"
              aria-label="Zuri home"
              className="font-heading text-lg font-medium tracking-[0.12em] text-[var(--wood-word)] transition-colors"
            >
              Z
            </Link>
            <span
              aria-hidden
              className="mt-3 h-[2px] w-10 rounded-full bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_14px_rgba(201,162,39,0.35)]"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggle}
                  className="mt-3 flex items-center justify-center rounded-md p-2 text-muted-foreground transition-all active:scale-[0.92] hover:bg-[var(--bg-elevated)] hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,162,39,0.35)]"
                  aria-label="Expand sidebar"
                >
                  <PanelLeft className="size-[18px]" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <div className="flex w-full items-center justify-between gap-2">
              <Logo variant="app" size="navbar" href="/dashboard" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggle}
                    className="flex shrink-0 items-center justify-center rounded-md p-2 text-muted-foreground transition-all active:scale-[0.92] hover:bg-[var(--bg-elevated)] hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,162,39,0.35)]"
                    aria-label="Collapse sidebar"
                  >
                    <PanelLeftClose className="size-[18px]" strokeWidth={1.75} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Collapse sidebar</TooltipContent>
              </Tooltip>
            </div>
            <span
              aria-hidden
              className="mt-3 h-[2px] w-24 rounded-full bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_14px_rgba(201,162,39,0.35)]"
            />
          </>
        )}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain p-2">
        <NavGroup items={PRIMARY_NAV} collapsed={!visuallyExpanded} />
        <NavGroup
          label="Workspace"
          items={WORKSPACE_NAV}
          collapsed={!visuallyExpanded}
        />
        <div
          className={cn(
            "my-3 border-t border-border",
            visuallyExpanded ? "mx-3" : "mx-2"
          )}
        />
        <NavGroup items={MARKETPLACE_NAV} collapsed={!visuallyExpanded} />
        <div
          className={cn(
            "my-3 border-t border-border",
            visuallyExpanded ? "mx-3" : "mx-2"
          )}
        />
        <NavGroup items={UTILITY_NAV} collapsed={!visuallyExpanded} />
      </nav>

      <div className="sidebar-foot shrink-0 border-t border-border p-2">
        <SidebarAvatarMenu collapsed={!visuallyExpanded} />
      </div>
      </div>
    </aside>
  );
}
