"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { freeTierLossSummary } from "@/lib/payments/trials";
import {
  dismissForDay,
  isDismissedForDay,
  PROMPT_KEYS,
} from "@/lib/billing/prompt-dismiss";

interface Props {
  daysLeft: number;
  trialTierName: string;
}

/**
 * Persistent (day-dismissible) banner in the final 3 days of a trial.
 */
export function TrialEndingBanner({ daysLeft, trialTierName }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isDismissedForDay(PROMPT_KEYS.trialEndingBannerDay));
  }, []);

  if (!visible) return null;

  const dayLabel = daysLeft <= 1 ? "1 day" : `${daysLeft} days`;
  const losses = freeTierLossSummary();

  return (
    <div className="flex items-start justify-between gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-400">
      <div className="min-w-0 flex-1">
        <span>
          Your {trialTierName} trial ends in {dayLabel}. You&apos;ll move to Free
          automatically — no charge. You&apos;ll lose: {losses.slice(0, 2).join("; ").toLowerCase()}
          {losses.length > 2 ? "; and more" : ""}.
        </span>{" "}
        <Link
          href="/settings?tab=billing"
          className="whitespace-nowrap font-medium text-amber-300 underline"
        >
          Upgrade to keep access
        </Link>
      </div>
      <button
        type="button"
        onClick={() => {
          dismissForDay(PROMPT_KEYS.trialEndingBannerDay);
          setVisible(false);
        }}
        className="shrink-0 p-0.5 text-amber-400/70 hover:text-amber-300"
        aria-label="Dismiss for today"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
