"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { isOnlyEmoji, sanitizeText } from "@/lib/utils/sanitize";
import {
  collectErrors,
  validateLength,
  type ValidationResult,
} from "@/lib/utils/validate";

const BUSINESS_NAME_PATTERN = /^[\p{L}0-9\s'&\-.]+$/u;

interface Step7BusinessNameProps {
  value: string;
  onChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step7BusinessName({
  value,
  onChange,
  onValidityChange,
}: Step7BusinessNameProps) {
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((name: string): string | null => {
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
            error: "Business name can only contain letters, numbers, and basic punctuation.",
          };
        }
        return { valid: true };
      },
    ]);
    return errors[0] ?? null;
  }, []);

  useEffect(() => {
    const err = validate(value);
    setError(value.length > 0 ? err : null);
    onValidityChange(err === null && sanitizeText(value).length >= 2);
  }, [value, validate, onValidityChange]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="onboarding-headline">What&apos;s your business called?</h1>
        <p className="onboarding-subtext">This is how customers will know you.</p>
      </div>
      <div className="onboarding-panel">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Dan's Bakery"
          autoFocus
          className="onboarding-input h-14 text-lg"
        />
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </div>
    </div>
  );
}
