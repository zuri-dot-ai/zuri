export type GeminiErrorType =
  | "INVALID_ARGUMENT" // Bad prompt or parameters
  | "PERMISSION_DENIED" // API key issue
  | "RESOURCE_EXHAUSTED" // Quota exceeded
  | "INTERNAL" // Google server error
  | "UNAVAILABLE" // Google service unavailable
  | "TIMEOUT" // Request timed out
  | "SAFETY_BLOCK" // Content blocked by safety filter
  | "JSON_PARSE_FAILURE"; // Response was not valid JSON

export async function handleGeminiError(
  err: unknown,
  context: string
): Promise<{ shouldRetry: boolean; fallback?: string }> {
  const errMessage = String(err);

  // Model deprecated/mistyped — retrying the same model will never succeed.
  // This is the exact failure class that caused calendar generation to
  // silently fall back to template content (retired gemini-2.0-flash /
  // gemini-2.5-flash IDs returning 404). Fail loud so it's visible in logs
  // instead of being lumped into "Unknown error".
  if (
    errMessage.includes("status=404") ||
    errMessage.includes("NOT_FOUND") ||
    /is not found for API version|no longer available to new users/i.test(
      errMessage
    )
  ) {
    console.error(
      `[Gemini] Model not found/unavailable in ${context} — check GEMINI_FLASH_MODEL/GEMINI_PRO_MODEL against ` +
        `https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY. Raw error: ${errMessage}`
    );
    return { shouldRetry: false };
  }

  // Bad request — malformed body (safety settings, tools, schema). Retrying
  // identically will not help; surface loudly instead of silently retrying.
  if (errMessage.includes("status=400") || errMessage.includes("INVALID_ARGUMENT")) {
    console.error(`[Gemini] Invalid request in ${context}: ${errMessage}`);
    return { shouldRetry: false };
  }

  // Safety filter block — do NOT retry with same prompt
  if (errMessage.includes("SAFETY") || errMessage.includes("blocked")) {
    console.warn(`[Gemini] Safety block in ${context}: ${errMessage}`);
    return { shouldRetry: false };
  }

  // Quota exceeded — caller applies backoff between retries
  if (
    errMessage.includes("RESOURCE_EXHAUSTED") ||
    errMessage.includes("429")
  ) {
    console.warn(`[Gemini] Quota exceeded in ${context}`);
    return { shouldRetry: true };
  }

  // Timeout — retry once with same prompt
  if (errMessage.includes("AbortError") || errMessage.includes("timeout")) {
    console.warn(`[Gemini] Timeout in ${context} — retrying once`);
    return { shouldRetry: true };
  }

  // JSON parse failure — retry with stricter prompt instruction
  if (errMessage.includes("JSON") || errMessage.includes("parse")) {
    console.warn(
      `[Gemini] JSON parse failure in ${context} — retrying with stricter prompt`
    );
    return { shouldRetry: true };
  }

  // Server error — retry with backoff
  if (errMessage.includes("INTERNAL") || errMessage.includes("500")) {
    await new Promise((r) => setTimeout(r, 5000));
    return { shouldRetry: true };
  }

  // Unknown — do not retry
  console.error(`[Gemini] Unknown error in ${context}:`, err);
  return { shouldRetry: false };
}
