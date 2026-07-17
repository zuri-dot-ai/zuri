"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { HandleInput } from "@/components/onboarding/HandleInput";
import { isOnlyEmoji, sanitizeText } from "@/lib/utils/sanitize";
import {
  collectErrors,
  validateLength,
  type ValidationResult,
} from "@/lib/utils/validate";

const BUSINESS_NAME_PATTERN = /^[\p{L}0-9\s'&\-.]+$/u;

interface Step2BusinessHandleProps {
  businessName: string;
  handle: string;
  onBusinessNameChange: (value: string) => void;
  onHandleChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step2BusinessHandle({
  businessName,
  handle,
  onBusinessNameChange,
  onHandleChange,
  onValidityChange,
}: Step2BusinessHandleProps) {
  const [handleAvailable, setHandleAvailable] = useState(false);
  const [handleChecking, setHandleChecking] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

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
    onValidityChange(nameOk && handleAvailable && !handleChecking);
  }, [
    businessName,
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
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        What&apos;s your business called?
      </h1>

      <div className="surface space-y-6 p-6 sm:p-7">
        <div className="space-y-2">
          <Input
            value={businessName}
            onChange={(e) => onBusinessNameChange(e.target.value)}
            placeholder="e.g. Dan's Bakery"
            autoFocus
            className="h-14 text-lg"
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
    </div>
  );
}
