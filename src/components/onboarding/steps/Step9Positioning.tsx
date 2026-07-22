"use client";

import { useEffect, useState } from "react";
import { SelectionCard } from "@/components/onboarding/SelectionCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/utils/sanitize";
import { PRIMARY_GOALS } from "@/lib/onboarding/types";

const PITCH_LINE_SOFT_LIMIT = 80;
const PITCH_LINE_MAX = 140;

interface Step9PositioningProps {
  pitchLine: string;
  primaryGoal: string;
  onPitchLineChange: (value: string) => void;
  onPrimaryGoalChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step9Positioning({
  pitchLine,
  primaryGoal,
  onPitchLineChange,
  onPrimaryGoalChange,
  onValidityChange,
}: Step9PositioningProps) {
  const [touched, setTouched] = useState(false);
  const clean = sanitizeText(pitchLine);

  useEffect(() => {
    const pitchOk = clean.length >= 2 && clean.length <= PITCH_LINE_MAX;
    onValidityChange(pitchOk && Boolean(primaryGoal));
  }, [clean, primaryGoal, onValidityChange]);

  const overSoft = pitchLine.length > PITCH_LINE_SOFT_LIMIT;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="onboarding-headline">What makes you different?</h1>
        <p className="onboarding-subtext">
          One sentence. This shapes how your site talks about you.
        </p>
      </div>

      <section className="space-y-4">
        <p className="onboarding-eyebrow">Your pitch line</p>
        <div className="onboarding-panel space-y-2">
          <Input
            value={pitchLine}
            onChange={(e) => onPitchLineChange(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g. The only bakery in Lekki that delivers before 7am"
            autoFocus
            maxLength={PITCH_LINE_MAX}
            className="onboarding-input h-12 text-base"
          />
          <div className="flex items-center justify-between">
            <p
              className={cn(
                "text-xs transition-colors duration-150",
                overSoft ? "text-gold" : "text-[var(--text-tertiary)]"
              )}
            >
              {overSoft
                ? "Getting long — shorter tends to land better."
                : "Keep it tight — one clear sentence."}
            </p>
            <p className="onboarding-helper shrink-0">
              {pitchLine.length}/{PITCH_LINE_MAX}
            </p>
          </div>
          {touched && clean.length > 0 && clean.length < 2 && (
            <p className="text-sm text-error">
              A couple more words would help.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="onboarding-eyebrow">Main goal</p>
          <p className="onboarding-helper mt-1.5">
            What should your site mainly do for you?
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {PRIMARY_GOALS.map((goal) => (
            <SelectionCard
              key={goal.id}
              label={goal.label}
              descriptor={goal.descriptor}
              selected={primaryGoal === goal.id}
              onSelect={() => onPrimaryGoalChange(goal.id)}
              scaleOnSelect
            />
          ))}
        </div>
      </section>
    </div>
  );
}
