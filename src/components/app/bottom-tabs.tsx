"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Globe,
  PenLine,
  CalendarCheck,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/website", label: "Website", icon: Globe },
  { href: "/content", label: "Content", icon: PenLine },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/plan", label: "Plan", icon: CalendarCheck },
];

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <div className="flex items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium tracking-wide transition-colors",
                active ? "text-gold" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
