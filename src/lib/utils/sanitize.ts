// Strip all HTML tags and dangerous characters from user text
export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .normalize("NFC") // Unicode normalization — prevents homograph attacks
    .trim()
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/javascript:/gi, "") // Strip JS protocol
    .replace(/on\w+\s*=/gi, "") // Strip event handlers
    .replace(/data:\s*text\/html/gi, "") // Strip data URIs
    .replace(/\0/g, "") // Strip null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Strip control characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

// Sanitize for use in AI prompts — additional layer on top of sanitizeText
export function sanitizeForPrompt(input: unknown): string {
  const clean = sanitizeText(input);
  return clean
    .replace(/ignore\s+(previous|all|any)\s+instructions?/gi, "")
    .replace(/you\s+are\s+now\s+/gi, "you are ")
    .replace(/disregard\s+(all\s+)?(previous|prior|above)/gi, "")
    .replace(/new\s+system\s+(prompt|instructions?)/gi, "")
    .replace(/\bDAN\s*(?:mode|prompt)?\b/gi, "")
    .replace(/\bjailbreak\b/gi, "")
    .replace(/act\s+as\s+(?:if|though)\s+you/gi, "")
    .replace(/pretend\s+(?:you\s+are|to\s+be)/gi, "")
    .replace(/override\s+(?:your|all)\s+/gi, "")
    .trim()
    .slice(0, 2000); // Hard cap on user text in prompts
}

// Sanitize a URL — validates and normalizes
export function sanitizeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const clean = input.trim();
  try {
    const url = new URL(clean);
    // Only allow http and https — no javascript:, data:, ftp:, etc.
    if (!["http:", "https:"].includes(url.protocol)) return null;
    // Block localhost and private IPs (SSRF prevention)
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.startsWith("172.16.") ||
      host === "0.0.0.0" ||
      host.endsWith(".local")
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

// Sanitize a handle
export function sanitizeHandle(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

// Sanitize a phone number — digits, spaces, +, (, ) only
export function sanitizePhone(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().replace(/[^0-9\s+().-]/g, "").slice(0, 20);
}

// Sanitize a hex color
export function sanitizeColor(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const clean = input.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) return clean.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) return clean.toUpperCase();
  return null;
}

// Detect if input is only emojis (no real text content)
export function isOnlyEmoji(str: string): boolean {
  const withoutEmoji = str
    .replace(/\p{Emoji_Presentation}/gu, "")
    .replace(/\p{Emoji}\uFE0F/gu, "")
    .trim();
  return withoutEmoji.length === 0 && str.trim().length > 0;
}

// Validate email
export function isValidEmail(email: string): boolean {
  // RFC 5322 simplified — good enough for registration
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(
    email
  );
}

// Validate domain format
export function isValidDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(
    domain.toLowerCase()
  );
}
