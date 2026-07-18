import { Resend } from "resend";

let client: Resend | null = null;

/**
 * Lazy Resend client — never construct at module load so Next.js
 * "Collecting page data" succeeds when RESEND_API_KEY is unset at build.
 */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}
