"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, LogOut, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useTheme } from "@/components/theme-provider";
import { Logo } from "@/components/ui/logo";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  HamburgerButton,
  MobileNavDrawer,
} from "@/components/app/mobile-nav-drawer";
import { cn } from "@/lib/utils";

interface NotifRow {
  id: string;
  title: string;
  body: string | null;
  action_url: string | null;
  created_at: string;
  read_at: string | null;
}

export function Topbar({ businessName }: { businessName?: string }) {
  const { user, avatarUrl } = useUser();
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [items, setItems] = useState<NotifRow[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const unread = items.filter((i) => !i.read_at).length;

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, action_url, created_at, read_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);
      if (active) setItems((data as NotifRow[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, [user?.id, supabase]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
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
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          <HamburgerButton
            open={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
          />
          <span className="md:hidden">
            <Logo variant="app" href="/dashboard" size="sm" />
          </span>
          {businessName && (
            <span className="hidden truncate text-sm text-muted-foreground md:inline">
              {businessName}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="icon-btn"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="size-5" strokeWidth={1.75} />
            ) : (
              <Moon className="size-5" strokeWidth={1.75} />
            )}
          </button>

          <div className="relative" ref={panelRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="icon-btn relative"
              aria-label="Notifications"
              aria-expanded={open}
            >
              <Bell className="size-5" strokeWidth={1.75} />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-gold" />
              )}
            </button>
            <div
              className={cn(
                "notif-panel absolute right-0 top-full z-50 mt-2 w-[320px] rounded-md border border-border bg-[var(--bg-elevated)] shadow-[var(--elevation-3)]",
                open && "open"
              )}
            >
              <div className="notif-panel-head">
                <h4>Notifications</h4>
                <Link href="/notifications" onClick={() => setOpen(false)}>
                  View all
                </Link>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    You&apos;re all caught up — no notifications yet.
                  </p>
                ) : (
                  items.map((n) => (
                    <Link
                      key={n.id}
                      href={n.action_url || "/notifications"}
                      onClick={() => setOpen(false)}
                      className="notif-item block border-b border-border px-4 py-3 hover:bg-[var(--bg-secondary)]"
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="icon-btn"
            aria-label="Sign out"
          >
            <LogOut className="size-5" strokeWidth={1.75} />
          </button>

          <UserAvatar
            name={user?.full_name}
            email={user?.email}
            src={avatarUrl}
            size={32}
          />
        </div>
      </header>

      <MobileNavDrawer open={drawerOpen} onClose={closeDrawer} />
    </>
  );
}
