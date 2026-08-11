// src/lib/website/validate-field-lengths.ts
// docs/TEMPLATE_PROMPTS_V2.md §6.2 — code-level enforcement of the field
// length limits stated in the fillPlaceholders() prompt (§6.1). Called in
// the generation pipeline immediately after fillPlaceholders() returns,
// before applyPlaceholders() writes values into the HTML — a truncation
// happening at all signals the prompt-level instruction was ignored and is
// worth logging, even though truncation itself keeps the site from breaking.

interface FieldLimit {
  maxWords?: number;
  maxChars?: number;
}

const FIELD_LIMITS: Record<string, FieldLimit> = {
  tagline: { maxWords: 8 },
  about_body_short: { maxWords: 22 },
  about_body_long: { maxWords: 60 },
  service_name: { maxWords: 5, maxChars: 40 },
  service_description: { maxWords: 12, maxChars: 70 },
  testimonial_quote: { maxWords: 30 },
  testimonial_name: { maxWords: 4 },
  testimonial_role: { maxWords: 6 },
};

/** Category-specific fields (credentials, schedule, property details, etc.)
 *  not covered by the named keys above — max 6 words each per §1.4. */
const CATEGORY_SPECIFIC_PATTERN =
  /^(credential|class|property|stat)_\d+_[a-z_]+$/;
const CATEGORY_SPECIFIC_LIMIT: FieldLimit = { maxWords: 6 };

function fieldKeyToLimitKey(fieldKey: string): string | null {
  // "service_1_description" -> "service_description"
  // "testimonial_2_quote" -> "testimonial_quote"
  const match = fieldKey.match(
    /^(service|testimonial)_\d+_(name|description|quote|role)$/
  );
  if (match) return `${match[1]}_${match[2]}`;
  if (fieldKey in FIELD_LIMITS) return fieldKey;
  return null;
}

function truncateToWordLimit(value: string, maxWords: number): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return words.slice(0, maxWords).join(" ");
}

function truncateToCharLimit(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return value.slice(0, maxChars).trim();
}

export interface FieldValidationResult {
  fields: Record<string, string>;
  truncated: string[];
}

/**
 * Enforces §1.4 field length limits on already-filled placeholder values.
 * Never throws — always returns a safe, truncated-if-necessary field map,
 * plus the list of keys that had to be truncated (log this upstream; it's
 * a signal the prompt-level instruction in fillPlaceholders() was ignored
 * by the model, worth tracking even though the site itself won't break).
 */
export function validateAndTruncateFields(
  fields: Record<string, string>
): FieldValidationResult {
  const truncated: string[] = [];
  const result: Record<string, string> = { ...fields };

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== "string" || value.length === 0) continue;

    let limit: FieldLimit | null = null;
    const limitKey = fieldKeyToLimitKey(key);
    if (limitKey) {
      limit = FIELD_LIMITS[limitKey];
    } else if (CATEGORY_SPECIFIC_PATTERN.test(key)) {
      limit = CATEGORY_SPECIFIC_LIMIT;
    }

    if (!limit) continue;

    let out = value;
    let wasTruncated = false;

    if (limit.maxWords) {
      const next = truncateToWordLimit(out, limit.maxWords);
      if (next !== out) wasTruncated = true;
      out = next;
    }

    if (limit.maxChars && out.length > limit.maxChars) {
      out = truncateToCharLimit(out, limit.maxChars);
      wasTruncated = true;
    }

    if (wasTruncated) {
      truncated.push(key);
      result[key] = out;
    }
  }

  return { fields: result, truncated };
}
