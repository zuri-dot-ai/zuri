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
  "FIREBASE_SERVICE_ACCOUNT_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_VAPID_KEY",
];

/** Non-fatal — onboarding photo upload degrades without these. */
const CLOUDINARY_VARS = [
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

/** Non-fatal — Content calendar / captions / images use NVIDIA NIM. */
const NVIDIA_CONTENT_VARS = ["NVIDIA_API_KEY"] as const;

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

  const missingCloudinary = CLOUDINARY_VARS.filter((key) => !process.env[key]);
  if (missingCloudinary.length > 0) {
    console.warn(
      `[env] Cloudinary not fully configured (missing: ${missingCloudinary.join(", ")}). ` +
        `Onboarding image upload will be unavailable.`
    );
  }

  const missingNvidia = NVIDIA_CONTENT_VARS.filter((key) => !process.env[key]);
  if (missingNvidia.length > 0) {
    console.warn(
      `[env] NVIDIA Content AI not configured (missing: ${missingNvidia.join(", ")}). ` +
        `Content calendar / image generation will fall back or fail until set.`
    );
  }
}
