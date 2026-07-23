"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { marketingUrl } from "@/lib/marketing-url";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { ONBOARDING_TOTAL_STEPS } from "@/lib/onboarding/types";

/** Thin, single-bar progress indicator — no per-step labels (docs/01_ONBOARDING_V2.md §3). */
function StepProgress({ currentStep }: { currentStep: number }) {
  const pct = Math.min(100, Math.round((currentStep / ONBOARDING_TOTAL_STEPS) * 100));
  return (
    <div
      className="h-1 w-full overflow-hidden rounded-full bg-[var(--text-tertiary)]/20"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={ONBOARDING_TOTAL_STEPS}
      aria-label={`Step ${currentStep} of ${ONBOARDING_TOTAL_STEPS}`}
    >
      <div
        className="h-full rounded-full bg-gold transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface OnboardingShellProps {
  step: number;
  direction: 1 | -1;
  canContinue: boolean;
  showWelcomeBack?: boolean;
  onBack: () => void;
  onContinue: () => void;
  children: React.ReactNode;
  hideControls?: boolean;
  /** Brief launch spinner before advancing from final data step */
  launchOnContinue?: boolean;
}

/**
 * Onboarding V2 shell (docs/01_ONBOARDING_V2.md §3) — single-question,
 * single-screen. No live website preview (removed — the mental model is
 * "answer questions", not "watch a site assemble"); static split layout on
 * desktop is just centered content with generous whitespace either side.
 */
export function OnboardingShell({
  step,
  direction,
  canContinue,
  showWelcomeBack = false,
  onBack,
  onContinue,
  children,
  hideControls = false,
  launchOnContinue = false,
}: OnboardingShellProps) {
  const reducedMotion = useReducedMotion();
  const [launching, setLaunching] = useState(false);

  const variants = reducedMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: { x: direction > 0 ? 28 : -28, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: direction > 0 ? -28 : 28, opacity: 0 },
      };

  function handleContinue() {
    if (!canContinue || launching) return;
    if (launchOnContinue) {
      setLaunching(true);
      window.setTimeout(() => {
        onContinue();
        setLaunching(false);
      }, 480);
      return;
    }
    onContinue();
  }

  return (
    <div className="onboarding-shell flex min-h-screen w-full flex-col px-5 sm:px-6">
      {/* Fixed header: logo + thin progress bar */}
      <header className="onboarding-safe-top sticky top-0 z-20 -mx-5 border-b border-transparent bg-[var(--bg-primary)]/80 px-5 pb-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-4">
          <Logo variant="image" size="navbar" href={marketingUrl()} />
          <StepProgress currentStep={step} />
          {showWelcomeBack && (
            <p className="text-center text-sm text-gold/90">
              Welcome back! Continue where you left off.
            </p>
          )}
        </div>
      </header>

      {/* Content — centered single column, no side preview */}
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col pb-8 pt-6 md:pt-10">
        <div className="flex flex-1 flex-col justify-start md:justify-center md:pb-[8vh]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {!hideControls && (
          <div className="onboarding-safe-bottom mt-8 flex flex-col-reverse gap-3 sm:mt-10 sm:flex-row sm:items-center sm:justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={onBack}
                disabled={launching}
                className="text-center text-sm text-[var(--text-tertiary)] transition-colors duration-150 hover:text-foreground sm:text-left"
              >
                ← Back
              </button>
            ) : (
              <span className="hidden sm:block" />
            )}
            <Button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue || launching}
              className={cn(
                "w-full min-w-[140px] sm:w-auto",
                (!canContinue || launching) && "cursor-not-allowed opacity-40 hover:brightness-100"
              )}
            >
              {launching ? (
                <span className="inline-flex items-center gap-2">
                  <span className="zuri-spinner" />
                  Starting…
                </span>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
