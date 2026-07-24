"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
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
import { safeFetchJSON, FetchError } from "@/lib/utils/safe-fetch";

const SIGNUP_STEP = ONBOARDING_TOTAL_STEPS; // 11
const LAST_QUESTION_STEP = 10;
const PATCH_DEBOUNCE_MS = 500;

export default function StartPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);
  const [canContinue, setCanContinue] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [welcomeBack, setWelcomeBack] = useState(false);
  /** Logged in but onboarding_completed=false — skip Step11, call complete after Q10. */
  const [authResume, setAuthResume] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Bootstrap: auth check + anonymous session ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.onboarding_completed) {
            router.replace("/dashboard");
            return;
          }
          if (!cancelled) setAuthResume(true);
        }

        const { sessionToken } = await safeFetchJSON<{ sessionToken: string }>(
          "/api/onboarding/start",
          { method: "POST" }
        );
        if (cancelled) return;

        try {
          const existing = await safeFetchJSON<{
            data: Partial<OnboardingState>;
            currentStep: number;
          }>(
            `/api/onboarding/session?sessionToken=${encodeURIComponent(sessionToken)}`
          );

          if (cancelled) return;

          // Authenticated resume never lands on the signup step
          const maxStep = user ? LAST_QUESTION_STEP : SIGNUP_STEP;
          const step = Math.min(
            maxStep,
            Math.max(1, Number(existing.currentStep) || 1)
          );
          const clamped =
            user && step >= SIGNUP_STEP ? LAST_QUESTION_STEP : step;

          setState({
            ...DEFAULT_ONBOARDING_STATE,
            ...existing.data,
            sessionToken,
            step: clamped,
          });
          setWelcomeBack(clamped > 1);
        } catch {
          setState({ ...DEFAULT_ONBOARDING_STATE, sessionToken });
        }
      } catch {
        setState({ ...DEFAULT_ONBOARDING_STATE, sessionToken: "" });
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once
  }, [router]);

  // ── Debounced server-side persistence ───────────────────────────────────
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
        /* best-effort */
      });
    }, PATCH_DEBOUNCE_MS);

    return () => {
      if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
    };
  }, [state, ready]);

  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const finishAuthenticated = useCallback(
    async (snapshot: OnboardingState) => {
      if (!snapshot.sessionToken) {
        toast.error("Session expired. Please refresh and try again.");
        return;
      }
      setFinishing(true);
      try {
        const { sessionToken, step, startedAt, ...data } = snapshot;
        await safeFetchJSON("/api/onboarding/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken,
            step: LAST_QUESTION_STEP,
            data,
          }),
        });
        await safeFetchJSON("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken }),
        });
        router.push("/onboarding");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof FetchError
            ? err.message
            : "Could not finish setup. Please try again."
        );
        setFinishing(false);
      }
    },
    [router]
  );

  const goNext = useCallback(() => {
    setDirection(1);
    setCanContinue(false);
    setWelcomeBack(false);

    setState((prev) => {
      if (authResume && prev.step === LAST_QUESTION_STEP) {
        void finishAuthenticated(prev);
        return prev;
      }
      return {
        ...prev,
        step: Math.min(SIGNUP_STEP, prev.step + 1),
      };
    });
  }, [authResume, finishAuthenticated]);

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
    setState((prev) => {
      const next = {
        ...prev,
        platforms: ["instagram", "facebook"] as string[],
      };
      if (authResume) {
        // Skip to name step still required, or if already past — finish
        return { ...next, step: LAST_QUESTION_STEP };
      }
      return { ...next, step: SIGNUP_STEP };
    });
  }, [authResume]);

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
  const hideControls =
    (!authResume && step === SIGNUP_STEP) || finishing;
  const continueLabel =
    authResume && step === LAST_QUESTION_STEP
      ? finishing
        ? "Finishing…"
        : "Finish & build my site"
      : undefined;

  return (
    <OnboardingShell
      step={step}
      direction={direction}
      canContinue={canContinue && !finishing}
      showWelcomeBack={welcomeBack}
      onBack={goBack}
      onContinue={goNext}
      hideControls={hideControls}
      continueLabel={continueLabel}
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
      {!authResume && step === SIGNUP_STEP && (
        <Step11Signup
          sessionToken={state.sessionToken}
          firstName={state.firstName}
        />
      )}
    </OnboardingShell>
  );
}
