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

const BUSINESS_TYPES: Array<{
  id: string;
  icon: LucideIcon;
  label: string;
  descriptor: string;
}> = [
  {
    id: "food-hospitality",
    icon: UtensilsCrossed,
    label: "Food & Hospitality",
    descriptor: "Restaurant, bakery, catering, café",
  },
  {
    id: "beauty-wellness",
    icon: Scissors,
    label: "Beauty & Wellness",
    descriptor: "Salon, spa, skincare, fitness",
  },
  {
    id: "professional-services",
    icon: Briefcase,
    label: "Professional Services",
    descriptor: "Consultant, lawyer, accountant, coach",
  },
  {
    id: "creative-portfolio",
    icon: Camera,
    label: "Creative & Portfolio",
    descriptor: "Photographer, designer, artist, musician",
  },
  {
    id: "retail-fashion",
    icon: ShoppingBag,
    label: "Retail & Fashion",
    descriptor: "Clothing, accessories, boutique, brand",
  },
  {
    id: "technology",
    icon: Zap,
    label: "Technology",
    descriptor: "App, software, startup, digital agency",
  },
  {
    id: "health-medical",
    icon: Stethoscope,
    label: "Health & Medical",
    descriptor: "Clinic, pharmacy, doctor, therapist",
  },
  {
    id: "events-booking",
    icon: Calendar,
    label: "Events & Booking",
    descriptor: "Venue, planner, class, appointment",
  },
  {
    id: "ecommerce",
    icon: Store,
    label: "Online Store",
    descriptor: "E-commerce, inventory, checkout",
  },
  {
    id: "blog-publication",
    icon: Newspaper,
    label: "Blog / Publication",
    descriptor: "Content site, magazine, newsletter CMS",
  },
  {
    id: "nonprofit-community",
    icon: HeartHandshake,
    label: "Nonprofit / Community",
    descriptor: "Donations, membership, community hub",
  },
  {
    id: "other",
    icon: MoreHorizontal,
    label: "Other",
    descriptor: "Anything else",
  },
];

interface Step3BusinessTypeProps {
  value: string;
  onChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step3BusinessType({
  value,
  onChange,
  onValidityChange,
}: Step3BusinessTypeProps) {
  const unsupported = isUnsupportedBusinessType(value);

  useEffect(() => {
    // Unsupported branches cannot continue onboarding — CustomSiteCTA only
    onValidityChange(Boolean(value) && !unsupported);
  }, [value, unsupported, onValidityChange]);

  function select(id: string) {
    onChange(id);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        What kind of business is it?
      </h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {BUSINESS_TYPES.map((type) => (
          <SelectionCard
            key={type.id}
            icon={type.icon}
            label={type.label}
            descriptor={type.descriptor}
            selected={value === type.id}
            onSelect={() => select(type.id)}
          />
        ))}
      </div>
      {unsupported && (
        <CustomSiteCTA
          context="onboarding"
          requestedFeature={UNSUPPORTED_FEATURE_LABELS[value]}
        />
      )}
    </div>
  );
}
