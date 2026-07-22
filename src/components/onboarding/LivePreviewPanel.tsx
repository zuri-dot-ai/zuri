"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { OnboardingState } from "@/lib/onboarding/types";

const VIBE_GRADIENTS: Record<string, string> = {
  "bold-vibrant": "linear-gradient(135deg, #E85D04 0%, #F48C06 45%, #C9A227 100%)",
  "clean-modern": "linear-gradient(135deg, #2563EB 0%, #E2E8F0 50%, #64748B 100%)",
  "warm-friendly": "linear-gradient(135deg, #C45C26 0%, #F5E6D3 50%, #D4A373 100%)",
  "elegant-luxurious": "linear-gradient(135deg, #0C0C0E 0%, #C9A227 55%, #F5F0E8 100%)",
  "professional-trustworthy": "linear-gradient(135deg, #1E3A5F 0%, #FFFFFF 55%, #94A3B8 100%)",
  "creative-artistic": "linear-gradient(135deg, #0C0C0E 0%, #FF006E 50%, #F8F8F8 100%)",
};
const DEFAULT_GRADIENT = "linear-gradient(135deg, #C9A84C 0%, #0C0C0E 100%)";

interface LivePreviewPanelProps {
  state: OnboardingState;
  className?: string;
  /** Mobile renders as a collapsible card; desktop as a persistent panel. */
  variant?: "mobile" | "desktop";
}

function PreviewContent({ state }: { state: OnboardingState }) {
  const reducedMotion = useReducedMotion();
  const gradient = VIBE_GRADIENTS[state.brandVibe] ?? DEFAULT_GRADIENT;
  const fadeVariants = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } };

  const handleLabel = state.handle ? `zuri.co/${state.handle}` : "zuri.co/your-site";

  return (
    <div className="preview-frame w-full">
      <div className="preview-frame-chrome">
        <span className="flex gap-1.5">
          <span className="size-2 rounded-full bg-[var(--text-tertiary)]/40" />
          <span className="size-2 rounded-full bg-[var(--text-tertiary)]/40" />
          <span className="size-2 rounded-full bg-[var(--text-tertiary)]/40" />
        </span>
        <span className="ml-2 truncate rounded-sm bg-[var(--bg-secondary)] px-2.5 py-0.5 font-mono text-[0.6875rem] text-[var(--text-tertiary)]">
          {handleLabel}
        </span>
      </div>

      <div
        className="relative flex min-h-[220px] flex-col items-center justify-center gap-3 overflow-hidden px-6 py-10 text-center transition-[background] duration-500"
        style={{ background: gradient }}
      >
        <AnimatePresence mode="wait">
          {state.logoUrl && (
            <motion.img
              key={state.logoUrl}
              src={state.logoUrl}
              alt="Logo preview"
              initial={fadeVariants.initial}
              animate={fadeVariants.animate}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="size-10 rounded-sm border border-white/30 object-cover shadow-md"
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.h2
            key={state.businessName || "placeholder-title"}
            initial={fadeVariants.initial}
            animate={fadeVariants.animate}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="text-balance text-xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-2xl"
          >
            {state.businessName || "Your Business Name"}
          </motion.h2>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.p
            key={state.pitchLine || "placeholder-pitch"}
            initial={fadeVariants.initial}
            animate={fadeVariants.animate}
            transition={{ duration: 0.22, ease: "easeOut", delay: 0.03 }}
            className="max-w-[260px] text-sm text-white/85 drop-shadow-sm"
          >
            {state.pitchLine || "Your one-sentence pitch will appear here."}
          </motion.p>
        </AnimatePresence>

        <span className="mt-2 rounded-full bg-white/90 px-4 py-1.5 text-[0.6875rem] font-medium uppercase tracking-wide text-black/80">
          {state.platforms.length > 0 ? "Get in touch" : "Coming soon"}
        </span>
      </div>
    </div>
  );
}

export function LivePreviewPanel({
  state,
  className,
  variant = "desktop",
}: LivePreviewPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = Boolean(state.businessName);
  const reducedMotion = useReducedMotion();

  const summary = useMemo(
    () => state.businessName || "Your site preview",
    [state.businessName]
  );

  if (!hasContent) return null;

  if (variant === "mobile") {
    return (
      <div
        className={cn(
          "onboarding-preview-mobile w-full overflow-hidden",
          className
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="onboarding-panel flex w-full min-h-[44px] items-center justify-between gap-2 py-3"
        >
          <span className="onboarding-label truncate">{summary} — live preview</span>
          {expanded ? (
            <ChevronUp className="size-4 shrink-0 text-[var(--text-tertiary)]" />
          ) : (
            <ChevronDown className="size-4 shrink-0 text-[var(--text-tertiary)]" />
          )}
        </button>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              animate={reducedMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-3">
                <PreviewContent state={state} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={cn("sticky top-24 w-full", className)}>
      <PreviewContent state={state} />
      <p className="onboarding-helper mt-3 text-center">
        A rough preview — your real site will be much richer.
      </p>
    </div>
  );
}
