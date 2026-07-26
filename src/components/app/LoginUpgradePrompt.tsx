"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import {
  dismissForDay,
  dismissForSession,
  hasRecentGateAttempt,
  isDismissedForDay,
  isSessionDismissed,
  PROMPT_KEYS,
} from "@/lib/billing/prompt-dismiss";

interface Props {
  /** Show when trial ends within 3 days */
  trialEndingSoon: boolean;
  daysLeft?: number | null;
  trialTierName?: string;
}

/**
 * Contextual after-login nudge — max once per day, session-dismissible.
 * Only when trial ending soon or a plan-gated feature was recently attempted.
 */
export function LoginUpgradePrompt({
  trialEndingSoon,
  daysLeft,
  trialTierName = "Pro",
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isDismissedForDay(PROMPT_KEYS.loginUpgradePromptDay)) return;
    if (isSessionDismissed(PROMPT_KEYS.loginUpgradeSessionDismissed)) return;

    const recentGate = hasRecentGateAttempt();
    if (!trialEndingSoon && !recentGate) return;

    setVisible(true);
    // Count this appearance against the daily cap
    dismissForDay(PROMPT_KEYS.loginUpgradePromptDay);
  }, [trialEndingSoon]);

  if (!visible) return null;

  const body = trialEndingSoon
    ? `Your ${trialTierName} trial ends in ${daysLeft === 1 ? "1 day" : `${daysLeft ?? "a few"} days`}. Upgrade to keep publishing and content tools — nothing auto-charges.`
    : "You recently tried a Pro feature. Upgrade anytime to unlock the full toolkit — or keep exploring your trial.";

  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-sm border border-border bg-muted/40 px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        {body}{" "}
        <Link href="/settings?tab=billing" className="font-medium text-foreground underline">
          View billing
        </Link>
      </p>
      <button
        type="button"
        onClick={() => {
          dismissForSession(PROMPT_KEYS.loginUpgradeSessionDismissed);
          setVisible(false);
        }}
        className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
