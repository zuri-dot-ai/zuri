"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/utils/sanitize";
import {
  AGENCY_SERVICE_LABELS,
  type AgencyService,
} from "@/lib/agencies/types";

const SERVICE_KEYS = Object.keys(AGENCY_SERVICE_LABELS) as AgencyService[];
const DESC_MIN = 30;
const DESC_SOFT_MAX = 200;
const DESC_HARD_MAX = 500;

const chipClass = (selected: boolean) =>
  cn(
    "min-h-9 rounded-sm border px-2.5 py-1.5 text-xs transition-all duration-150 sm:min-h-10 sm:px-3 sm:text-sm",
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
    onValidityChange(Boolean(primaryService) && descOk);
  }, [primaryService, description, onValidityChange]);

  // Keep secondary list free of the current primary (stale picks after re-select).
  useEffect(() => {
    if (!primaryService) return;
    if (!secondaryServices.includes(primaryService)) return;
    onSecondaryChange(secondaryServices.filter((s) => s !== primaryService));
  }, [primaryService, secondaryServices, onSecondaryChange]);

  function toggleSecondary(service: AgencyService) {
    if (service === primaryService) return;
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

  const secondaryOptions = SERVICE_KEYS.filter((s) => s !== primaryService);
  const descLen = description.length;
  const counterOverSoft = descLen > DESC_SOFT_MAX;

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <div>
        <h1 className="onboarding-headline text-[1.5rem] sm:text-[1.75rem] lg:text-[1.75rem]">
          What do you do?
        </h1>
        <p className="onboarding-subtext mt-1 text-sm">
          Primary specialty powers marketplace filters — pick carefully.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:gap-4">
        <div className="space-y-2">
          <p className="onboarding-label">Primary specialty</p>
          <div className="flex flex-wrap gap-1.5">
            {SERVICE_KEYS.map((s) => (
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

        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="onboarding-label">Secondary services</p>
            <p className="onboarding-helper">Optional</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {secondaryOptions.map((s) => (
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

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <label className="onboarding-label" htmlFor="agency-description">
              Short description
            </label>
            <p
              className={cn(
                "text-xs",
                counterOverSoft
                  ? "text-error"
                  : "text-[var(--text-tertiary)]"
              )}
            >
              {descLen} / {DESC_SOFT_MAX}
              {descLen < DESC_MIN && (
                <span className="ml-1.5">
                  ({DESC_MIN - descLen} more)
                </span>
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
            className="onboarding-input w-full resize-none px-3 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
