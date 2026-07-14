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
  isLoading: boolean;
}

export function useSubscription(): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({
    planId: "free",
    planName: "Free",
    status: "active",
    limits: PLAN_CONFIG.free.limits,
    periodEnd: null,
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
        .select("plan_id, status, current_period_end")
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

      setState({
        planId,
        planName: PLAN_CONFIG[planId].name,
        status: data?.status ?? "active",
        limits: PLAN_CONFIG[planId].limits,
        periodEnd: data?.current_period_end ?? null,
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
