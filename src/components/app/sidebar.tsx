"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Globe,
  PenLine,
  CalendarCheck,
  Users,
  Settings,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/website", label: "Website", icon: Globe },
  { href: "/content", label: "Content", icon: PenLine },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/plan", label: "Plan", icon: CalendarCheck },
  { href: "/agencies", label: "Agencies", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-border bg-background md:flex md:w-[240px] md:flex-col">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Logo size="navbar" href="/dashboard" />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
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
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={cn(
            "relative flex min-h-[44px] items-center gap-3 px-3 py-2.5 text-sm font-medium tracking-wide transition-colors",
            pathname.startsWith("/settings")
              ? "bg-muted text-gold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="size-[18px]" strokeWidth={1.75} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
