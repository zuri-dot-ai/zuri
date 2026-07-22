import { Lock, ArrowUpCircle } from "lucide-react";
import Link from "next/link";
import { PLAN_CONFIG, type PlanId } from "@/lib/payments/plans";

interface Props {
  /** Human-readable feature name, e.g. "Content calendar" */
  feature: string;
  requiredPlan: PlanId | string;
  /** Mini inline version vs full card. */
  compact?: boolean;
  className?: string;
}

/**
 * Used everywhere a feature is gated by plan. Never show a raw 403 error —
 * always render this instead.
 */
export function UpgradePrompt({
  feature,
  requiredPlan,
  compact = false,
  className,
}: Props) {
  const plan = PLAN_CONFIG[requiredPlan as PlanId];
  const planName = plan?.name ?? requiredPlan;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className ?? ""}`}
      >
        <Lock className="size-3" />
        {planName} plan
        <Link href="/pricing" className="ml-1 text-gold underline">
          Upgrade
        </Link>
      </span>
    );
  }

  return (
    <div
      className={`rounded-xl border border-border bg-white/[0.02] p-6 text-center ${className ?? ""}`}
    >
      <ArrowUpCircle className="mx-auto mb-3 size-8 text-gold" />
      <h3 className="mb-2 font-heading text-lg text-foreground">{feature}</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        This feature is available on the {planName} plan.
      </p>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-[var(--accent-foreground)] hover:brightness-110"
      >
        Upgrade to {planName}
      </Link>
    </div>
  );
}
