"use client";

import { useEffect, useMemo } from "react";
import { Check } from "lucide-react";
import { SelectionCard } from "@/components/onboarding/SelectionCard";
import { cn } from "@/lib/utils";
import { getToneSamplePair } from "@/lib/onboarding/types";

const BRAND_VIBES = [
  {
    id: "bold-vibrant",
    label: "Bold & Vibrant",
    descriptor: "Strong, energetic, stands out",
    gradient: "linear-gradient(90deg, #E85D04 0%, #F48C06 45%, #C9A227 100%)",
  },
  {
    id: "clean-modern",
    label: "Clean & Modern",
    descriptor: "Minimal, sharp, tech-forward",
    gradient: "linear-gradient(90deg, #2563EB 0%, #E2E8F0 50%, #64748B 100%)",
  },
  {
    id: "warm-friendly",
    label: "Warm & Friendly",
    descriptor: "Approachable, cozy, inviting",
    gradient: "linear-gradient(90deg, #C45C26 0%, #F5E6D3 50%, #D4A373 100%)",
  },
  {
    id: "elegant-luxurious",
    label: "Elegant & Luxurious",
    descriptor: "Premium, refined, exclusive",
    gradient: "linear-gradient(90deg, #0C0C0E 0%, #C9A227 55%, #F5F0E8 100%)",
  },
  {
    id: "professional-trustworthy",
    label: "Professional & Trustworthy",
    descriptor: "Credible, calm, reliable",
    gradient: "linear-gradient(90deg, #1E3A5F 0%, #FFFFFF 55%, #94A3B8 100%)",
  },
  {
    id: "creative-artistic",
    label: "Creative & Artistic",
    descriptor: "Expressive, unique, unconventional",
    gradient: "linear-gradient(90deg, #0C0C0E 0%, #FF006E 50%, #F8F8F8 100%)",
  },
];

interface Step6BrandVibeProps {
  value: string;
  onChange: (value: string) => void;
  businessType: string;
  toneSampleChoice: string;
  onToneSampleChoiceChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step6BrandVibe({
  value,
  onChange,
  businessType,
  toneSampleChoice,
  onToneSampleChoiceChange,
  onValidityChange,
}: Step6BrandVibeProps) {
  const [sampleA, sampleB] = useMemo(
    () => getToneSamplePair(businessType),
    [businessType]
  );

  useEffect(() => {
    onValidityChange(Boolean(value) && Boolean(toneSampleChoice));
  }, [value, toneSampleChoice, onValidityChange]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="onboarding-headline">How should your brand feel?</h1>
        <p className="onboarding-subtext">
          Pick the mood that should come through on your site.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BRAND_VIBES.map((vibe) => (
          <SelectionCard
            key={vibe.id}
            label={vibe.label}
            descriptor={vibe.descriptor}
            gradientSwatch={vibe.gradient}
            selected={value === vibe.id}
            onSelect={() => onChange(vibe.id)}
            scaleOnSelect
            className="p-5"
          />
        ))}
      </div>

      <section className="space-y-3">
        <div>
          <p className="onboarding-eyebrow">Which sounds more like you?</p>
          <p className="onboarding-helper mt-1.5">
            This helps set the voice for your site copy.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {[sampleA, sampleB].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => onToneSampleChoiceChange(sample)}
              aria-pressed={toneSampleChoice === sample}
              className={cn(
                "min-h-[44px] rounded-md border p-4 text-left text-sm transition-all duration-150",
                toneSampleChoice === sample
                  ? "scale-[1.01] border-gold bg-gold/[0.08] text-foreground"
                  : "border-border bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <span>&ldquo;{sample}&rdquo;</span>
                {toneSampleChoice === sample && (
                  <Check className="size-4 shrink-0 text-gold" strokeWidth={2.5} />
                )}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
