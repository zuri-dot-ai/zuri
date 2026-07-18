import { Resend } from "resend";

let client: Resend | null = null;

/**
 * Lazy Resend client — never construct at module load so Next.js
 * "Collecting page data" succeeds when RESEND_API_KEY is unset at build.
 */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  // #region agent log
  fetch("http://127.0.0.1:7419/ingest/076876bf-f6bf-42a9-9aff-97004d9bbbbe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "91f293",
    },
    body: JSON.stringify({
      sessionId: "91f293",
      location: "lib/email/resend-client.ts:getResend",
      message: "getResend called",
      data: { hasKey: !!key, keyLen: key?.length ?? 0, cached: !!client },
      timestamp: Date.now(),
      hypothesisId: "A",
      runId: "post-fix",
    }),
  }).catch(() => {});
  // #endregion
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}
