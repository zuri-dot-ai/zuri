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
import { ZuriSpinner } from "@/components/ui/skeleton";
import {
  DEFAULT_ONBOARDING_STATE,
  ONBOARDING_TOTAL_STEPS,
  isUnsupportedBusinessType,
  type OnboardingState,
} from "@/lib/onboarding/types";
import {
  clearOnboardingSessionBackup,
  readOnboardingSessionBackup,
  saveOnboardingSessionBackup,
} from "@/lib/onboarding/session-backup";
import { ONBOARDING_TO_PROJECT_TYPE } from "@/lib/custom-site/types";
import { resolveArchetypeFromCategory } from "@/lib/website/archetypes";
import { safeFetchJSON, FetchError } from "@/lib/utils/safe-fetch";
import {
  clearInvalidLocalSession,
  isInvalidAuthSessionError,
} from "@/lib/auth/clear-invalid-session";

/** In-shell branded loader — keeps OnboardingHeroPanel mounted (same as apply). */
function OnboardingInlineLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-5">
      <ZuriSpinner size={40} label={label} />
      <p className="text-sm text-[var(--text-tertiary)]">{label}…</p>
    </div>
  );
}

const SIGNUP_STEP = ONBOARDING_TOTAL_STEPS; // 11
const LAST_QUESTION_STEP = 10;
const PATCH_DEBOUNCE_MS = 500;

function hasMeaningfulOnboardingData(
  data: Partial<OnboardingState> | null | undefined
): boolean {
  if (!data) return false;
  return Boolean(
    data.businessType ||
      data.businessName ||
      data.firstName ||
      data.handle ||
      (Array.isArray(data.services) && data.services.length > 0)
  );
}

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
  const stateRef = useRef(state);
  stateRef.current = state;

  // Surface auth-callback complete failures without looking like a cold start.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") !== "complete_failed") return;
    toast.error(
      "Almost there — we couldn't finish setting up your site. Continue from where you left off."
    );
    router.replace("/start", { scroll: false });
  }, [router]);

  // ── Bootstrap: auth check + anonymous session ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        let activeUser = user;
        if (!activeUser && isInvalidAuthSessionError(userError)) {
          await clearInvalidLocalSession(supabase);
        }

        if (activeUser) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", activeUser.id)
            .maybeSingle();

          if (profile?.onboarding_completed) {
            clearOnboardingSessionBackup();
            router.replace("/dashboard");
            return;
          }
          if (!cancelled) setAuthResume(true);
        }

        const restoreToken = readOnboardingSessionBackup();
        const { sessionToken } = await safeFetchJSON<{ sessionToken: string }>(
          "/api/onboarding/start",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              restoreToken ? { restoreToken } : {}
            ),
          }
        );
        if (cancelled) return;

        saveOnboardingSessionBackup(sessionToken);

        try {
          const existing = await safeFetchJSON<{
            data: Partial<OnboardingState>;
            currentStep: number;
          }>(
            `/api/onboarding/session?sessionToken=${encodeURIComponent(sessionToken)}`
          );

          if (cancelled) return;

          // Authenticated resume never lands on the signup step
          const maxStep = activeUser ? LAST_QUESTION_STEP : SIGNUP_STEP;
          let step = Math.min(
            maxStep,
            Math.max(1, Number(existing.currentStep) || 1)
          );

          // complete_failed / clamp must not dump a filled session to step 1.
          // If answers exist but current_step was lost, resume near the end.
          if (
            step <= 1 &&
            hasMeaningfulOnboardingData(existing.data)
          ) {
            step = activeUser ? LAST_QUESTION_STEP : SIGNUP_STEP;
          }

          const clamped =
            activeUser && step >= SIGNUP_STEP ? LAST_QUESTION_STEP : step;

          setState({
            ...DEFAULT_ONBOARDING_STATE,
            ...existing.data,
            sessionToken,
            step: clamped,
          });
          setWelcomeBack(clamped > 1 || hasMeaningfulOnboardingData(existing.data));
        } catch {
          // Prefer backup restore over blank step-1 if start returned a token
          // but session GET failed (transient). Keep token so PATCH can retry.
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

  /** Immediate PATCH so signup/OAuth/complete never race the debounce. */
  const flushSession = useCallback(async () => {
    const snapshot = stateRef.current;
    if (!snapshot.sessionToken) return;
    if (patchTimerRef.current) {
      clearTimeout(patchTimerRef.current);
      patchTimerRef.current = null;
    }
    const { sessionToken, step, startedAt, ...data } = snapshot;
    saveOnboardingSessionBackup(sessionToken);
    await safeFetchJSON("/api/onboarding/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken, step, data }),
    });
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
        if (patchTimerRef.current) {
          clearTimeout(patchTimerRef.current);
          patchTimerRef.current = null;
        }
        await safeFetchJSON("/api/onboarding/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken,
            step: LAST_QUESTION_STEP,
            data,
          }),
        });
        const result = await safeFetchJSON<{
          success: boolean;
          jobId: string | null;
          triggeredGeneration?: boolean;
        }>("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken }),
        });
        clearOnboardingSessionBackup();

        if (result.jobId && result.triggeredGeneration === false) {
          void safeFetchJSON("/api/ai/generate-website", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: result.jobId }),
          }).catch(() => {
            /* GenerationStatusCard will retry on dashboard */
          });
        }

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
      // Unsupported categories leave standard AI onboarding for the custom funnel.
      if (prev.step === 1 && isUnsupportedBusinessType(prev.businessType)) {
        const projectType =
          ONBOARDING_TO_PROJECT_TYPE[prev.businessType] ?? prev.businessType;
        router.push(
          `/custom-site?from=onboarding&type=${encodeURIComponent(projectType)}`
        );
        return prev;
      }

      if (authResume && prev.step === LAST_QUESTION_STEP) {
        void finishAuthenticated(prev);
        return prev;
      }
      return {
        ...prev,
        step: Math.min(SIGNUP_STEP, prev.step + 1),
      };
    });
  }, [authResume, finishAuthenticated, router]);

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

  const step = state.step;
  const hideControls =
    !ready || finishing || (!authResume && step === SIGNUP_STEP);
  const continueLabel =
    authResume && step === LAST_QUESTION_STEP
      ? "Finish & build my site"
      : undefined;

  return (
    <OnboardingShell
      step={ready ? step : 1}
      direction={direction}
      canContinue={ready && canContinue && !finishing}
      showWelcomeBack={ready && welcomeBack}
      onBack={goBack}
      onContinue={goNext}
      hideControls={hideControls}
      continueLabel={continueLabel}
    >
      {!ready ? (
        <OnboardingInlineLoader label="Loading" />
      ) : finishing ? (
        <OnboardingInlineLoader label="Building your presence" />
      ) : (
        <>
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
              sessionToken={state.sessionToken}
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
              onFlushSession={flushSession}
            />
          )}
        </>
      )}
    </OnboardingShell>
  );
}
