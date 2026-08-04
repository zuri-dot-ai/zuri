"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import type { Notification } from "@/lib/notifications/types";

const FETCH_LIMIT = 50;

type NotificationsContextValue = {
  items: Notification[];
  loading: boolean;
  unreadCount: number;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const unreadCount = items.filter((n) => !n.is_read).length;

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(FETCH_LIMIT);

    if (error) {
      console.warn("[notifications] fetch failed:", error.message);
      setItems([]);
    } else {
      setItems((data as Notification[]) ?? []);
    }
    setLoading(false);
  }, [user?.id, supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Single Realtime channel for the whole app shell — avoids duplicate
  // subscriptions when both NotificationBell and NotificationsPopover mount.
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setItems((prev) => [payload.new as Notification, ...prev].slice(0, FETCH_LIMIT));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setItems((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, supabase]);

  const markAsRead = useCallback(
    async (id: string) => {
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    [supabase]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }, [user?.id, supabase]);

  const value = useMemo(
    () => ({
      items,
      loading,
      unreadCount,
      refresh,
      markAsRead,
      markAllAsRead,
    }),
    [items, loading, unreadCount, refresh, markAsRead, markAllAsRead]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext(limit?: number) {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within NotificationsProvider"
    );
  }
  if (limit === undefined) return ctx;
  return {
    ...ctx,
    items: ctx.items.slice(0, limit),
  };
}
