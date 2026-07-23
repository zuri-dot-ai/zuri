"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Step1Category } from "@/components/onboarding/steps/Step1Category";
import { Step2Services } from "@/components/onboarding/steps/Step2Services";
import { Step3PhotoUpload } from "@/components/onboarding/steps/Step3PhotoUpload";
import { Step4Audience } from "@/components/onboarding/steps/Step4Audience";
import { Step5Location } from "@/components/onboarding/steps/Step5Location";
import { Step6BrandVibe } from "@/components/onboarding/steps/Step6BrandVibe";
import { Step7BusinessName } from "@/components/onboarding/steps/Step7BusinessName";
import { Step8Handle } from "@/components/onboarding/steps/Step8Handle";
import { Step9Platforms } from "@/components/onboarding/steps/Step9Platforms";
import { Step10YourName } from "@/components/onboarding/steps/Step10YourName";
import { Step11Signup } from "@/components/onboarding/steps/Step11Signup";
import {
  DEFAULT_ONBOARDING_STATE,
  ONBOARDING_TOTAL_STEPS,
  type OnboardingState,
} from "@/lib/onboarding/types";
import { resolveArchetypeFromCategory } from "@/lib/website/archetypes";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";

const SIGNUP_STEP = ONBOARDING_TOTAL_STEPS; // 11 — last step is the signup gateway
const PATCH_DEBOUNCE_MS = 500;

export default function StartPage() {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);
  const [canContinue, setCanContinue] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [welcomeBack, setWelcomeBack] = useState(false);
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Bootstrap: get or create the anonymous session, restore progress ────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { sessionToken } = await safeFetchJSON<{ sessionToken: string }>(
          "/api/onboarding/start",
          { method: "POST" }
        );
        if (cancelled) return;

        try {
          const existing = await safeFetchJSON<{
            data: Partial<OnboardingState>;
            currentStep: number;
          }>(`/api/onboarding/session?sessionToken=${encodeURIComponent(sessionToken)}`);

          if (cancelled) return;

          const step = Math.min(
            SIGNUP_STEP,
            Math.max(1, Number(existing.currentStep) || 1)
          );
          setState({
            ...DEFAULT_ONBOARDING_STATE,
            ...existing.data,
            sessionToken,
            step,
          });
          setWelcomeBack(step > 1);
        } catch {
          setState({ ...DEFAULT_ONBOARDING_STATE, sessionToken });
        }
      } catch {
        // Session bootstrap failed (rate limited or network issue) — allow
        // the user to still fill the form locally; PATCH calls will retry.
        setState({ ...DEFAULT_ONBOARDING_STATE, sessionToken: "" });
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Debounced server-side persistence on every state change ─────────────
  useEffect(() => {
    if (!ready || !state.sessionToken) return;
    if (patchTimerRef.current) clearTimeout(patchTimerRef.current);

    patchTimerRef.current = setTimeout(() => {
      const { sessionToken, step, startedAt, ...data } = state;
      void safeFetchJSON("/api/onboarding/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, step, data }),
      }).catch(() => {
        /* best-effort — next change will retry */
      });
    }, PATCH_DEBOUNCE_MS);

    return () => {
      if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
    };
  }, [state, ready]);

  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const goNext = useCallback(() => {
    setDirection(1);
    setCanContinue(false);
    setWelcomeBack(false);
    setState((prev) => ({ ...prev, step: Math.min(SIGNUP_STEP, prev.step + 1) }));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setCanContinue(true);
    setWelcomeBack(false);
    setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) }));
  }, []);

  const skipPlatforms = useCallback(() => {
    setDirection(1);
    setState((prev) => ({
      ...prev,
      platforms: ["instagram", "facebook"],
      step: SIGNUP_STEP,
    }));
  }, []);

  function selectCategory(businessType: string) {
    update({
      businessType,
      resolvedArchetype: resolveArchetypeFromCategory(businessType),
    });
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-tertiary)]">
        Loading…
      </div>
    );
  }

  const step = state.step;

  return (
    <OnboardingShell
      step={step}
      direction={direction}
      canContinue={canContinue}
      showWelcomeBack={welcomeBack}
      onBack={goBack}
      onContinue={goNext}
      hideControls={step === SIGNUP_STEP}
    >
      {step === 1 && (
        <Step1Category
          value={state.businessType}
          onChange={selectCategory}
          onValidityChange={setCanContinue}
        />
      )}
      {step === 2 && (
        <Step2Services
          businessType={state.businessType}
          value={state.services}
          onChange={(services) => update({ services })}
          onValidityChange={setCanContinue}
        />
      )}
      {step === 3 && (
        <Step3PhotoUpload
          sessionToken={state.sessionToken}
          archetype={state.resolvedArchetype}
          images={state.uploadedImages}
          onChange={(uploadedImages) => update({ uploadedImages })}
          skipped={state.photoStepSkipped}
          onSkip={(photoStepSkipped) => update({ photoStepSkipped })}
          onValidityChange={setCanContinue}
        />
      )}
      {step === 4 && (
        <Step4Audience
          value={state.audienceTypes}
          onChange={(audienceTypes) => update({ audienceTypes })}
          onValidityChange={setCanContinue}
        />
      )}
      {step === 5 && (
        <Step5Location
          location={state.location}
          locationCity={state.locationCity}
          onLocationChange={(location) => update({ location })}
          onLocationCityChange={(locationCity) => update({ locationCity })}
          onValidityChange={setCanContinue}
        />
      )}
      {step === 6 && (
        <Step6BrandVibe
          value={state.brandVibe}
          onChange={(brandVibe) => update({ brandVibe })}
          onValidityChange={setCanContinue}
        />
      )}
      {step === 7 && (
        <Step7BusinessName
          value={state.businessName}
          onChange={(businessName) => update({ businessName })}
          onValidityChange={setCanContinue}
        />
      )}
      {step === 8 && (
        <Step8Handle
          businessName={state.businessName}
          value={state.handle}
          onChange={(handle) => update({ handle })}
          onValidityChange={setCanContinue}
        />
      )}
      {step === 9 && (
        <Step9Platforms
          value={state.platforms}
          onChange={(platforms) => update({ platforms })}
          onValidityChange={setCanContinue}
          onSkip={skipPlatforms}
        />
      )}
      {step === 10 && (
        <Step10YourName
          value={state.firstName}
          onChange={(firstName) => update({ firstName })}
          onValidityChange={setCanContinue}
        />
      )}
      {step === SIGNUP_STEP && (
        <Step11Signup sessionToken={state.sessionToken} firstName={state.firstName} />
      )}
    </OnboardingShell>
  );
}
