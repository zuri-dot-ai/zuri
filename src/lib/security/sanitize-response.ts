import { NextResponse } from "next/server";

// Fields that must NEVER appear in any API response to the client
const BLOCKED_RESPONSE_FIELDS = new Set([
  "access_token_encrypted",
  "refresh_token_encrypted",
  "password",
  "password_hash",
  "is_admin", // Never expose admin status to the client
  "anonymized_ip",
  "webhook_payload",
  "reviewer_notes", // Admin-only
  "contact_email", // Agency private email (use inquiry system instead)
  "token_expires_at", // Internal
]);

export function sanitizeApiResponse<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!BLOCKED_RESPONSE_FIELDS.has(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized as Partial<T>;
}

// Standard error response — never leak internal details
export function errorResponse(
  status: number,
  publicMessage: string,
  internalDetails?: string
): NextResponse {
  if (internalDetails) {
    console.error(`[${status}] ${internalDetails}`);
  }
  return NextResponse.json({ error: publicMessage }, { status });
}
