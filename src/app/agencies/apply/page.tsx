"use client";

import { useCallback, useState } from "react";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { ZuriSpinner } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { marketingUrl } from "@/lib/marketing-url";
import { safeFetchJSON, FetchError } from "@/lib/utils/safe-fetch";
import { Step1Identity } from "@/components/agencies/apply/Step1Identity";
import { Step2WhatYouDo } from "@/components/agencies/apply/Step2WhatYouDo";
import { Step3Contact } from "@/components/agencies/apply/Step3Contact";
import { Step4Assets } from "@/components/agencies/apply/Step4Assets";
import { Step5Review } from "@/components/agencies/apply/Step5Review";
import {
  AGENCY_APPLY_TOTAL_STEPS,
  DEFAULT_AGENCY_APPLY_STATE,
  normalizeWebsiteUrl,
  resolveLocationCity,
  type AgencyApplyFormState,
} from "@/components/agencies/apply/types";
import type { ApplyUploadedImage } from "@/components/agencies/apply/ApplyUploadZone";
import type { AgencyService } from "@/lib/agencies/types";

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
            Thanks — we&apos;ll review your application
          </h1>
          <p className="onboarding-subtext max-w-md">
            We review all applications within 7 business days and will be in
            touch shortly at the email you provided.
          </p>
          <div className="pt-2">
            <Button asChild>
              <a href="/agencies">Browse agencies</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgencyApplyPage() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [canContinue, setCanContinue] = useState(false);
  const [form, setForm] = useState<AgencyApplyFormState>(
    DEFAULT_AGENCY_APPLY_STATE
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onValidityChange = useCallback((valid: boolean) => {
    setCanContinue(valid);
  }, []);

  function patchForm(partial: Partial<AgencyApplyFormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function goBack() {
    if (step <= 1) return;
    setDirection(-1);
    setStep((s) => s - 1);
    setSubmitError(null);
  }

  async function submitApplication() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await safeFetchJSON<{ message: string }>("/api/agencies/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agency_name: form.agencyName.trim(),
          website: normalizeWebsiteUrl(form.website),
          location_city: resolveLocationCity(form),
          primary_service: form.primaryService,
          secondary_services: form.secondaryServices,
          description: form.description.trim(),
          email: form.email.trim(),
          whatsapp: form.whatsapp.trim() || null,
          price_range: form.priceRange,
          logo_url: form.logoUrl,
          portfolio_image_urls: form.portfolioImages.map((img) => img.url),
        }),
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof FetchError
          ? err.message
          : "Could not submit your application. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (!canContinue) return;
    if (step < AGENCY_APPLY_TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
      setSubmitError(null);
      return;
    }
    void submitApplication();
  }

  function handleLogoChange(images: ApplyUploadedImage[]) {
    const first = images[0];
    patchForm({
      logoUrl: first?.url ?? null,
      logoPublicId: first?.publicId ?? null,
    });
  }

  if (submitting) {
    return <PremiumLoader label="Submitting your application" />;
  }

  if (submitted) {
    return <ConfirmationState />;
  }

  return (
    <OnboardingShell
      step={step}
      direction={direction}
      canContinue={canContinue}
      onBack={goBack}
      onContinue={goNext}
      totalSteps={AGENCY_APPLY_TOTAL_STEPS}
      continueLabel={
        step === AGENCY_APPLY_TOTAL_STEPS ? "Submit application" : undefined
      }
    >
      {step === 1 && (
        <Step1Identity
          agencyName={form.agencyName}
          locationId={form.locationId}
          locationCityOther={form.locationCityOther}
          website={form.website}
          onAgencyNameChange={(agencyName) => patchForm({ agencyName })}
          onLocationIdChange={(locationId) => patchForm({ locationId })}
          onLocationCityOtherChange={(locationCityOther) =>
            patchForm({ locationCityOther })
          }
          onWebsiteChange={(website) => patchForm({ website })}
          onValidityChange={onValidityChange}
        />
      )}
      {step === 2 && (
        <Step2WhatYouDo
          primaryService={form.primaryService}
          secondaryServices={form.secondaryServices}
          description={form.description}
          onPrimaryChange={(primaryService: AgencyService) =>
            patchForm({ primaryService })
          }
          onSecondaryChange={(secondaryServices) =>
            patchForm({ secondaryServices })
          }
          onDescriptionChange={(description) => patchForm({ description })}
          onValidityChange={onValidityChange}
        />
      )}
      {step === 3 && (
        <Step3Contact
          email={form.email}
          whatsapp={form.whatsapp}
          priceRange={form.priceRange}
          onEmailChange={(email) => patchForm({ email })}
          onWhatsappChange={(whatsapp) => patchForm({ whatsapp })}
          onPriceRangeChange={(priceRange) => patchForm({ priceRange })}
          onValidityChange={onValidityChange}
        />
      )}
      {step === 4 && (
        <Step4Assets
          logoUrl={form.logoUrl}
          logoPublicId={form.logoPublicId}
          portfolioImages={form.portfolioImages}
          onLogoChange={handleLogoChange}
          onPortfolioChange={(portfolioImages) =>
            patchForm({ portfolioImages })
          }
          onValidityChange={onValidityChange}
        />
      )}
      {step === 5 && (
        <Step5Review
          form={form}
          submitError={submitError}
          onValidityChange={onValidityChange}
        />
      )}
    </OnboardingShell>
  );
}
