"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Globe,
  PenLine,
  Users,
  Settings,
  BarChart3,
  Bell,
  HelpCircle,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

const PRIMARY = [{ href: "/dashboard", label: "Home", icon: Home }];

const BUILD_GROW = [
  { href: "/website", label: "Website", icon: Globe },
  { href: "/content", label: "Content", icon: PenLine },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/plan", label: "Plan", icon: CalendarCheck },
];

const MARKETPLACE = [
  { href: "/agencies", label: "Agency Marketplace", icon: Users },
];

const UTILITY = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle },
];

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
}) {
  const pathname = usePathname();
  const active =
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-[44px] items-center gap-3 px-3 py-2.5 text-sm font-medium tracking-wide transition-colors",
        active
          ? "bg-muted text-gold"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 bg-gold"
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
  items: { href: string; label: string; icon: React.ElementType }[];
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <p className="px-3 pb-1 pt-3 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
          {label}
        </p>
      )}
      {items.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden border-r border-border bg-background md:flex md:w-[240px] md:flex-col">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Logo size="navbar" href="/dashboard" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <NavGroup items={PRIMARY} />
        <NavGroup label="Build & grow" items={BUILD_GROW} />
        <NavGroup label="Marketplace" items={MARKETPLACE} />
      </nav>

      <div className="sidebar-foot border-t border-border p-3">
        <NavGroup items={UTILITY} />
      </div>
    </aside>
  );
}
