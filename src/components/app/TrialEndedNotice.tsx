"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { freeTierLossSummary } from "@/lib/payments/trials";
import {
  dismiss,
  isDismissed,
  trialEndedAckKey,
} from "@/lib/billing/prompt-dismiss";

interface Props {
  trialEndedAt: string;
}

/**
 * One-time notice after auto-downgrade from trial to Free.
 */
export function TrialEndedNotice({ trialEndedAt }: Props) {
  const [visible, setVisible] = useState(false);
  const key = trialEndedAckKey(trialEndedAt);

  useEffect(() => {
    const ended = new Date(trialEndedAt).getTime();
    if (Number.isNaN(ended)) return;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - ended > sevenDays) return;
    setVisible(!isDismissed(key));
  }, [key, trialEndedAt]);

  if (!visible) return null;

  const losses = freeTierLossSummary();

  return (
    <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/60 px-4 py-2.5 text-sm text-foreground">
      <div className="min-w-0 flex-1">
        <p className="font-medium">Your trial has ended — you&apos;re on Free.</p>
        <p className="mt-0.5 text-muted-foreground">
          Nothing was charged. You no longer have: {losses.join("; ").toLowerCase()}.{" "}
          <Link
            href="/settings?tab=billing"
            className="font-medium text-foreground underline"
          >
            Upgrade to restore access
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          dismiss(key);
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
