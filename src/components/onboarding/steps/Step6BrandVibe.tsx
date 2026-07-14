"use client";

import { useEffect } from "react";
import { SelectionCard } from "@/components/onboarding/SelectionCard";

const BRAND_VIBES = [
  {
    id: "bold-vibrant",
    label: "Bold & Vibrant",
    descriptor: "Strong, energetic, stands out",
    swatches: ["#E85D04", "#F48C06", "#C9A84C"],
  },
  {
    id: "clean-modern",
    label: "Clean & Modern",
    descriptor: "Minimal, sharp, tech-forward",
    swatches: ["#2563EB", "#F8FAFC", "#64748B"],
  },
  {
    id: "warm-friendly",
    label: "Warm & Friendly",
    descriptor: "Approachable, cozy, inviting",
    swatches: ["#C45C26", "#F5E6D3", "#D4A373"],
  },
  {
    id: "elegant-luxurious",
    label: "Elegant & Luxurious",
    descriptor: "Premium, refined, exclusive",
    swatches: ["#0C0C0E", "#C9A84C", "#F5F0E8"],
  },
  {
    id: "professional-trustworthy",
    label: "Professional & Trustworthy",
    descriptor: "Credible, calm, reliable",
    swatches: ["#1E3A5F", "#FFFFFF", "#94A3B8"],
  },
  {
    id: "creative-artistic",
    label: "Creative & Artistic",
    descriptor: "Expressive, unique, unconventional",
    swatches: ["#0C0C0E", "#FF006E", "#F8F8F8"],
  },
];

interface Step6BrandVibeProps {
  value: string;
  onChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step6BrandVibe({
  value,
  onChange,
  onValidityChange,
}: Step6BrandVibeProps) {
  useEffect(() => {
    onValidityChange(Boolean(value));
  }, [value, onValidityChange]);

  function select(id: string) {
    onChange(id);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        How should your brand feel?
      </h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BRAND_VIBES.map((vibe) => (
          <SelectionCard
            key={vibe.id}
            label={vibe.label}
            descriptor={vibe.descriptor}
            swatches={vibe.swatches}
            selected={value === vibe.id}
            onSelect={() => select(vibe.id)}
          />
        ))}
      </div>
    </div>
  );
}
