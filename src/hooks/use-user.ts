"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/types/database";

/** Client-side hook for the current user + their Zuri profile row */
export function useUser() {
  const [user, setUser] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (active) {
          setUser(null);
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
        setUser((data as ProfileRow | null) ?? null);
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

  return { user, loading };
}
