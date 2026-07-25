"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/types/database";

function metaAvatarUrl(meta: Record<string, unknown> | undefined): string | null {
  if (!meta) return null;
  const url = meta.avatar_url || meta.picture;
  return typeof url === "string" && url.length > 0 ? url : null;
}

/** Client-side hook for the current user + their Zuri profile row */
export function useUser() {
  const [user, setUser] = useState<ProfileRow | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let active = true;
    let seq = 0;

    async function load() {
      const requestId = ++seq;
      const { data: auth } = await supabase.auth.getUser();
      if (!active || requestId !== seq) return;

      if (!auth.user) {
        setUser(null);
        setAvatarUrl(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (!active || requestId !== seq) return;

      const profile = (data as ProfileRow | null) ?? null;
      const fromMeta = metaAvatarUrl(
        auth.user.user_metadata as Record<string, unknown> | undefined
      );
      setUser(profile);
      setAvatarUrl(profile?.avatar_url || fromMeta || null);
      setLoading(false);
    }

    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    function onVisible() {
      if (document.visibilityState === "visible") void load();
    }
    function onFocus() {
      void load();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [supabase]);

  return { user, avatarUrl, loading };
}
