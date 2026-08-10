"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlanUpgradedModal } from "@/components/notifications/PlanUpgradedModal";
import { createClient } from "@/lib/supabase/client";
import { PLAN_CONFIG, isPlanId } from "@/lib/payments/plans";

export function PaymentToast() {
  const params = useSearchParams();
  const router = useRouter();
  const [upgradedModalOpen, setUpgradedModalOpen] = useState(false);
  const [upgradedPlanName, setUpgradedPlanName] = useState("");

  useEffect(() => {
    const payment = params.get("payment");
    const tab = params.get("tab");

    if (payment === "success") {
      const fetchPlan = async () => {
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          let planName = "your new plan";
          if (user) {
            const { data: sub } = await supabase
              .from("subscriptions")
              .select("plan_id")
              .eq("user_id", user.id)
              .maybeSingle();

            if (sub?.plan_id && isPlanId(sub.plan_id)) {
              planName = PLAN_CONFIG[sub.plan_id].name;
            }
          }

          setUpgradedPlanName(planName);
          setUpgradedModalOpen(true);
        } catch {
          setUpgradedPlanName("your new plan");
          setUpgradedModalOpen(true);
        }
      };

      void fetchPlan();
    } else if (payment === "failed" || payment === "error") {
      toast.error(
        "Payment was not completed. Your plan has not changed.",
      );
    }

    if (payment) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("payment");
      router.replace(clean.pathname + (tab ? `?tab=${tab}` : ""), {
        scroll: false,
      });
    }
  }, [params, router]);

  return (
    <PlanUpgradedModal
      open={upgradedModalOpen}
      onOpenChange={setUpgradedModalOpen}
      planName={upgradedPlanName}
    />
  );
}
