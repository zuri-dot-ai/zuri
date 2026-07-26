"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLAN_CONFIG, PlanId, PlanLimits, isPlanId } from "@/lib/payments/plans";

interface SubscriptionState {
  planId: PlanId;
  planName: string;
  status: string;
  limits: PlanLimits;
  periodEnd: string | null;
  trialEndsAt: string | null;
  trialTier: string | null;
  trialsUsed: string[];
  isLoading: boolean;
}

export function useSubscription(): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({
    planId: "free",
    planName: "Free",
    status: "active",
    limits: PLAN_CONFIG.free.limits,
    periodEnd: null,
    trialEndsAt: null,
    trialTier: null,
    trialsUsed: [],
    isLoading: true,
  });

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
        return;
      }

      const { data } = await supabase
        .from("subscriptions")
        .select(
          "plan_id, status, current_period_end, trial_ends_at, trial_tier, trials_used"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;

      const planId: PlanId =
        data?.status === "active" ||
        data?.status === "grace_period" ||
        data?.status === "trialing"
          ? isPlanId(data?.plan_id)
            ? data.plan_id
            : "free"
          : "free";

      const periodEnd =
        data?.status === "trialing" && data?.trial_ends_at
          ? data.trial_ends_at
          : (data?.current_period_end ?? null);

      setState({
        planId,
        planName: PLAN_CONFIG[planId].name,
        status: data?.status ?? "active",
        limits: PLAN_CONFIG[planId].limits,
        periodEnd,
        trialEndsAt: data?.trial_ends_at ?? null,
        trialTier: data?.trial_tier ?? null,
        trialsUsed: data?.trials_used ?? [],
        isLoading: false,
      });
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return state;
}
