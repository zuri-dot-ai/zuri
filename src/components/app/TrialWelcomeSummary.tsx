"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import {
  dismiss,
  isDismissed,
  PROMPT_KEYS,
} from "@/lib/billing/prompt-dismiss";

interface Props {
  trialEndsAt: string;
  trialTierName: string;
}

/**
 * Post-signup / early-session summary of the active trial. Non-blocking, one-time dismiss.
 */
export function TrialWelcomeSummary({ trialEndsAt, trialTierName }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isDismissed(PROMPT_KEYS.trialWelcomeDismissed));
  }, []);

  if (!visible) return null;

  const endLabel = new Date(trialEndsAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="mb-6 rounded-sm border border-border bg-muted/40 px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            You&apos;re on a {trialTierName} trial until {endLabel}
          </p>
          <p className="mt-1 text-muted-foreground">
            Publish your site, use your content calendar, and generate AI images —
            no card required. At trial end you&apos;ll move to Free unless you upgrade.{" "}
            <Link href="/settings?tab=billing" className="underline">
              See plans
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            dismiss(PROMPT_KEYS.trialWelcomeDismissed);
            setVisible(false);
          }}
          className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
