"use client";

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  collectErrors,
  validateLength,
  type ValidationResult,
} from "@/lib/utils/validate";
import { sanitizeText } from "@/lib/utils/sanitize";

const FIRST_NAME_PATTERN = /^[\p{L}]+(?:[\s'-][\p{L}]+)*$/u;

function isValidName(raw: string): boolean {
  const clean = sanitizeText(raw);
  const errors = collectErrors([
    (): ValidationResult => {
      if (!clean) return { valid: false, error: "Please enter your name." };
      return { valid: true };
    },
    (): ValidationResult => validateLength(clean, "First name", 2, 50),
    (): ValidationResult => {
      if (!FIRST_NAME_PATTERN.test(clean)) {
        return {
          valid: false,
          error: "Please enter your name using letters only.",
        };
      }
      return { valid: true };
    },
  ]);
  return errors.length === 0;
}

interface Step1NameProps {
  value: string;
  onChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step1Name({ value, onChange, onValidityChange }: Step1NameProps) {
  useEffect(() => {
    onValidityChange(isValidName(value));
  }, [value, onValidityChange]);

  const clean = sanitizeText(value);
  const showError =
    value.length > 0 &&
    clean.length >= 1 &&
    !FIRST_NAME_PATTERN.test(clean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="onboarding-headline">
          Welcome to Zuri. What should we call you?
        </h1>
        <p className="onboarding-subtext">Takes about 2 minutes.</p>
      </div>
      <div className="onboarding-panel">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your first name"
          autoFocus
          autoComplete="given-name"
          className="onboarding-input h-14 text-lg"
        />
        {showError && (
          <p className="mt-2 text-sm text-error">
            Please enter your name using letters only.
          </p>
        )}
      </div>
    </div>
  );
}
