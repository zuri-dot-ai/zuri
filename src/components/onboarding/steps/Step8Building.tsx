"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FetchError, safeFetchJSON } from "@/lib/utils/safe-fetch";
import type { OnboardingState } from "@/lib/onboarding/types";
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboarding/types";
import { sanitizeText } from "@/lib/utils/sanitize";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { toast } from "sonner";

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

interface Step8BuildingProps {
  state: OnboardingState;
}

export function Step8Building({ state }: Step8BuildingProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  const businessName = useMemo(
    () => sanitizeText(state.businessName) || "your business",
    [state.businessName]
  );

  const progressPct = Math.round(
    ((activeIndex + 1) / BUILD_STEPS.length) * 100
  );

  useEffect(() => {
    const timers = BUILD_STEPS.map((_, i) =>
      setTimeout(() => setActiveIndex(i), i * 4500)
    );
    const timeout45 = setTimeout(() => {
      setStatusMessage(
        "This is taking a little longer than usual. We'll notify you when it's ready."
      );
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      router.push("/dashboard");
    }, 45000);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(timeout45);
    };
  }, [router]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function submit() {
      startedRef.current = true;
      const payload = {
        firstName: sanitizeText(state.firstName),
        businessName: sanitizeText(state.businessName),
        handle: state.handle.toLowerCase().trim(),
        businessType: state.businessType,
        services: state.services.map((s) => sanitizeText(s)),
        audienceTypes: state.audienceTypes.map((a) => sanitizeText(a)),
        location: state.location,
        locationCity: state.locationCity
          ? sanitizeText(state.locationCity)
          : undefined,
        brandVibe: sanitizeText(state.brandVibe),
        platforms:
          state.platforms.length > 0
            ? state.platforms
            : ["instagram", "facebook"],
      };

      try {
        const data = await safeFetchJSON<{
          error?: string;
          details?: string[];
          jobId?: string | null;
          success?: boolean;
        }>("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        // Kick off generation from the client — server fire-and-forget fetch
        // is killed when the Vercel lambda exits after this API returns.
        if (data.jobId) {
          setActiveIndex(2);
          try {
            await safeFetchJSON("/api/ai/generate-website", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobId: data.jobId }),
            });
          } catch (genErr) {
            toast.error(
              genErr instanceof Error
                ? genErr.message
                : "Website generation failed to start"
            );
          }
        }

        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        setActiveIndex(BUILD_STEPS.length - 1);
        setTimeout(() => router.push("/dashboard"), 800);
      } catch (err) {
        if (err instanceof FetchError) {
          toast.error(err.message);
          localStorage.removeItem(ONBOARDING_STORAGE_KEY);
          router.push("/dashboard");
          return;
        }
        setStatusMessage("Connection lost. Retrying...");
        setTimeout(() => {
          startedRef.current = false;
          void submit();
        }, 2000);
      }
    }

    void submit();
  }, [state, router]);

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-6 text-center md:py-10">
      <div className="w-full max-w-md space-y-3">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-foreground md:text-[2rem]">
          Building your presence
        </h1>
        {statusMessage && (
          <p className="text-sm text-[var(--text-secondary)]">{statusMessage}</p>
        )}
        <div className="mx-auto h-1 w-full max-w-xs overflow-hidden rounded-full bg-[var(--text-tertiary)]/20">
          <div
            className="h-full rounded-full bg-gold transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-caption text-[var(--text-tertiary)]">
          {progressPct}% complete
        </p>
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
                    initial={
                      reducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: 8 }
                    }
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
                        <span
                          className="size-1.5 animate-pulse rounded-full bg-gold"
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          done || active
                            ? "text-foreground"
                            : "text-[var(--text-tertiary)]"
                        )}
                      >
                        {item.label}
                      </p>
                      {active && (
                        <motion.p
                          key={item.micro(businessName)}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          className="mt-1 text-caption text-[var(--text-tertiary)]"
                        >
                          {item.micro(businessName)}
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
