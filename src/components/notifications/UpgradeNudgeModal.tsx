"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { PremiumModal } from "./PremiumModal";
import { PLAN_CONFIG } from "@/lib/payments/plans";
import { PRICING } from "@/lib/constants";
import { formatNGN } from "@/lib/utils";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import type { NudgeKind } from "@/lib/payments/upgrade-nudge";

interface Props {
  kind: NudgeKind;
}

/**
 * Recurring modal shown every ~24h to Free-tier users:
 *  - "activate_trial": invites the never-trialed user to start their
 *    one-time 7-day Growth trial (no card).
 *  - "upgrade": for users whose Growth trial already ended, offers direct
 *    plan selection + checkout without leaving the modal.
 *
 * Fires POST /api/billing/record-nudge-shown once on mount so the next
 * eligible show is governed server-side (getNudgeToShow), not localStorage —
 * this persists across devices/sessions by design.
 */
export function UpgradeNudgeModal({ kind }: Props) {
  const [open, setOpen] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [loadingTrial, setLoadingTrial] = useState(false);
  const stampedRef = useRef(false);

  useEffect(() => {
    if (stampedRef.current) return;
    stampedRef.current = true;
    void safeFetchJSON("/api/billing/record-nudge-shown", { method: "POST" }).catch(
      () => {
        /* non-critical — worst case they see the nudge slightly early next time */
      }
    );
  }, []);

  async function startTrial() {
    setLoadingTrial(true);
    try {
      await safeFetchJSON("/api/billing/start-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "growth" }),
      });
      window.location.reload();
    } catch {
      setLoadingTrial(false);
    }
  }

  async function checkout(planId: "pro" | "growth" | "premium") {
    setLoadingCheckout(planId);
    try {
      const data = await safeFetchJSON<{ checkoutUrl: string }>(
        "/api/billing/checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, interval: "monthly" }),
        }
      );
      window.location.href = data.checkoutUrl;
    } catch {
      setLoadingCheckout(null);
    }
  }

  if (kind === "activate_trial") {
    return (
      <PremiumModal open={open} onOpenChange={setOpen} size="sm">
        <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-5 flex size-14 items-center justify-center rounded-full"
            style={{
              background: "rgba(201, 168, 76, 0.14)",
              border: "1px solid rgba(201, 168, 76, 0.32)",
            }}
          >
            <Sparkles className="size-6" style={{ color: "var(--accent)" }} />
          </motion.div>
          <h2 className="font-heading text-2xl leading-tight text-[var(--text-primary)]">
            Try Growth free for 7 days
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            Publish your site, unlock your full content calendar, and generate
            AI images — no card required. You can cancel anytime before the
            trial ends and pay nothing.
          </p>
          <div className="mt-7 flex w-full flex-col gap-2">
            <button
              type="button"
              onClick={startTrial}
              disabled={loadingTrial}
              className="flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-transform active:scale-[0.98]"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              {loadingTrial ? <span className="zuri-spinner" /> : null}
              Start my free trial
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2 text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Maybe later
            </button>
          </div>
        </div>
      </PremiumModal>
    );
  }

  // kind === "upgrade" — post-trial, direct plan pick + checkout
  return (
    <PremiumModal open={open} onOpenChange={setOpen} size="md">
      <div className="px-6 pb-8 pt-8">
        <div className="text-center">
          <h2 className="font-heading text-2xl leading-tight text-[var(--text-primary)]">
            Pick up where you left off
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            Your Growth trial has ended. Choose a plan to restore publishing,
            content tools, and everything else.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {PRICING.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border p-4"
              style={
                p.highlight
                  ? { borderColor: "var(--accent)", background: "rgba(201,168,76,0.06)" }
                  : { borderColor: "var(--border)" }
              }
            >
              <div>
                <p className="font-heading text-lg font-semibold">{p.name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {formatNGN(p.ngnMonthly)}/month
                </p>
              </div>
              <button
                type="button"
                onClick={() => checkout(p.id)}
                disabled={loadingCheckout === p.id}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-transform active:scale-[0.98]"
                style={
                  p.highlight
                    ? { background: "var(--accent)", color: "var(--accent-foreground)" }
                    : { border: "1px solid var(--border)", color: "var(--text-primary)" }
                }
              >
                {loadingCheckout === p.id ? (
                  <span className="zuri-spinner" />
                ) : (
                  <>
                    Choose
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-5 w-full py-2 text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
        >
          Maybe later
        </button>
      </div>
    </PremiumModal>
  );
}