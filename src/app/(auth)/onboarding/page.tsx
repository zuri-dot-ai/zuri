"use client";

import { useCallback, useEffect, useState } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Step1Name } from "@/components/onboarding/steps/Step1Name";
import { Step2BusinessIdentity } from "@/components/onboarding/steps/Step2BusinessIdentity";
import { Step3OfferingsAudience } from "@/components/onboarding/steps/Step3OfferingsAudience";
import { Step6BrandVibe } from "@/components/onboarding/steps/Step6BrandVibe";
import { Step7Platforms } from "@/components/onboarding/steps/Step7Platforms";
import { Step8Building } from "@/components/onboarding/steps/Step8Building";
import {
  DEFAULT_ONBOARDING_STATE,
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_TOTAL_STEPS,
  type OnboardingState,
} from "@/lib/onboarding/types";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
const BUILDING_STEP = ONBOARDING_TOTAL_STEPS + 1; // 6

function loadSavedState(): {
  state: OnboardingState;
  welcomeBack: boolean;
} {
  if (typeof window === "undefined") {
    return { state: DEFAULT_ONBOARDING_STATE, welcomeBack: false };
  }

  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) {
      return {
        state: {
          ...DEFAULT_ONBOARDING_STATE,
          startedAt: new Date().toISOString(),
        },
        welcomeBack: false,
      };
    }

    const parsed = JSON.parse(raw) as OnboardingState;
    const startedAt = new Date(parsed.startedAt).getTime();
    const age = Date.now() - startedAt;

    if (!Number.isFinite(startedAt) || age > FORTY_EIGHT_HOURS_MS) {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      return {
        state: {
          ...DEFAULT_ONBOARDING_STATE,
          startedAt: new Date().toISOString(),
        },
        welcomeBack: false,
      };
    }

    const step = Math.min(
      BUILDING_STEP,
      Math.max(1, Number(parsed.step) || 1)
    );

    if (step >= BUILDING_STEP) {
      return {
        state: { ...DEFAULT_ONBOARDING_STATE, ...parsed, step: BUILDING_STEP },
        welcomeBack: false,
      };
    }

    return {
      state: { ...DEFAULT_ONBOARDING_STATE, ...parsed, step },
      welcomeBack: step > 1,
    };
  } catch {
    return {
      state: {
        ...DEFAULT_ONBOARDING_STATE,
        startedAt: new Date().toISOString(),
      },
      welcomeBack: false,
    };
  }
}

export default function OnboardingPage() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);
  const [canContinue, setCanContinue] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [welcomeBack, setWelcomeBack] = useState(false);

  useEffect(() => {
    const { state: saved, welcomeBack: wb } = loadSavedState();
    setState(saved);
    setWelcomeBack(wb);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (state.step <= ONBOARDING_TOTAL_STEPS) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, hydrated]);

  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const goNext = useCallback(() => {
    setDirection(1);
    setCanContinue(false);
    setWelcomeBack(false);
    setState((prev) => ({
      ...prev,
      step: Math.min(BUILDING_STEP, prev.step + 1),
    }));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setCanContinue(true);
    setWelcomeBack(false);
    setState((prev) => ({
      ...prev,
      step: Math.max(1, prev.step - 1),
    }));
  }, []);

  const skipPlatforms = useCallback(() => {
    setDirection(1);
    setState((prev) => ({
      ...prev,
      platforms: ["instagram", "facebook"],
      step: BUILDING_STEP,
    }));
  }, []);

  if (!hydrated) {
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
      hideControls={step === BUILDING_STEP}
      launchOnContinue={step === ONBOARDING_TOTAL_STEPS}
    >
      {step === 1 && (
        <Step1Name
          value={state.firstName}
          onChange={(firstName) => update({ firstName })}
          onValidityChange={setCanContinue}
        />
      )}
      {step === 2 && (
        <Step2BusinessIdentity
          businessName={state.businessName}
          handle={state.handle}
          businessType={state.businessType}
          onBusinessNameChange={(businessName) => update({ businessName })}
          onHandleChange={(handle) => update({ handle })}
          onBusinessTypeChange={(businessType) => update({ businessType })}
          onValidityChange={setCanContinue}
        />
      )}
      {step === 3 && (
        <Step3OfferingsAudience
          businessType={state.businessType}
          services={state.services}
          audienceTypes={state.audienceTypes}
          location={state.location}
          locationCity={state.locationCity}
          onServicesChange={(services) => update({ services })}
          onAudienceChange={(audienceTypes) => update({ audienceTypes })}
          onLocationChange={(location) => update({ location })}
          onLocationCityChange={(locationCity) => update({ locationCity })}
          onValidityChange={setCanContinue}
        />
      )}
      {step === 4 && (
        <Step6BrandVibe
          value={state.brandVibe}
          onChange={(brandVibe) => update({ brandVibe })}
          onValidityChange={setCanContinue}
        />
      )}
      {step === 5 && (
        <Step7Platforms
          value={state.platforms}
          onChange={(platforms) => update({ platforms })}
          onValidityChange={setCanContinue}
          onSkip={skipPlatforms}
        />
      )}
      {step === BUILDING_STEP && <Step8Building state={state} />}
    </OnboardingShell>
  );
}
