"use client";

import { PLAN_CONFIG, isPlanId } from "@/lib/payments/plans";
import { daysUntil } from "@/lib/payments/trials";
import { TrialEndingBanner } from "./TrialEndingBanner";
import { TrialEndedNotice } from "./TrialEndedNotice";
import { TrialWelcomeSummary } from "./TrialWelcomeSummary";
import { LoginUpgradePrompt } from "./LoginUpgradePrompt";

export interface TrialPromptsProps {
  status: string;
  planId: string;
  trialEndsAt: string | null;
  trialTier: string | null;
  trialEndedAt: string | null;
  /** Where to render: shell banners vs in-main nudges */
  slot: "banners" | "inline";
}

/**
 * Client orchestration for trial-related upgrade prompts in the app shell.
 */
export function TrialPrompts({
  status,
  planId,
  trialEndsAt,
  trialTier,
  trialEndedAt,
  slot,
}: TrialPromptsProps) {
  const trialing = status === "trialing" && !!trialEndsAt;
  const daysLeft = daysUntil(trialEndsAt);
  const tierId =
    trialTier && isPlanId(trialTier)
      ? trialTier
      : isPlanId(planId)
        ? planId
        : "pro";
  const tierName = PLAN_CONFIG[tierId].name;
  const endingSoon =
    trialing && daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
  const showWelcome = trialing && !endingSoon;
  const showEnded =
    !!trialEndedAt && planId === "free" && status === "active";

  if (slot === "banners") {
    return (
      <>
        {endingSoon && daysLeft !== null && (
          <TrialEndingBanner
            daysLeft={Math.max(1, daysLeft)}
            trialTierName={tierName}
          />
        )}
        {showEnded && trialEndedAt && (
          <TrialEndedNotice trialEndedAt={trialEndedAt} />
        )}
      </>
    );
  }

  return (
    <>
      {showWelcome && trialEndsAt && (
        <TrialWelcomeSummary
          trialEndsAt={trialEndsAt}
          trialTierName={tierName}
        />
      )}
      <LoginUpgradePrompt
        trialEndingSoon={!!endingSoon}
        daysLeft={daysLeft}
        trialTierName={tierName}
      />
    </>
  );
}
