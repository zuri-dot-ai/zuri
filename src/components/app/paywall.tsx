"use client";

import { Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { SubscriptionPlan } from "@/types/database";

interface PaywallProps {
  /** The minimum plan needed */
  required: "starter" | "growth";
  /** The current user plan */
  current: SubscriptionPlan;
  /** Feature name shown in the lock message */
  feature: string;
  /** Render children if access is granted */
  children: React.ReactNode;
}

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  starter: 1,
  growth: 2,
};

export function Paywall({ required, current, feature, children }: PaywallProps) {
  const router = useRouter();
  const hasAccess = PLAN_RANK[current] >= PLAN_RANK[required];

  if (hasAccess) return <>{children}</>;

  const planLabel = required === "growth" ? "Growth" : "Starter";

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-gold/25 bg-gold/[0.04] px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-gold/10">
        <Lock className="size-6 text-gold" />
      </div>
      <h3 className="mt-5 font-heading text-2xl font-semibold">{feature}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {feature} is available on the{" "}
        <span className="font-medium text-foreground">{planLabel} plan</span> and above.
        Upgrade to unlock it.
      </p>
      <Button className="mt-7" onClick={() => router.push("/settings?tab=billing")}>
        <Zap className="size-4" /> Upgrade to {planLabel}
      </Button>
    </div>
  );
}