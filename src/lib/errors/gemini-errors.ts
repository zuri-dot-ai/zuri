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

  // Safety filter block — do NOT retry with same prompt
  if (errMessage.includes("SAFETY") || errMessage.includes("blocked")) {
    console.warn(`[Gemini] Safety block in ${context}`);
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
