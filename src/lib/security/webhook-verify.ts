// Flutterwave webhook verification
export function verifyFlutterwaveWebhook(
  req: Request,
  payload: unknown
): boolean {
  void payload;
  const signature = req.headers.get("verif-hash");
  if (!signature || !process.env.FLUTTERWAVE_WEBHOOK_HASH) return false;

  // Flutterwave uses a simple secret hash comparison (not HMAC)
  return signature === process.env.FLUTTERWAVE_WEBHOOK_HASH;
}

// Generic HMAC webhook verification (for future integrations)
export async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = "SHA-256"
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"]
  );

  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  const expectedSig = Buffer.from(sigBuffer).toString("hex");
  const receivedSig = signature.replace(/^sha256=/, "");

  // Timing-safe comparison
  return timingSafeEqual(Buffer.from(expectedSig), Buffer.from(receivedSig));
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i]! ^ b[i]!;
  }
  return result === 0;
}
