"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ZuriSpinner } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { marketingUrl } from "@/lib/marketing-url";
import { createClient } from "@/lib/supabase/client";
import { safeFetchJSON, FetchError } from "@/lib/utils/safe-fetch";
import { Step1ProjectType } from "@/components/custom-site/Step1ProjectType";
import { Step2Features } from "@/components/custom-site/Step2Features";
import { Step3Scope } from "@/components/custom-site/Step3Scope";
import { Step4Signup } from "@/components/custom-site/Step4Signup";
import { Step5Review } from "@/components/custom-site/Step5Review";
import {
  CUSTOM_SITE_TOTAL_STEPS,
  CUSTOM_SITE_TOTAL_STEPS_AUTHED,
  DEFAULT_CUSTOM_SITE_STATE,
  ONBOARDING_TO_PROJECT_TYPE,
  isCustomSiteProjectType,
  type CustomSiteFormState,
  type CustomSiteProjectType,
} from "@/lib/custom-site/types";

const PATCH_DEBOUNCE_MS = 500;

function PremiumLoader({ label }: { label: string }) {
  return (
    <div className="onboarding-shell flex min-h-dvh w-full flex-col items-center justify-center gap-5 px-5">
      <ZuriSpinner size={40} label={label} />
      <p className="text-sm text-[var(--text-tertiary)]">{label}…</p>
    </div>
  );
}

