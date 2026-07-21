"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BOTTOM_TABS } from "@/components/app/nav-config";

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch justify-around px-1">
        {BOTTOM_TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium tracking-wide transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,162,39,0.35)]",
                active ? "text-gold" : "text-[var(--text-tertiary)]"
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
