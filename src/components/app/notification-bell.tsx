"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Compact bell for the mobile topbar — shares state with the sidebar popover via useNotifications. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markAsRead } = useNotifications(8);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      side="bottom"
      label="Notifications"
      trigger={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Notifications"
          aria-expanded={open}
          aria-haspopup="dialog"
          className={cn(
            "relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--bg-elevated)] hover:text-foreground",
            open && "bg-[var(--bg-elevated)] text-gold"
          )}
        >
          <Bell className="size-[18px]" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold leading-none text-[var(--accent-foreground)] ring-2 ring-background"
              aria-label={`${unreadCount} unread notifications`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
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
