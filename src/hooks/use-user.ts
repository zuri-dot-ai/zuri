"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRow } from "@/types/database";

/** Client-side hook for the current user + their Zuri profile row */
export function useUser() {
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (active) { setUser(null); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", auth.user.id)
        .single();
      if (active) { setUser(data as UserRow | null); setLoading(false); }
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [supabase]);

  return { user, loading };
}