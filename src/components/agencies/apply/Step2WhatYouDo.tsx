"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/utils/sanitize";
import {
  AGENCY_SERVICE_LABELS,
  type AgencyService,
} from "@/lib/agencies/types";

/** Primary specialty — Digital PR, Graphic Design, Copywriting, SEO omitted. */
const PRIMARY_OPTIONS: AgencyService[] = [
  "social_media_management",
  "content_creation",
  "photography_videography",
  "paid_advertising",
  "branding",
  "email_marketing",
  "website_design",
  "influencer_marketing",
];

/** Secondary never offers Digital PR, Copywriting, or Branding & Identity. */
const SECONDARY_EXCLUDED = new Set<AgencyService>([
  "digital_pr",
  "copywriting",
  "branding",
]);

const SECONDARY_OPTIONS = (
  Object.keys(AGENCY_SERVICE_LABELS) as AgencyService[]
).filter((s) => !SECONDARY_EXCLUDED.has(s));

const DESC_MIN = 30;
const DESC_SOFT_MAX = 200;
const DESC_HARD_MAX = 500;

const chipClass = (selected: boolean) =>
  cn(
    "min-h-9 rounded-sm border px-3 py-1.5 text-[13px] transition-all duration-150 sm:min-h-10 sm:text-sm",
    selected
      ? "border-gold bg-gold/10 text-foreground"
      : "border-border bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
  );

interface Step2WhatYouDoProps {
  primaryService: AgencyService | null;
  secondaryServices: AgencyService[];
  description: string;
  onPrimaryChange: (service: AgencyService) => void;
  onSecondaryChange: (services: AgencyService[]) => void;
  onDescriptionChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step2WhatYouDo({
  primaryService,
  secondaryServices,
  description,
  onPrimaryChange,
  onSecondaryChange,
  onDescriptionChange,
  onValidityChange,
}: Step2WhatYouDoProps) {
  useEffect(() => {
    const desc = sanitizeText(description);
    const descOk = desc.length >= DESC_MIN && desc.length <= DESC_HARD_MAX;
    const primaryOk =
      primaryService !== null && PRIMARY_OPTIONS.includes(primaryService);
    onValidityChange(primaryOk && descOk);
  }, [primaryService, description, onValidityChange]);

  // Keep secondary free of the current primary and of permanently excluded keys.
  useEffect(() => {
    const cleaned = secondaryServices.filter(
      (s) => s !== primaryService && !SECONDARY_EXCLUDED.has(s)
    );
    if (cleaned.length !== secondaryServices.length) {
      onSecondaryChange(cleaned);
    }
  }, [primaryService, secondaryServices, onSecondaryChange]);

  function toggleSecondary(service: AgencyService) {
    if (service === primaryService || SECONDARY_EXCLUDED.has(service)) return;
    onSecondaryChange(
      secondaryServices.includes(service)
        ? secondaryServices.filter((s) => s !== service)
        : [...secondaryServices, service]
    );
  }

  function selectPrimary(service: AgencyService) {
    onPrimaryChange(service);
    if (secondaryServices.includes(service)) {
      onSecondaryChange(secondaryServices.filter((s) => s !== service));
    }
  }

  const secondaryVisible = SECONDARY_OPTIONS.filter(
    (s) => s !== primaryService
  );
  const descLen = description.length;
  const counterOverSoft = descLen > DESC_SOFT_MAX;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div>
        <h1 className="onboarding-headline">What do you do?</h1>
        <p className="onboarding-subtext">
          Primary specialty powers marketplace filters — pick carefully.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:gap-8">
        <div className="space-y-3">
          <p className="onboarding-label">Primary specialty</p>
          <div className="flex flex-wrap gap-2">
            {PRIMARY_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPrimary(s)}
                aria-pressed={primaryService === s}
                className={chipClass(primaryService === s)}
              >
                {AGENCY_SERVICE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="onboarding-label">Secondary services</p>
            <p className="onboarding-helper">Optional</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {secondaryVisible.map((s) => (
              <button
                key={`secondary-${s}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggleSecondary(s)}
                aria-pressed={secondaryServices.includes(s)}
                className={chipClass(secondaryServices.includes(s))}
              >
                {AGENCY_SERVICE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <label className="onboarding-label" htmlFor="agency-description">
              Short description
            </label>
            <p
              className={cn(
                "text-xs",
                counterOverSoft ? "text-error" : "text-[var(--text-tertiary)]"
              )}
            >
              {descLen} / {DESC_SOFT_MAX}
              {descLen < DESC_MIN && (
                <span className="ml-1.5">({DESC_MIN - descLen} more)</span>
              )}
            </p>
          </div>
          <textarea
            id="agency-description"
            rows={2}
            maxLength={DESC_HARD_MAX}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="We help Nigerian brands grow with social-first creative and paid media."
            className="onboarding-input w-full resize-none px-3 py-2.5 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
