"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Detects a plan/status change (e.g. payment fails → grace period →
 * downgrade, or a mid-session upgrade) without requiring a page refresh.
 * Wraps `useSubscription()` and polls every 5 minutes while the app is open.
 */
export function useSubscriptionMonitor() {
  const { planId, status, isLoading } = useSubscription();
  const [planChanged, setPlanChanged] = useState(false);
  const knownPlanId = useRef(planId);
  const knownStatus = useRef(status);

  useEffect(() => {
    if (!isLoading) {
      knownPlanId.current = planId;
      knownStatus.current = status;
    }
  }, [isLoading, planId, status]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("subscriptions")
        .select("plan_id, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) return;

      if (
        data.plan_id !== knownPlanId.current ||
        data.status !== knownStatus.current
      ) {
        setPlanChanged(true);
        toast.info("Your plan has changed.", {
          description: "Refresh to see your updated features.",
          action: {
            label: "Refresh",
            onClick: () => window.location.reload(),
          },
        });
        knownPlanId.current = data.plan_id;
        knownStatus.current = data.status;
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return { planChanged };
}
