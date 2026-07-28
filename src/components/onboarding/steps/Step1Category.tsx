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

interface Step1CategoryProps {
  value: string;
  onChange: (businessType: string) => void;
  onValidityChange: (valid: boolean) => void;
}

/**
 * Onboarding V2 Step 1 — category alone resolves the design archetype.
 * Unsupported types enable Continue and branch into the custom-site funnel.
 */
export function Step1Category({
  value,
  onChange,
  onValidityChange,
}: Step1CategoryProps) {
  const unsupported = isUnsupportedBusinessType(value);

  useEffect(() => {
    onValidityChange(Boolean(value));
  }, [value, onValidityChange]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="onboarding-headline">What kind of business is this?</h1>
        <p className="onboarding-subtext">
          This shapes everything about your site — from layout to imagery.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {BUSINESS_TYPES.map((type) => (
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
          businessType={value}
          requestedFeature={UNSUPPORTED_FEATURE_LABELS[value]}
        />
      )}
    </div>
  );
}
