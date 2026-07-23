"use client";

import { useEffect } from "react";
import {
  UtensilsCrossed,
  Scissors,
  Briefcase,
  Camera,
  ShoppingBag,
  Zap,
  Stethoscope,
  Calendar,
  MoreHorizontal,
  Store,
  Newspaper,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";
import { SelectionCard } from "@/components/onboarding/SelectionCard";
import { CustomSiteCTA } from "@/components/website/CustomSiteCTA";
import {
  isUnsupportedBusinessType,
  UNSUPPORTED_FEATURE_LABELS,
} from "@/lib/onboarding/types";

const ICONS: Record<string, LucideIcon> = {
  "food-hospitality": UtensilsCrossed,
  "beauty-wellness": Scissors,
  "professional-services": Briefcase,
  "creative-portfolio": Camera,
  "retail-fashion": ShoppingBag,
  technology: Zap,
  "health-medical": Stethoscope,
  "events-booking": Calendar,
  other: MoreHorizontal,
  ecommerce: Store,
  "blog-publication": Newspaper,
  "nonprofit-community": HeartHandshake,
};

const BUSINESS_TYPES: Array<{ id: string; label: string }> = [
  { id: "food-hospitality", label: "Food & Hospitality" },
  { id: "beauty-wellness", label: "Beauty & Wellness" },
  { id: "professional-services", label: "Professional Services" },
  { id: "creative-portfolio", label: "Creative & Portfolio" },
  { id: "retail-fashion", label: "Retail & Fashion" },
  { id: "technology", label: "Technology" },
  { id: "health-medical", label: "Health & Medical" },
  { id: "events-booking", label: "Events & Booking" },
  { id: "ecommerce", label: "Online Store" },
  { id: "blog-publication", label: "Blog / Publication" },
  { id: "nonprofit-community", label: "Nonprofit / Community" },
  { id: "other", label: "Other" },
];

const PRIMARY_COUNT = 9;

interface Step1CategoryProps {
  value: string;
  onChange: (businessType: string) => void;
  onValidityChange: (valid: boolean) => void;
}

/**
 * Onboarding V2 Step 1 (docs/01_ONBOARDING_V2.md §4 Step 1) — the very
 * first question, before any account exists. Category alone deterministically
 * resolves the design archetype (Decision 3) — the caller re-derives it via
 * resolveArchetypeFromCategory() on selection.
 */
export function Step1Category({
  value,
  onChange,
  onValidityChange,
}: Step1CategoryProps) {
  const unsupported = isUnsupportedBusinessType(value);

  useEffect(() => {
    onValidityChange(Boolean(value) && !unsupported);
  }, [value, unsupported, onValidityChange]);

  const primary = BUSINESS_TYPES.slice(0, PRIMARY_COUNT);
  const more = BUSINESS_TYPES.slice(PRIMARY_COUNT);
  const visible = more.some((t) => t.id === value)
    ? BUSINESS_TYPES
    : primary;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="onboarding-headline">What kind of business is this?</h1>
        <p className="onboarding-subtext">
          This shapes everything about your site — from layout to imagery.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {visible.map((type) => (
          <SelectionCard
            key={type.id}
            icon={ICONS[type.id]}
            label={type.label}
            selected={value === type.id}
            onSelect={() => onChange(type.id)}
            compact
            scaleOnSelect
          />
        ))}
      </div>

      {unsupported && (
        <CustomSiteCTA
          context="onboarding"
          requestedFeature={UNSUPPORTED_FEATURE_LABELS[value as never]}
        />
      )}
    </div>
  );
}
