"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HelpCircle, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import {
  PRIMARY_NAV,
  WORKSPACE_NAV,
  MARKETPLACE_NAV,
  type NavItem,
} from "@/components/app/nav-config";

function NavLink({ href, label, icon: Icon }: NavItem) {
  const pathname = usePathname();
  const active =
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-[40px] items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium tracking-[-0.01em] transition-colors",
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

function NavGroup({
  label,
  items,
}: {
  label?: string;
  items: NavItem[];
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <p className="px-3 pb-1.5 pt-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
          {label}
        </p>
      )}
      {items.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </div>
  );
}

function SidebarAvatarMenu() {
  const { user } = useUser();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initial = (user?.full_name || user?.email || "Z").charAt(0).toUpperCase();
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
        className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors hover:bg-[var(--bg-elevated)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-semibold text-[var(--accent-foreground)]">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {name}
          </span>
          <span className="block text-caption text-[var(--text-tertiary)]">
            Account
          </span>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-md border border-border bg-[var(--bg-elevated)] py-1 shadow-[var(--elevation-3)]"
        >
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-[var(--bg-secondary)] hover:text-foreground"
          >
            <Settings className="size-4" strokeWidth={1.75} />
            Settings
          </Link>
          <Link
            href="/help"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-[var(--bg-secondary)] hover:text-foreground"
          >
            <HelpCircle className="size-4" strokeWidth={1.75} />
            Help
          </Link>
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

export function Sidebar() {
  return (
    <aside className="hidden border-r border-border bg-background md:flex md:w-[240px] md:flex-col">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Logo variant="app" size="navbar" href="/dashboard" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <NavGroup items={PRIMARY_NAV} />
        <NavGroup label="Workspace" items={WORKSPACE_NAV} />
        <div className="mx-3 my-3 border-t border-border" />
        <NavGroup items={MARKETPLACE_NAV} />
      </nav>

      <div className="sidebar-foot border-t border-border p-3">
        <SidebarAvatarMenu />
      </div>
    </aside>
  );
}
