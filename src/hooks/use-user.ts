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

    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (active) {
          setUser(null);
          setAvatarUrl(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (active) {
        const profile = (data as ProfileRow | null) ?? null;
        const fromMeta = metaAvatarUrl(
          auth.user.user_metadata as Record<string, unknown> | undefined
        );
        setUser(profile);
        setAvatarUrl(profile?.avatar_url || fromMeta || null);
        setLoading(false);
      }
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, avatarUrl, loading };
}
