"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/utils/sanitize";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const BUILD_STEPS = [
  {
    label: "Saving your brand profile...",
    micro: (name: string) => `Locking in details for ${name}…`,
  },
  {
    label: "Analysing your brand with AI...",
    micro: (name: string) => `Understanding what makes ${name} unique…`,
  },
  {
    label: "Designing your website...",
    micro: (name: string) => `Choosing colors for ${name}…`,
  },
  {
    label: "Writing your content...",
    micro: (name: string) => `Drafting copy that sounds like ${name}…`,
  },
  {
    label: "Preparing your strategy...",
    micro: () => "Mapping your first 90 days…",
  },
  {
    label: "You're almost ready...",
    micro: () => "Putting the finishing touches…",
  },
];

const STEP_INTERVAL_MS = 4500;
const REDIRECT_DELAY_MS = 1200;

interface Step12BuildingProps {
  businessName: string;
}

/**
 * Onboarding V2 Step 12 (docs/01_ONBOARDING_V2.md §7.6) — purely decorative.
 * The real work (/api/onboarding/complete + /api/ai/generate-website) was
 * already triggered either by /api/auth/callback (Google OAuth) or by
 * Step11Signup itself (email+password with an immediate session) before the
 * user ever lands on this route — this never re-submits.
 */
export function Step12Building({ businessName }: Step12BuildingProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const redirectedRef = useRef(false);

  const cleanName = useMemo(
    () => sanitizeText(businessName) || "your business",
    [businessName]
  );

  const progressPct = Math.round(((activeIndex + 1) / BUILD_STEPS.length) * 100);

  useEffect(() => {
    const timers = BUILD_STEPS.map((_, i) =>
      setTimeout(() => setActiveIndex(i), i * STEP_INTERVAL_MS)
    );
    const finalTimer = setTimeout(() => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      router.push("/dashboard");
    }, BUILD_STEPS.length * STEP_INTERVAL_MS + REDIRECT_DELAY_MS);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finalTimer);
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-6 text-center md:py-10">
      <div className="w-full max-w-md space-y-3">
        <h1 className="onboarding-headline">Building your presence</h1>
        <div className="mx-auto h-1 w-full max-w-xs overflow-hidden rounded-full bg-[var(--text-tertiary)]/20">
          <div
            className="h-full rounded-full bg-gold transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-caption text-[var(--text-tertiary)]">{progressPct}% complete</p>
      </div>

      <div className="w-full max-w-md rounded-lg border border-border bg-[var(--bg-secondary)] p-6 text-left sm:p-8">
        <ul className="space-y-4">
          {BUILD_STEPS.map((item, i) => {
            const done = i < activeIndex;
            const active = i === activeIndex;
            const visible = done || active || i <= activeIndex + 1;

            return (
              <AnimatePresence key={item.label}>
                {visible && (
                  <motion.li
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: done || active ? 1 : 0.35, y: 0 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="flex items-start gap-3"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                        done
                          ? "border-gold bg-gold/15 text-gold"
                          : active
                            ? "border-gold"
                            : "border-border"
                      )}
                    >
                      {done ? (
                        <motion.span
                          initial={reducedMotion ? false : { scale: 0.5 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 18 }}
                        >
                          <Check className="size-3.5" strokeWidth={2.5} />
                        </motion.span>
                      ) : active ? (
                        <span className="size-1.5 animate-pulse rounded-full bg-gold" aria-hidden />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          done || active ? "text-foreground" : "text-[var(--text-tertiary)]"
                        )}
                      >
                        {item.label}
                      </p>
                      {active && (
                        <motion.p
                          key={item.micro(cleanName)}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          className="mt-1 text-caption text-[var(--text-tertiary)]"
                        >
                          {item.micro(cleanName)}
                        </motion.p>
                      )}
                    </div>
                  </motion.li>
                )}
              </AnimatePresence>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
