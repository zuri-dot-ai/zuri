"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { marketingUrl } from "@/lib/marketing-url";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import {
  ONBOARDING_STEP_LABELS,
  ONBOARDING_TOTAL_STEPS,
} from "@/lib/onboarding/types";

function StepProgress({ currentStep }: { currentStep: number }) {
  const label = ONBOARDING_STEP_LABELS[currentStep] ?? "";
  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-caption text-[var(--text-tertiary)]">
          Step {currentStep} of {ONBOARDING_TOTAL_STEPS}
        </p>
        <p className="truncate text-caption font-medium text-[var(--text-secondary)]">
          {label}
        </p>
      </div>
      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={ONBOARDING_TOTAL_STEPS}
        aria-label={`Step ${currentStep} of ${ONBOARDING_TOTAL_STEPS}: ${label}`}
      >
        {Array.from({ length: ONBOARDING_TOTAL_STEPS }, (_, i) => i + 1).map(
          (step) => (
            <div
              key={step}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-[250ms] ease-out",
                step <= currentStep
                  ? "bg-gold"
                  : "bg-[var(--text-tertiary)]/25"
              )}
            />
          )
        )}
      </div>
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
  const isBuilding = step > ONBOARDING_TOTAL_STEPS;

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
      {/* Fixed header: logo + progress */}
      <header className="sticky top-0 z-20 -mx-5 border-b border-transparent bg-[var(--bg-primary)]/80 px-5 pb-4 pt-5 backdrop-blur-md sm:-mx-6 sm:px-6 sm:pt-6">
        <div className="mx-auto flex w-full max-w-[680px] flex-col items-center gap-4">
          <Logo variant="app" size="navbar" href={marketingUrl()} />
          {!isBuilding && <StepProgress currentStep={step} />}
          {showWelcomeBack && !isBuilding && (
            <p className="text-center text-sm text-gold/90">
              Welcome back! Continue where you left off.
            </p>
          )}
        </div>
      </header>

      {/* Content column — centered, upper-third bias */}
      <div className="mx-auto flex w-full max-w-[680px] flex-1 flex-col pb-8 pt-6 md:pt-10">
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
          <div className="mt-8 flex flex-col-reverse gap-3 sm:mt-10 sm:flex-row sm:items-center sm:justify-between">
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
                (!canContinue || launching) &&
                  "cursor-not-allowed opacity-40 hover:brightness-100"
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
