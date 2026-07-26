"use client";

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BUDGET_RANGES,
  BUDGET_RANGE_LABELS,
  TIMELINES,
  TIMELINE_LABELS,
  type CustomSiteBudgetRange,
  type CustomSiteTimeline,
} from "@/lib/custom-site/types";

interface Step3ScopeProps {
  budgetRange: CustomSiteBudgetRange | "";
  timeline: CustomSiteTimeline | "";
  referenceUrl: string;
  onBudgetRangeChange: (value: CustomSiteBudgetRange | "") => void;
  onTimelineChange: (value: CustomSiteTimeline) => void;
  onReferenceUrlChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step3Scope({
  budgetRange,
  timeline,
  referenceUrl,
  onBudgetRangeChange,
  onTimelineChange,
  onReferenceUrlChange,
  onValidityChange,
}: Step3ScopeProps) {
  useEffect(() => {
    onValidityChange(Boolean(timeline));
  }, [timeline, onValidityChange]);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div>
        <h1 className="onboarding-headline">Scope & timeline</h1>
        <p className="onboarding-subtext">
          Optional budget helps us recommend the right approach — timeline is
          required.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="onboarding-label">
            Estimated budget{" "}
            <span className="text-[var(--text-tertiary)]">(optional)</span>
          </p>
          <p className="onboarding-helper mt-0.5">
            Rough range in Naira — not a quote
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {BUDGET_RANGES.map((key) => (
            <button
              key={key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                onBudgetRangeChange(budgetRange === key ? "" : key)
              }
              className={cn(
                "min-h-10 rounded-sm border px-3.5 py-2 text-sm transition-all duration-150",
                budgetRange === key
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
              )}
            >
              {BUDGET_RANGE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="onboarding-label">Timeline expectation</p>
        <div className="grid grid-cols-2 gap-2.5">
          {TIMELINES.map((key) => (
            <button
              key={key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onTimelineChange(key)}
              className={cn(
                "min-h-11 rounded-sm border px-3.5 py-2.5 text-sm transition-all duration-150",
                timeline === key
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-border bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
              )}
            >
              {TIMELINE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="onboarding-label" htmlFor="reference-url">
          Reference / inspiration link{" "}
          <span className="text-[var(--text-tertiary)]">(optional)</span>
        </label>
        <Input
          id="reference-url"
          type="url"
          inputMode="url"
          value={referenceUrl}
          onChange={(e) => onReferenceUrlChange(e.target.value)}
          placeholder="https://"
          className="onboarding-input h-11"
        />
      </div>
    </div>
  );
}