function ConfirmationState() {
  return (
    <div className="onboarding-shell flex min-h-dvh w-full flex-col">
      <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col px-5 pb-8 pt-10 sm:px-6">
        <div className="mb-10">
          <Logo variant="image" size="navbar" href={marketingUrl()} />
        </div>
        <div className="flex flex-1 flex-col justify-center space-y-6 md:pb-[8vh]">
          <h1 className="onboarding-headline">
            Custom project submitted — we&apos;ll be in touch
          </h1>
          <p className="onboarding-subtext max-w-md">
            Our team will review your request and follow up by email. You can
            check status anytime from your dashboard.
          </p>
          <div className="pt-2">
            <Button asChild>
              <a href="/dashboard">Go to dashboard</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomSiteFunnelInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [canContinue, setCanContinue] = useState(false);
  const [form, setForm] = useState<CustomSiteFormState>(
    DEFAULT_CUSTOM_SITE_STATE
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalSteps = isAuthed
    ? CUSTOM_SITE_TOTAL_STEPS_AUTHED
    : CUSTOM_SITE_TOTAL_STEPS;

  function uiToLogical(ui: number): number {
    if (!isAuthed) return ui;
    if (ui <= 3) return ui;
    return 5; // UI step 4 = review
  }

  const logicalStep = uiToLogical(step);
  const isSignupStep = !isAuthed && logicalStep === 4;
  const isReviewStep = logicalStep === 5;

  const onValidityChange = useCallback((valid: boolean) => {
    setCanContinue(valid);
  }, []);

  function patchForm(partial: Partial<CustomSiteFormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  const persistSession = useCallback(
    (nextForm: CustomSiteFormState, nextStep: number) => {
      if (!sessionToken) return;
      if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
      patchTimerRef.current = setTimeout(() => {
        void safeFetchJSON("/api/custom-site/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken,
            step: nextStep,
            data: nextForm,
          }),
        }).catch(() => {
          // Best-effort persistence
        });
      }, PATCH_DEBOUNCE_MS);
    },
    [sessionToken]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: open } = await supabase
            .from("custom_site_requests")
            .select("id, status")
            .eq("user_id", user.id)
            .in("status", ["pending", "in_review", "approved"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (open) {
            router.replace("/dashboard");
            return;
          }
          if (!cancelled) setIsAuthed(true);
        }

        const { sessionToken: token } = await safeFetchJSON<{
          sessionToken: string;
        }>("/api/custom-site/start", { method: "POST" });
        if (cancelled) return;
        setSessionToken(token);

        let restored = DEFAULT_CUSTOM_SITE_STATE;
        let restoredStep = 1;
        try {
          const existing = await safeFetchJSON<{
            data: Partial<CustomSiteFormState>;
            currentStep: number;
          }>(
            `/api/custom-site/session?sessionToken=${encodeURIComponent(token)}`
          );
          restored = {
            ...DEFAULT_CUSTOM_SITE_STATE,
            ...existing.data,
          };
          restoredStep = Math.max(1, Number(existing.currentStep) || 1);
        } catch {
          // Fresh session
        }

        const typeParam = searchParams.get("type");
        if (
          typeParam &&
          isCustomSiteProjectType(typeParam) &&
          !restored.projectType
        ) {
          restored = { ...restored, projectType: typeParam };
        } else if (
          typeParam &&
          ONBOARDING_TO_PROJECT_TYPE[typeParam] &&
          !restored.projectType
        ) {
          restored = {
            ...restored,
            projectType: ONBOARDING_TO_PROJECT_TYPE[typeParam],
          };
        }

        if (cancelled) return;
        setForm(restored);

        const maxUi = user
          ? CUSTOM_SITE_TOTAL_STEPS_AUTHED
          : CUSTOM_SITE_TOTAL_STEPS;
        const answersComplete =
          Boolean(restored.projectType) &&
          restored.description.trim().length >= 10 &&
          restored.features.length > 0 &&
          Boolean(restored.timeline);

        // Authed (incl. post-OAuth): skip signup; jump to review when answers ready
        let logical: number;
        if (user) {
          if (answersComplete || restoredStep >= 4) {
            logical = 5;
          } else {
            logical = Math.min(3, Math.max(1, restoredStep));
          }
        } else {
          logical = Math.min(
            CUSTOM_SITE_TOTAL_STEPS,
            Math.max(1, restoredStep)
          );
        }
        const ui = user ? (logical <= 3 ? logical : 4) : logical;
        setStep(Math.min(maxUi, ui));
      } catch (err) {
        console.error("[custom-site] bootstrap failed:", err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
    };
  }, [router, searchParams]);

  useEffect(() => {
    if (!ready || !sessionToken) return;
    persistSession(form, logicalStep);
  }, [form, logicalStep, ready, sessionToken, persistSession]);

  function goBack() {
    if (step <= 1) return;
    setDirection(-1);
    setCanContinue(false);
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await safeFetchJSON("/api/custom-site/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof FetchError
          ? err.message
          : "Could not submit. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function goContinue() {
    if (!canContinue) return;

    if (isReviewStep) {
      void handleSubmit();
      return;
    }

    setDirection(1);
    setCanContinue(false);
    setStep((s) => Math.min(totalSteps, s + 1));
  }

  function handleSignedIn() {
    setIsAuthed(true);
    setDirection(1);
    setCanContinue(false);
    // Authed total is 4; review is UI step 4
    setStep(4);
  }

  if (!ready) {
    return <PremiumLoader label="Loading" />;
  }

  if (submitting) {
    return <PremiumLoader label="Submitting your request" />;
  }

  if (submitted) {
    return <ConfirmationState />;
  }

  return (
    <OnboardingShell
      step={step}
      totalSteps={totalSteps}
      direction={direction}
      canContinue={canContinue}
      onBack={goBack}
      onContinue={goContinue}
      hideControls={isSignupStep}
      continueLabel={isReviewStep ? "Submit request" : undefined}
      contentAlign="start"
    >
      {logicalStep === 1 && (
        <Step1ProjectType
          projectType={form.projectType}
          description={form.description}
          onProjectTypeChange={(projectType: CustomSiteProjectType) =>
            patchForm({ projectType })
          }
          onDescriptionChange={(description) => patchForm({ description })}
          onValidityChange={onValidityChange}
        />
      )}
      {logicalStep === 2 && (
        <Step2Features
          features={form.features}
          customIntegrationsText={form.customIntegrationsText}
          otherFeaturesText={form.otherFeaturesText}
          onFeaturesChange={(features) => patchForm({ features })}
          onCustomIntegrationsTextChange={(customIntegrationsText) =>
            patchForm({ customIntegrationsText })
          }
          onOtherFeaturesTextChange={(otherFeaturesText) =>
            patchForm({ otherFeaturesText })
          }
          onValidityChange={onValidityChange}
        />
      )}
      {logicalStep === 3 && (
        <Step3Scope
          budgetRange={form.budgetRange}
          timeline={form.timeline}
          referenceUrl={form.referenceUrl}
          onBudgetRangeChange={(budgetRange) => patchForm({ budgetRange })}
          onTimelineChange={(timeline) => patchForm({ timeline })}
          onReferenceUrlChange={(referenceUrl) => patchForm({ referenceUrl })}
          onValidityChange={onValidityChange}
        />
      )}
      {logicalStep === 4 && (
        <Step4Signup
          sessionToken={sessionToken}
          onSignedIn={handleSignedIn}
          onValidityChange={onValidityChange}
        />
      )}
      {logicalStep === 5 && (
        <Step5Review
          form={form}
          submitError={submitError}
          onValidityChange={onValidityChange}
        />
      )}
    </OnboardingShell>
  );
}

export default function CustomSitePage() {
  return (
    <Suspense fallback={<PremiumLoader label="Loading" />}>
      <CustomSiteFunnelInner />
    </Suspense>
  );
}
