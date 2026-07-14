/** Resolve Flutterwave env vars — docs use FLUTTERWAVE_*; project .env uses FLW_*. */
export function flutterwaveSecretKey(): string {
  return (
    process.env.FLUTTERWAVE_SECRET_KEY ||
    process.env.FLW_SECRET_KEY ||
    ""
  );
}

export function flutterwaveWebhookHash(): string {
  return (
    process.env.FLUTTERWAVE_WEBHOOK_HASH ||
    process.env.FLW_SECRET_HASH ||
    ""
  );
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
