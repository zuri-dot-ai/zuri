"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { marketingUrl } from "@/lib/marketing-url";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { ONBOARDING_TOTAL_STEPS } from "@/lib/onboarding/types";
import { OnboardingHeroPanel } from "@/components/onboarding/OnboardingHeroPanel";

/** Thin single-bar progress — docs/01_ONBOARDING_V2.md §3 */
function StepProgress({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  const pct = Math.min(100, Math.round((currentStep / totalSteps) * 100));
  return (
    <div
      className="h-1 w-full overflow-hidden rounded-full bg-[var(--text-tertiary)]/20"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Step ${currentStep} of ${totalSteps}`}
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
  launchOnContinue?: boolean;
  /** Override Continue button label (e.g. auth-resume finish CTA) */
  continueLabel?: string;
  /** Defaults to onboarding total so /start is unchanged */
  totalSteps?: number;
  /**
   * Vertical alignment of step content. Default "center" matches /start.
   * Use "start" for denser multi-field steps (e.g. agency apply).
   */
  contentAlign?: "start" | "center";
}

/**
 * Onboarding V2 shell — desktop ≥1025px (lg): 30% static hero + 70% content.
 * Tablet/mobile: content only, no image in the DOM.
 * Back / Continue live in the top-right header.
 *
 * Content column scrolls internally at every breakpoint — the hero panel
 * (desktop only) stays pinned at 30% width while the questionnaire scrolls
 * beneath the fixed header. Scroll resets to top on every step change.
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
  continueLabel,
  totalSteps = ONBOARDING_TOTAL_STEPS,
  contentAlign = "center",
}: OnboardingShellProps) {
  const reducedMotion = useReducedMotion();
  const [launching, setLaunching] = useState(false);
  const [continueGleam, setContinueGleam] = useState(false);
  const prevCanContinueRef = useRef(canContinue);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wasEnabled = prevCanContinueRef.current;
    prevCanContinueRef.current = canContinue;

    if (reducedMotion || wasEnabled || !canContinue) return;

    setContinueGleam(true);
    const t = window.setTimeout(() => setContinueGleam(false), 900);
    return () => window.clearTimeout(t);
  }, [canContinue, reducedMotion]);

  // Reset scroll position on every step change so a tall step never
  // renders mid-scroll after navigating from another tall step.
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  // Scroll-linked hero reaction (desktop only — panel is hidden below lg,
  // and this is a no-op if the container never scrolls). Tracks progress
  // through the *current* step's content.
  const { scrollYProgress } = useScroll({ container: contentScrollRef });
  const heroGlowProgress = useTransform(scrollYProgress, [0, 1], [0, 1]);

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
    <div className="onboarding-shell flex h-dvh max-h-dvh w-full overflow-hidden">
      <OnboardingHeroPanel scrollProgress={reducedMotion ? undefined : heroGlowProgress} />

      <div className="flex h-dvh max-h-dvh w-full flex-1 flex-col overflow-hidden px-5 sm:px-6 lg:w-[70%] lg:px-10 xl:px-14">
        <header className="onboarding-safe-top z-20 shrink-0 -mx-5 bg-[var(--bg-primary)] px-5 pb-4 pt-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
          <div className="mx-auto flex w-full max-w-[840px] flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <Logo variant="image" size="navbar" href={marketingUrl()} />

              {!hideControls && (
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={onBack}
                      disabled={launching}
                      className={cn(
                        "inline-flex h-10 min-w-[72px] items-center justify-center rounded-sm border border-border bg-transparent px-3 text-sm text-[var(--text-secondary)] transition-colors duration-150",
                        "hover:border-foreground/30 hover:text-foreground",
                        "disabled:cursor-not-allowed disabled:opacity-40"
                      )}
                    >
                      Back
                    </button>
                  )}
                  <Button
                    type="button"
                    onClick={handleContinue}
                    disabled={!canContinue || launching}
                    className={cn(
                      "h-10 min-w-[108px] px-4 sm:min-w-[128px]",
                      continueGleam && "onboarding-continue-gleam",
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
                      continueLabel ?? "Continue"
                    )}
                  </Button>
                </div>
              )}
            </div>

            <StepProgress currentStep={step} totalSteps={totalSteps} />
            {showWelcomeBack && (
              <p className="text-center text-sm text-gold/90 lg:text-left">
                Welcome back! Continue where you left off.
              </p>
            )}
          </div>
        </header>

        {/*
          Scrolls at every breakpoint. Hero stays pinned at 30% width on
          desktop (it lives outside this column); only this content
          column scrolls when a step's height exceeds the viewport.
          Fade mask (onboarding-scroll-fade, in globals.css) feathers
          content near the header/footer edges instead of hard-cutting it.
        */}
        <div
          ref={contentScrollRef}
          className={cn(
            "onboarding-scroll onboarding-scroll-fade mx-auto flex min-h-0 w-full max-w-[840px] flex-1 flex-col overflow-y-auto overscroll-contain pb-6 pt-6 pr-3 lg:pt-8",
          )}
        >
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              contentAlign === "center"
                ? "justify-start lg:justify-center"
                : "justify-start"
            )}
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="min-h-0 w-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}