"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChangelogEntry } from "@/components/notifications/WhatsNewModal";

interface UseWhatsNewResult {
  shouldShow: boolean;
  entries: ChangelogEntry[];
  latestVersion: string | null;
  loading: boolean;
  markDismissed: () => void;
}

/**
 * Determines whether the What's New modal should show for the current user:
 * fetches unseen changelog entries and compares against their last-seen
 * version in Supabase. Designed to fail closed (never show) on any error,
 * since a missing "what's new" is far less costly than an intrusive bug.
 */
export function useWhatsNew(userId: string | null): UseWhatsNewResult {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [shouldShow, setShouldShow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function run() {
      const supabase = createClient();

      try {
        const [{ data: changelogEntries }, { data: dismissal }] =
          await Promise.all([
            supabase
              .from("changelog_entries")
              .select("id, version, title, description, tag, media_url")
              .order("published_at", { ascending: false })
              .limit(10),
            supabase
              .from("user_changelog_dismissals")
              .select("last_seen_version")
              .eq("user_id", userId)
              .maybeSingle(),
          ]);

        if (cancelled) return;

        if (!changelogEntries || changelogEntries.length === 0) {
          setShouldShow(false);
          setLoading(false);
          return;
        }

        const newest = changelogEntries[0].version;
        setEntries(changelogEntries);
        setLatestVersion(newest);

        const lastSeen = dismissal?.last_seen_version ?? null;
        setShouldShow(lastSeen !== newest);
      } catch (err) {
        console.error("useWhatsNew: failed to resolve changelog state", err);
        if (!cancelled) setShouldShow(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    shouldShow,
    entries,
    latestVersion,
    loading,
    markDismissed: () => setShouldShow(false),
  };
}
