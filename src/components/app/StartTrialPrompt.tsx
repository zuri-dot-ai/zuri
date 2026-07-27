"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_CONFIG, type PlanId } from "@/lib/payments/plans";
import { trialDaysForPlan } from "@/lib/payments/trials";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import {
  dismissForDay,
  dismissForSession,
  isDismissedForDay,
  isSessionDismissed,
  PROMPT_KEYS,
} from "@/lib/billing/prompt-dismiss";

interface Props {
  /** Paid plan the user can still start a trial on */
  planId: PlanId;
}

/**
 * Invite never-trialed (or still-eligible) Free users to start a no-card trial.
 * Once per day, session-dismissible.
 */
export function StartTrialPrompt({ planId }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDismissedForDay(PROMPT_KEYS.startTrialPromptDay)) return;
    if (isSessionDismissed(PROMPT_KEYS.startTrialSessionDismissed)) return;
    setVisible(true);
    dismissForDay(PROMPT_KEYS.startTrialPromptDay);
  }, []);

  if (!visible) return null;

  const planName = PLAN_CONFIG[planId].name;
  const days = trialDaysForPlan(planId);

  async function startTrial() {
    setLoading(true);
    setError(null);
    try {
      await safeFetchJSON<{ planId: string; trialEndsAt: string }>(
        "/api/billing/start-trial",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        }
      );
      setVisible(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start trial.");
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-sm border border-border bg-muted/40 px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">
            Try {planName} free for {days} days
          </p>
          <p className="mt-1 text-muted-foreground">
            Publish your site, use your content calendar, and generate AI images —
            no card required. At trial end you&apos;ll move back to Free unless you
            upgrade.
          </p>
          {error && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={startTrial} disabled={loading}>
              {loading ? <span className="zuri-spinner" /> : null}
              Start {days}-day {planName} trial
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/settings?tab=billing")}
            >
              See plans
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            dismissForSession(PROMPT_KEYS.startTrialSessionDismissed);
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
