export const HANDLE_RULES = {
  min_length: 3,
  max_length: 30,
  pattern: /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/,
  // Pattern means:
  // - Starts and ends with a letter or number
  // - Middle characters: letters, numbers, hyphens only
  // - No consecutive hyphens (enforced separately)
  // - Min 3 chars total, max 30 chars total
};

/** Handles permanently reserved — cannot be registered by any user */
export const RESERVED_HANDLES = new Set([
  // App routes
  "app",
  "api",
  "www",
  "admin",
  "dashboard",
  "onboarding",
  "preview",
  "login",
  "signup",
  "register",
  "logout",
  "auth",
  "oauth",
  "callback",
  "settings",
  "billing",
  "account",
  "profile",
  "pricing",
  "plans",
  "payment",
  "checkout",
  "verify",
  "webhook",
  "cron",
  "internal",
  "health",
  "status",
  "monitor",

  // Zuri brand
  "zuri",
  "team",
  "support",
  "help",
  "contact",
  "about",
  "press",
  "media",
  "legal",
  "terms",
  "privacy",
  "careers",
  "blog",
  "news",
  "updates",
  "changelog",
  "docs",
  "developers",

  // Marketplace
  "agencies",
  "agency",
  "marketplace",

  // Common squatting targets
  "google",
  "facebook",
  "instagram",
  "twitter",
  "x",
  "tiktok",
  "apple",
  "microsoft",
  "amazon",
  "netflix",
  "youtube",

  // Technical/harmful
  "null",
  "undefined",
  "test",
  "demo",
  "example",
  "localhost",
  "staging",
  "prod",
  "production",
  "dev",
  "development",
  "static",
  "assets",
  "images",
  "fonts",
  "icons",
  "public",
  "root",
  "system",
  "server",

  // Content policy
  "sex",
  "porn",
  "xxx",
  "nsfw",
  "adult",
]);

export function validateHandle(
  handle: string
): { valid: boolean; error?: string } {
  const clean = handle.toLowerCase().trim();

  if (!clean) return { valid: false, error: "Handle is required." };
  if (clean.length < HANDLE_RULES.min_length) {
    return {
      valid: false,
      error: `Handle must be at least ${HANDLE_RULES.min_length} characters.`,
    };
  }
  if (clean.length > HANDLE_RULES.max_length) {
    return {
      valid: false,
      error: `Handle must be ${HANDLE_RULES.max_length} characters or fewer.`,
    };
  }
  if (!HANDLE_RULES.pattern.test(clean)) {
    return {
      valid: false,
      error:
        "Handle can only contain lowercase letters, numbers, and hyphens. It cannot start or end with a hyphen.",
    };
  }
  if (/--/.test(clean)) {
    return {
      valid: false,
      error: "Handle cannot contain consecutive hyphens.",
    };
  }
  if (RESERVED_HANDLES.has(clean)) {
    return {
      valid: false,
      error: "This handle is reserved. Please choose a different one.",
    };
  }

  return { valid: true };
}

export function generateHandle(businessName: string): string {
  return businessName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export function generateHandleSuggestions(takenHandle: string): string[] {
  const base = takenHandle.replace(/-\d+$/, "");
  return [`${base}-ng`, `${base}-hq`, `${base}1`, `${base}-official`]
    .filter((h) => h.length >= 3 && h.length <= 30)
    .filter((h) => !RESERVED_HANDLES.has(h))
    .slice(0, 3);
}
