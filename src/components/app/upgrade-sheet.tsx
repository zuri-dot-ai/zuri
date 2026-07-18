"use client";

import { Lock, Zap, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Locked feature teaser — always visible, never hidden */
export function LockedFeature({
  title,
  description,
  requiredPlan = "Pro",
  upgradeHref,
  className,
}: {
  title: string;
  description: string;
  requiredPlan?: string;
  upgradeHref?: string;
  className?: string;
}) {
  const router = useRouter();
  const href =
    upgradeHref ??
    `/settings?tab=billing&feature=${encodeURIComponent(title)}`;

  return (
    <div
      className={cn(
        "surface flex flex-col items-center border border-dashed border-gold/40 px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center border border-border bg-muted">
        <Lock className="size-5 text-gold" />
      </div>
      <h3 className="mt-4 font-heading text-xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button className="mt-6" onClick={() => router.push(href)}>
        <Zap className="size-4" /> Upgrade to {requiredPlan}
      </Button>
    </div>
  );
}

/** Contextual one-click upgrade sheet at point of friction */
export function UpgradeSheet({
  open,
  onClose,
  feature,
  benefit,
  requiredPlan = "Pro",
}: {
  open: boolean;
  onClose: () => void;
  feature: string;
  benefit: string;
  requiredPlan?: string;
}) {
  const router = useRouter();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal
        aria-labelledby="upgrade-sheet-title"
        className="w-full max-w-md border border-border bg-background p-6 shadow-[var(--elevation-3)] page-enter"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gold">
              Unlock {feature}
            </p>
            <h2
              id="upgrade-sheet-title"
              className="mt-1 font-heading text-2xl font-medium"
            >
              Upgrade to {requiredPlan}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{benefit}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            onClick={() =>
              router.push(
                `/settings?tab=billing&upgrade=${requiredPlan.toLowerCase()}&feature=${encodeURIComponent(feature)}`
              )
            }
          >
            <Zap className="size-4" /> Continue to billing
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
