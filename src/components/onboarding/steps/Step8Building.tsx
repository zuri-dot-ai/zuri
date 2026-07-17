"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingState } from "@/lib/onboarding/types";
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboarding/types";
import { sanitizeText } from "@/lib/utils/sanitize";

const BUILD_STEPS = [
  "Saving your brand profile...",
  "Analysing your brand with AI...",
  "Designing your website...",
  "Writing your content...",
  "Preparing your strategy...",
  "You're almost ready...",
];

interface Step8BuildingProps {
  state: OnboardingState;
}

export function Step8Building({ state }: Step8BuildingProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // Animated progress even if API is still running
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
        const res = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          // Fail soft — redirect to dashboard with generation-failed card
          localStorage.removeItem(ONBOARDING_STORAGE_KEY);
          router.push("/dashboard?generation=failed");
          return;
        }

        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        setActiveIndex(BUILD_STEPS.length - 1);
        // Brief pause so user sees final checkmark
        setTimeout(() => router.push("/dashboard"), 800);
      } catch {
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
    <div className="flex flex-col items-center justify-center gap-8 py-8 text-center">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground md:text-3xl">
          Building your presence
        </h1>
        {statusMessage && (
          <p className="mt-3 text-sm text-muted-foreground">{statusMessage}</p>
        )}
      </div>

      <div className="surface w-full max-w-sm p-6 text-left">
        <ul className="space-y-3">
          {BUILD_STEPS.map((label, i) => {
            const done = i < activeIndex;
            const active = i === activeIndex;
            return (
              <li
                key={label}
                className={cn(
                  "flex items-center gap-3 text-sm transition-opacity duration-300",
                  done || active ? "opacity-100" : "opacity-30"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center border",
                    done
                      ? "border-gold bg-gold text-background"
                      : active
                        ? "border-gold"
                        : "border-[hsl(var(--border))]"
                  )}
                >
                  {done ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : active ? (
                    <span className="size-1.5 animate-pulse bg-gold" aria-hidden />
                  ) : null}
                </span>
                <span
                  className={cn(
                    done || active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
