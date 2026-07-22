// Called at app startup (in middleware.ts or layout.tsx server component)

const REQUIRED_SERVER_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY",
  "FLUTTERWAVE_SECRET_KEY",
  "FLUTTERWAVE_WEBHOOK_HASH",
  "RESEND_API_KEY",
  "INTERNAL_API_SECRET",
  "TOKEN_ENCRYPTION_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_ROOT_DOMAIN",
  "NEXT_PUBLIC_APP_URL",
  "VERCEL_API_TOKEN",
  "VERCEL_PROJECT_ID",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
];

export function validateRequiredEnvVars(): void {
  if (process.env.NODE_ENV !== "production") return; // Skip in dev

  const missing = REQUIRED_SERVER_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Check Vercel dashboard → Settings → Environment Variables.`
    );
  }

  // Validate TOKEN_ENCRYPTION_KEY is exactly 32 bytes
  const key = process.env.TOKEN_ENCRYPTION_KEY!;
  if (Buffer.from(key, "hex").length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be a 32-byte hex string (64 hex characters)."
    );
  }
}
