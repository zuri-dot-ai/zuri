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

  const descLen = description.length;
  const counterOverSoft = descLen > DESC_SOFT_MAX;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="onboarding-headline">What do you do?</h1>
        <p className="onboarding-subtext">
          Your primary specialty powers marketplace filters — pick carefully.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <p className="onboarding-label">Primary specialty</p>
          <div className="flex flex-wrap gap-2">
            {SERVICE_KEYS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => selectPrimary(s)}
                className={cn(
                  "min-h-[44px] rounded-sm border px-3.5 py-2 text-sm transition-all duration-150",
                  primaryService === s
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-border bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                )}
              >
                {AGENCY_SERVICE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="onboarding-label">Secondary services</p>
            <p className="onboarding-helper mt-0.5">Optional — select any extras</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SERVICE_KEYS.filter((s) => s !== primaryService).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSecondary(s)}
                className={cn(
                  "min-h-[44px] rounded-sm border px-3.5 py-2 text-sm transition-all duration-150",
                  secondaryServices.includes(s)
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-border bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                )}
              >
                {AGENCY_SERVICE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="onboarding-label" htmlFor="agency-description">
            Short description
          </label>
          <p className="onboarding-helper">
            1–2 sentences for your public card blurb
          </p>
          <textarea
            id="agency-description"
            rows={4}
            maxLength={DESC_HARD_MAX}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="We help Nigerian brands grow with social-first creative and paid media."
            className="onboarding-input w-full resize-none px-3 py-2.5 text-sm"
          />
          <p
            className={cn(
              "text-right text-xs",
              counterOverSoft
                ? "text-error"
                : "text-[var(--text-tertiary)]"
            )}
          >
            {descLen} / {DESC_SOFT_MAX}
            {descLen < DESC_MIN && (
              <span className="ml-2">
                ({DESC_MIN - descLen} more needed)
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
