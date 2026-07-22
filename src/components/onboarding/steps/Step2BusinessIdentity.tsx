"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { HandleInput } from "@/components/onboarding/HandleInput";
import { SelectionCard } from "@/components/onboarding/SelectionCard";
import { CustomSiteCTA } from "@/components/website/CustomSiteCTA";
import { isOnlyEmoji, sanitizeText } from "@/lib/utils/sanitize";
import {
  collectErrors,
  validateLength,
  type ValidationResult,
} from "@/lib/utils/validate";
import {
  isUnsupportedBusinessType,
  UNSUPPORTED_FEATURE_LABELS,
} from "@/lib/onboarding/types";

const BUSINESS_NAME_PATTERN = /^[\p{L}0-9\s'&\-.]+$/u;

const BUSINESS_TYPES: Array<{
  id: string;
  icon: LucideIcon;
  label: string;
}> = [
  { id: "food-hospitality", icon: UtensilsCrossed, label: "Food & Hospitality" },
  { id: "beauty-wellness", icon: Scissors, label: "Beauty & Wellness" },
  { id: "professional-services", icon: Briefcase, label: "Professional Services" },
  { id: "creative-portfolio", icon: Camera, label: "Creative & Portfolio" },
  { id: "retail-fashion", icon: ShoppingBag, label: "Retail & Fashion" },
  { id: "technology", icon: Zap, label: "Technology" },
  { id: "health-medical", icon: Stethoscope, label: "Health & Medical" },
  { id: "events-booking", icon: Calendar, label: "Events & Booking" },
  { id: "ecommerce", icon: Store, label: "Online Store" },
  { id: "blog-publication", icon: Newspaper, label: "Blog / Publication" },
  { id: "nonprofit-community", icon: HeartHandshake, label: "Nonprofit / Community" },
  { id: "other", icon: MoreHorizontal, label: "Other" },
];

/** Primary set sized to fit viewport height without scroll on mobile (2-col grid). */
const PRIMARY_BUSINESS_TYPE_COUNT = 8;

interface Step2BusinessIdentityProps {
  businessName: string;
  handle: string;
  businessType: string;
  onBusinessNameChange: (value: string) => void;
  onHandleChange: (value: string) => void;
  onBusinessTypeChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step2BusinessIdentity({
  businessName,
  handle,
  businessType,
  onBusinessNameChange,
  onHandleChange,
  onBusinessTypeChange,
  onValidityChange,
}: Step2BusinessIdentityProps) {
  const [handleAvailable, setHandleAvailable] = useState(false);
  const [handleChecking, setHandleChecking] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [showAllTypes, setShowAllTypes] = useState(false);
  const unsupported = isUnsupportedBusinessType(businessType);

  const primaryTypes = BUSINESS_TYPES.slice(0, PRIMARY_BUSINESS_TYPE_COUNT);
  const moreTypes = BUSINESS_TYPES.slice(PRIMARY_BUSINESS_TYPE_COUNT);
  // Always show the full set once a type from the "more" bucket is already selected
  // (e.g. returning to this step), so the selection stays visible.
  const visibleTypes =
    showAllTypes || moreTypes.some((t) => t.id === businessType)
      ? BUSINESS_TYPES
      : primaryTypes;

  const validateName = useCallback((name: string): string | null => {
    const clean = sanitizeText(name);
    const errors = collectErrors([
      (): ValidationResult => {
        if (!clean) return { valid: false, error: "Business name is required." };
        return { valid: true };
      },
      (): ValidationResult => validateLength(clean, "Business name", 2, 80),
      (): ValidationResult => {
        if (isOnlyEmoji(name)) {
          return {
            valid: false,
            error: "Please enter your business name using text characters.",
          };
        }
        return { valid: true };
      },
      (): ValidationResult => {
        if (!/[a-zA-Z]/.test(clean)) {
          return {
            valid: false,
            error: "Please include at least one letter in your business name.",
          };
        }
        return { valid: true };
      },
      (): ValidationResult => {
        if (!BUSINESS_NAME_PATTERN.test(clean)) {
          return {
            valid: false,
            error:
              "Business name can only contain letters, numbers, and basic punctuation.",
          };
        }
        return { valid: true };
      },
    ]);
    return errors[0] ?? null;
  }, []);

  useEffect(() => {
    const err = validateName(businessName);
    setNameError(businessName.length > 0 ? err : null);
    const nameOk = err === null && sanitizeText(businessName).length >= 2;
    const typeOk = Boolean(businessType) && !unsupported;
    onValidityChange(nameOk && handleAvailable && !handleChecking && typeOk);
  }, [
    businessName,
    businessType,
    unsupported,
    handleAvailable,
    handleChecking,
    onValidityChange,
    validateName,
  ]);

  const onAvailabilityChange = useCallback(
    (available: boolean, checking: boolean) => {
      setHandleAvailable(available);
      setHandleChecking(checking);
    },
    []
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="onboarding-headline">Tell us about your business</h1>
        <p className="onboarding-subtext">
          Name, address, and category — so we can set up the right foundation.
        </p>
      </div>

      <section className="space-y-4">
        <p className="onboarding-eyebrow">Business name & address</p>
        <div className="onboarding-panel space-y-5">
          <div className="space-y-2">
            <Input
              value={businessName}
              onChange={(e) => onBusinessNameChange(e.target.value)}
              placeholder="e.g. Dan's Bakery"
              autoFocus
              className="onboarding-input h-12 text-base"
            />
            {nameError && <p className="text-sm text-error">{nameError}</p>}
          </div>
          <HandleInput
            businessName={businessName}
            value={handle}
            onChange={onHandleChange}
            onAvailabilityChange={onAvailabilityChange}
          />
        </div>
      </section>

      <section className="space-y-4">
        <p className="onboarding-eyebrow">Business category</p>
        <div className="grid grid-cols-2 gap-2.5">
          {visibleTypes.map((type) => (
            <SelectionCard
              key={type.id}
              icon={type.icon}
              label={type.label}
              selected={businessType === type.id}
              onSelect={() => onBusinessTypeChange(type.id)}
              compact
              scaleOnSelect
            />
          ))}
        </div>
        {!showAllTypes && moreTypes.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAllTypes(true)}
            className="min-h-[44px] w-full rounded-sm border border-dashed border-border px-3.5 py-2.5 text-sm text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-hover)] hover:text-foreground"
          >
            More categories…
          </button>
        )}
        {unsupported && (
          <CustomSiteCTA
            context="onboarding"
            requestedFeature={UNSUPPORTED_FEATURE_LABELS[businessType]}
          />
        )}
      </section>
    </div>
  );
}
