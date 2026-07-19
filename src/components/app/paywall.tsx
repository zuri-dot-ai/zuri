"use client";

import { Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { SubscriptionPlan } from "@/types/database";
import { PLAN_RANK } from "@/lib/payments/plans";

interface PaywallProps {
  /** The minimum plan needed */
  required: "pro" | "growth" | "premium";
  /** The current user plan */
  current: SubscriptionPlan;
  /** Feature name shown in the lock message */
  feature: string;
  /** Optional benefit copy for contextual upgrade */
  benefit?: string;
  /** Render children if access is granted */
  children: React.ReactNode;
}

export function Paywall({
  required,
  current,
  feature,
  benefit,
  children,
}: PaywallProps) {
  const router = useRouter();
  const hasAccess = PLAN_RANK[current] >= PLAN_RANK[required];

  if (hasAccess) return <>{children}</>;

  const planLabel =
    required === "premium" ? "Premium" : required === "growth" ? "Growth" : "Pro";

  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-border bg-[var(--bg-secondary)] px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-border bg-[var(--bg-elevated)]">
        <Lock className="size-6 text-gold" strokeWidth={1.75} />
      </div>
      <h3 className="mt-5 text-h2 font-semibold tracking-[-0.015em]">{feature}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {benefit ?? (
          <>
            {feature} is available on the{" "}
            <span className="font-medium text-foreground">{planLabel} plan</span>{" "}
            and above. Upgrade to unlock it.
          </>
        )}
      </p>
      <Button
        className="mt-7"
        onClick={() =>
          router.push(`/settings?tab=billing&upgrade=${required}&feature=${encodeURIComponent(feature)}`)
        }
      >
        <Zap className="size-4" /> Upgrade to {planLabel}
      </Button>
    </div>
  );
}
