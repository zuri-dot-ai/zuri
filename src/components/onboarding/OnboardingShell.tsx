"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

function StepDots({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={cn(
            "rounded-full transition-all duration-300",
            step < currentStep
              ? "size-2.5 bg-gold"
              : step === currentStep
                ? "size-3 bg-gold ring-2 ring-gold/30"
                : "size-2.5 bg-white/10"
          )}
        />
      ))}
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
  /** Hide footer controls (used on Step 8) */
  hideControls?: boolean;
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
}: OnboardingShellProps) {
  const reducedMotion = useReducedMotion();

  const variants = reducedMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: { x: direction > 0 ? 40 : -40, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: direction > 0 ? -40 : 40, opacity: 0 },
      };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-8 md:py-12">
      {step < 8 && (
        <div className="mb-8 space-y-3">
          <StepDots currentStep={step} />
          {showWelcomeBack && (
            <p className="text-center text-sm text-gold/90">
              Welcome back! Continue where you left off.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex-1"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {!hideControls && (
        <div className="mt-10 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            className="btn-gold-glow min-w-[140px]"
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
