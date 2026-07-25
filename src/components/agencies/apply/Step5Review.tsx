"use client";

import { useEffect } from "react";
import { AGENCY_SERVICE_LABELS } from "@/lib/agencies/types";
import { PriceRangeLabel } from "@/lib/agencies/price-range-label";
import {
  resolveLocationCity,
  type AgencyApplyFormState,
} from "./types";
import { InlineError } from "@/components/ui/InlineError";
import type { ReactNode } from "react";

interface Step5ReviewProps {
  form: AgencyApplyFormState;
  submitError: string | null;
  onValidityChange: (valid: boolean) => void;
  onRetry?: () => void;
}

function Row({
  label,
  value,
  breakAll,
}: {
  label: string;
  value: ReactNode;
  breakAll?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-1.5 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 lg:py-2">
      <dt className="shrink-0 text-xs text-[var(--text-tertiary)]">{label}</dt>
      <dd
        className={
          breakAll
            ? "line-clamp-2 break-all text-sm text-foreground sm:text-right"
            : "line-clamp-2 text-sm text-foreground sm:text-right"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export function Step5Review({
  form,
  submitError,
  onValidityChange,
}: Step5ReviewProps) {
  useEffect(() => {
    onValidityChange(true);
  }, [onValidityChange]);

  const secondaryLabels = form.secondaryServices
    .map((s) => AGENCY_SERVICE_LABELS[s])
    .join(", ");

  return (
    <div className="flex flex-col gap-4 lg:-mt-4 lg:gap-5">
      <div>
        <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em] text-[var(--text-primary)] leading-[1.15] sm:text-[1.625rem]">
          Review & submit
        </h1>
        <p className="mt-1.5 text-[0.9375rem] leading-normal text-[var(--text-secondary)]">
          Check your details — then send your application for review.
        </p>
      </div>

      <dl className="onboarding-panel space-y-0 px-4 py-0.5 sm:px-5">
        <Row label="Agency" value={form.agencyName} />
        <Row label="Location" value={resolveLocationCity(form)} />
        <Row label="Website" value={form.website} breakAll />
        <Row
          label="Primary specialty"
          value={
            form.primaryService
              ? AGENCY_SERVICE_LABELS[form.primaryService]
              : "—"
          }
        />
        {secondaryLabels && (
          <Row label="Secondary services" value={secondaryLabels} />
        )}
        <Row label="Description" value={form.description} />
        <Row label="Email" value={form.email} />
        {form.whatsapp && <Row label="WhatsApp / phone" value={form.whatsapp} />}
        {form.priceRange && (
          <Row
            label="Price range"
            value={<PriceRangeLabel priceRange={form.priceRange} />}
          />
        )}
        <Row
          label="Logo"
          value={form.logoUrl ? "Uploaded" : "Not provided"}
        />
        <Row
          label="Portfolio images"
          value={
            form.portfolioImages.length > 0
              ? `${form.portfolioImages.length} uploaded`
              : "Not provided"
          }
        />
      </dl>

      {submitError && (
        <div className="space-y-1">
          <InlineError message={submitError} />
          <p className="text-sm text-[var(--text-tertiary)]">
            Fix anything needed, then tap Submit again.
          </p>
        </div>
      )}
    </div>
  );
}
