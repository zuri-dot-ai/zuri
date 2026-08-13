"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const STAGES = [
  { label: "Choosing a new template" },
  { label: "Writing fresh copy" },
  { label: "Sourcing images" },
  { label: "Finishing touches" },
] as const;

// Roughly tracks real pipeline duration (template select ~2-4s, Gemini Pro
// copy fill ~8-15s, image resolution ~2-5s, finishing ~2-3s) without being
// wired to real backend checkpoints — simulated timing per product
// decision. Total ~24s before parking on the last stage; actual completion
// is still driven by the job-status poll in WebsiteStudio, this only
// controls what stage label is showing while that poll runs.
const STAGE_DURATIONS_MS = [5000, 11000, 5000, 3000];

interface RegenerationOverlayProps {
  open: boolean;
  businessName: string;
  /** Set true once the parent's job poll detects "completed" — collapses
   *  immediately to a brief success state before the parent closes it. */
  succeeded?: boolean;
}

/**
 * Full-screen takeover shown while a website regeneration is in progress.
 * Deliberately distinct from onboarding's Step12Building: that's a
 * first-impression, checklist-reveal moment for a brand-new user.
 * Regeneration is a returning user re-rolling something they already
 * have — calmer, more confident, single focal state rather than a
 * scrolling checklist, less ceremony.
 */
export function RegenerationOverlay({
  open,
  businessName,
  succeeded = false,
}: RegenerationOverlayProps) {
  const reducedMotion = useReducedMotion();
  const [stageIndex, setStageIndex] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const cleanName = useMemo(
    () => businessName?.trim() || "your business",
    [businessName]
  );

  useEffect(() => {
    if (!open) {
      setStageIndex(0);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      return;
    }

    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < STAGES.length; i++) {
      elapsed += STAGE_DURATIONS_MS[i - 1];
      timers.push(setTimeout(() => setStageIndex(i), elapsed));
    }
    timersRef.current = timers;

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Regenerating your website"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg-primary)]"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-8 px-6 text-center">
        <div
          className={
            "flex size-14 items-center justify-center rounded-full border border-gold/30 bg-gold/[0.08] " +
            (reducedMotion || succeeded ? "" : "animate-pulse")
          }
        >
          <Sparkles className="size-6 text-gold" strokeWidth={1.75} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-medium text-[var(--text-primary)]">
            {succeeded
              ? `${cleanName}'s new look is ready`
              : `Reworking ${cleanName}`}
          </h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            {succeeded
              ? "Taking you back to your site."
              : "A new template, fresh copy, and new images — usually done in under a minute."}
          </p>
        </div>

        {!succeeded && (
          <div className="w-full space-y-4">
            <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--text-tertiary)]/15">
              <motion.div
                className="h-full rounded-full bg-gold"
                animate={{
                  width: `${((stageIndex + 1) / STAGES.length) * 100}%`,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={STAGES[stageIndex].label}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                {STAGES[stageIndex].label}
              </motion.p>
            </AnimatePresence>
          </div>
        )}

        {succeeded && (
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex size-10 items-center justify-center rounded-full border border-gold bg-gold/15"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 8.5L6.5 12L13 4.5"
                stroke="var(--gold)"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        )}

        {!succeeded && (
          <p className="text-xs text-[var(--text-tertiary)]">
            Feel free to leave this tab — we&apos;ll keep working in the
            background.
          </p>
        )}
      </div>
    </div>
  );
}
