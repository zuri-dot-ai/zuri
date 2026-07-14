import { sanitizeText } from "@/lib/utils/sanitize";

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateRequired(
  value: unknown,
  fieldName: string
): ValidationResult {
  const str = sanitizeText(value);
  if (!str) return { valid: false, error: `${fieldName} is required.` };
  return { valid: true };
}

export function validateLength(
  value: string,
  fieldName: string,
  min: number,
  max: number
): ValidationResult {
  if (value.length < min) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${min} characters.`,
    };
  }
  if (value.length > max) {
    return {
      valid: false,
      error: `${fieldName} must be ${max} characters or fewer.`,
    };
  }
  return { valid: true };
}

export function validateNoPlaceholder(
  value: string,
  fieldName: string
): ValidationResult {
  const patterns = [/lorem ipsum/i, /\[.*?\]/, /placeholder/i, /example\.com/i];
  for (const pattern of patterns) {
    if (pattern.test(value)) {
      return {
        valid: false,
        error: `${fieldName} contains placeholder text.`,
      };
    }
  }
  return { valid: true };
}

// Collect all validation errors before returning (better UX than stopping at first error)
export function collectErrors(
  checks: Array<() => ValidationResult>
): string[] {
  return checks
    .map((check) => check())
    .filter((r) => !r.valid)
    .map((r) => (r as { valid: false; error: string }).error);
}
