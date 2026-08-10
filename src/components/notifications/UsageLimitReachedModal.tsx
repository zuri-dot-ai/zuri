"use client";

import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import { PremiumModal } from "./PremiumModal";

interface UsageLimitReachedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "content generations", "website publishes", "AI images" */
  limitLabel: string;
  /** e.g. "Free" — the plan they're currently on and about to be upsold from */
  currentPlanName: string;
  upgradeUrl?: string;
}

/**
 * Shown when a user hits a hard usage ceiling (e.g. free-tier generation
 * limit). This is a *blocking* moment in the sense that the action they
 * wanted to take didn't happen — so unlike toasts, a modal here is earned:
 * it's a direct, honest response to something the user just tried to do,
 * not an unprompted interruption.
 *
 * Priority 2 in the notification hierarchy (blocking upgrade prompt).
 */
export function UsageLimitReachedModal({
  open,
  onOpenChange,
  limitLabel,
  currentPlanName,
  upgradeUrl = "/settings?tab=billing",
}: UsageLimitReachedModalProps) {
  return (
    <PremiumModal open={open} onOpenChange={onOpenChange} size="sm">
      <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-5 flex size-14 items-center justify-center rounded-full"
          style={{
            background: "rgba(226, 168, 58, 0.12)",
            border: "1px solid rgba(226, 168, 58, 0.28)",
          }}
        >
          <Lock className="size-6" style={{ color: "#e2a83a" }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
        >
          <h2 className="font-heading text-2xl leading-tight text-[var(--text-primary)]">
            You&apos;ve reached your {limitLabel} limit
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            The {currentPlanName} plan includes a limited number of{" "}
            {limitLabel} each month. Upgrade to keep going without
            interruption.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35 }}
          className="mt-7 flex w-full flex-col gap-2"
        >
          <a
            href={upgradeUrl}
            className="flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-transform active:scale-[0.98]"
            style={{
              background: "var(--accent)",
              color: "var(--accent-foreground)",
            }}
          >
            See upgrade options
            <ArrowRight className="size-3.5" />
          </a>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full py-2 text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Maybe later
          </button>
        </motion.div>
      </div>
    </PremiumModal>
  );
}
