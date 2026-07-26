"use client";

import { useEffect, type ReactNode } from "react";
import { InlineError } from "@/components/ui/InlineError";
import {
  BUDGET_RANGE_LABELS,
  FEATURE_LABELS,
  PROJECT_TYPE_LABELS,
  TIMELINE_LABELS,
  type CustomSiteFormState,
} from "@/lib/custom-site/types";

interface Step5ReviewProps {
  form: CustomSiteFormState;
  submitError: string | null;
  onValidityChange: (valid: boolean) => void;
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

  const featureLabels = form.features
    .map((f) => FEATURE_LABELS[f])
    .join(", ");

  return (
    <div className="flex flex-col gap-4 lg:-mt-4 lg:gap-5">
      <div>
        <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em] text-[var(--text-primary)] leading-[1.15] sm:text-[1.625rem]">
          Review & submit
        </h1>
        <p className="mt-1.5 text-[0.9375rem] leading-normal text-[var(--text-secondary)]">
          Check your details — then send your custom project request.
        </p>
      </div>

      <dl className="onboarding-panel space-y-0 px-4 py-0.5 sm:px-5">
        <Row
          label="Project type"
          value={
            form.projectType
              ? PROJECT_TYPE_LABELS[form.projectType]
              : "—"
          }
        />
        <Row label="Description" value={form.description || "—"} />
        <Row label="Features" value={featureLabels || "—"} />
        {form.features.includes("custom-integrations") && (
          <Row
            label="Custom integrations"
            value={form.customIntegrationsText || "—"}
          />
        )}
        {form.features.includes("other") && (
          <Row label="Other features" value={form.otherFeaturesText || "—"} />
        )}
        <Row
          label="Budget"
          value={
            form.budgetRange
              ? BUDGET_RANGE_LABELS[form.budgetRange]
              : "Not specified"
          }
        />
        <Row
          label="Timeline"
          value={form.timeline ? TIMELINE_LABELS[form.timeline] : "—"}
        />
        {form.referenceUrl && (
          <Row label="Reference" value={form.referenceUrl} breakAll />
        )}
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
