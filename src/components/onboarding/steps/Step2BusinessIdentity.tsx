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
  const unsupported = isUnsupportedBusinessType(businessType);

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
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-foreground md:text-[2rem]">
          Tell us about your business
        </h1>
        <p className="mt-2 text-[0.9375rem] text-[var(--text-secondary)]">
          Name, address, and category — so we can set up the right foundation.
        </p>
      </div>

      <section className="space-y-4">
        <p className="onboarding-eyebrow">Business name & address</p>
        <div className="space-y-5 rounded-md border border-border bg-[var(--bg-secondary)] p-5 sm:p-6">
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
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {BUSINESS_TYPES.map((type) => (
            <SelectionCard
              key={type.id}
              icon={type.icon}
              label={type.label}
              selected={businessType === type.id}
              onSelect={() => onBusinessTypeChange(type.id)}
              compact
            />
          ))}
        </div>
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
