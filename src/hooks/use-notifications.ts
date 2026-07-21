"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import type { Notification } from "@/lib/notifications/types";

const PREVIEW_LIMIT = 8;

/**
 * Shared notifications data source for the sidebar popover and topbar bell.
 * Uses Supabase Realtime so new notifications appear live without polling.
 * Fixes the previous is_read/read_at column mismatch bug.
 */
export function useNotifications(limit: number = PREVIEW_LIMIT) {
  const { user } = useUser();
  const supabase = createClient();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const unreadCount = items.filter((n) => !n.is_read).length;

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    setItems((data as Notification[]) ?? []);
    setLoading(false);
  }, [user?.id, supabase, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
          setItems((prev) => [payload.new as Notification, ...prev].slice(0, limit));
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
          setItems((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, limit]);

  const markAsRead = useCallback(
    async (id: string) => {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
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

  return { items, loading, unreadCount, refresh, markAsRead, markAllAsRead };
}
