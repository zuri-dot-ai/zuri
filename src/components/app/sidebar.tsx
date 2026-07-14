"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Globe, PenLine, CalendarCheck, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/website", label: "Website", icon: Globe },
  { href: "/content", label: "Content", icon: PenLine },
  { href: "/plan", label: "Plan", icon: CalendarCheck },
  { href: "/agencies", label: "Agencies", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
          className={cn(
            "hidden md:flex md:w-[240px] md:flex-col md:border-r md:border-white/5",
            "bg-gradient-to-b from-background via-background to-surface/50"
          )}
        >
          {/* Logo header */}
          <div className="flex h-16 items-center border-b border-white/5 px-6">
            <Logo size="md" />
          </div>

          {/* Primary nav */}
          <nav className="flex flex-1 flex-col gap-1 p-4">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    "min-h-[44px]",
                    active
                      ? "border-l-4 border-gold bg-gold/10 pl-2 text-gold shadow-[inset_1px_0_0_rgba(201,168,76,0.15)]"
                      : "border-l-4 border-transparent text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[18px] transition-transform duration-200 group-hover:scale-110",
                      active && "text-gold"
                    )}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Settings slot (separate bottom channel) */}
          <div className="border-t border-white/5 p-4">
            <Link
              href="/settings"
              aria-current={pathname.startsWith("/settings") ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                "min-h-[44px]",
                pathname.startsWith("/settings")
                  ? "border-l-4 border-gold bg-gold/10 pl-2 text-gold"
                  : "border-l-4 border-transparent text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
              )}
            >
              <Settings className="size-[18px] transition-transform duration-200 group-hover:scale-110" />
              Settings
            </Link>
          </div>
        </aside>
  );
}