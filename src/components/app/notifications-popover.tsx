"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type NotificationsPopoverProps = {
  collapsed?: boolean;
  className?: string;
};

export function NotificationsPopover({
  collapsed = false,
  className,
}: NotificationsPopoverProps) {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markAsRead } = useNotifications(8);
  const active = open;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      side="right"
      label="Notifications"
      className={className}
      trigger={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={collapsed ? "Notifications" : undefined}
          aria-label="Notifications"
          aria-expanded={open}
          aria-haspopup="dialog"
          className={cn(
            "relative flex min-h-[40px] w-full items-center rounded-md text-sm font-medium tracking-[-0.01em] transition-colors",
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
          <span className="relative shrink-0">
            <Bell className="size-[18px]" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span
                className="absolute -right-1.5 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-gold px-1 text-[9px] font-semibold leading-none text-[var(--accent-foreground)] ring-2 ring-background"
                aria-label={`${unreadCount} unread notifications`}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          <span
            className={cn(
              "truncate transition-opacity duration-200",
              collapsed ? "sr-only" : "opacity-100"
            )}
          >
            Notifications
          </span>
        </button>
      }
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h4 className="font-heading text-base font-medium tracking-[0.01em]">
          Notifications
        </h4>
        <Link
          href="/notifications"
          onClick={() => setOpen(false)}
          className="text-xs font-medium text-gold hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="max-h-80 overflow-y-auto overscroll-y-contain">
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            You&apos;re all caught up — no notifications yet.
          </p>
        ) : (
          items.map((n) => (
            <Link
              key={n.id}
              href={n.action_url || "/notifications"}
              onClick={() => {
                if (!n.is_read) markAsRead(n.id);
                setOpen(false);
              }}
              className={cn(
                "block border-b border-border px-4 py-3 last:border-b-0 hover:bg-[var(--bg-secondary)]",
                !n.is_read && "bg-[var(--bg-elevated)]/40"
              )}
            >
              <p className="truncate text-sm font-medium text-foreground" title={n.title}>
                {n.title}
              </p>
              {n.body && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {n.body}
                </p>
              )}
            </Link>
          ))
        )}
      </div>
    </Popover>
  );
}
