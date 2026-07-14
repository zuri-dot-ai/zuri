// ════════════════════════════════════════════════════════
//  ZURI — Flutterwave Helper (NGN-first subscriptions)
// ════════════════════════════════════════════════════════

const FLW_BASE = "https://api.flutterwave.com/v3";

function flwHeaders() {
  return {
    Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

/** Create a recurring payment plan (run once per plan, store the ID) */
export async function createPaymentPlan(args: {
  amount: number;
  name: string;
  interval: "monthly" | "yearly";
  currency?: string;
}) {
  const res = await fetch(`${FLW_BASE}/payment-plans`, {
    method: "POST",
    headers: flwHeaders(),
    body: JSON.stringify({
      amount: args.amount,
      name: args.name,
      interval: args.interval,
      currency: args.currency || "NGN",
    }),
  });
  return res.json();
}

/** Initialize a hosted checkout for a subscription */
export async function initCheckout(args: {
  txRef: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  planId?: string;
  redirectUrl: string;
  meta?: Record<string, unknown>;
}) {
  const res = await fetch(`${FLW_BASE}/payments`, {
    method: "POST",
    headers: flwHeaders(),
    body: JSON.stringify({
      tx_ref: args.txRef,
      amount: args.amount,
      currency: args.currency,
      redirect_url: args.redirectUrl,
      payment_plan: args.planId,
      customer: {
        email: args.customerEmail,
        name: args.customerName,
      },
      customizations: {
        title: "Zuri",
        description: "Your business, online. Beautifully.",
        logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
      },
      meta: args.meta,
    }),
  });
  return res.json();
}

/** Verify a transaction by ID (called after redirect / in webhook) */
export async function verifyTransaction(transactionId: string | number) {
  const res = await fetch(
    `${FLW_BASE}/transactions/${transactionId}/verify`,
    { headers: flwHeaders() }
  );
  return res.json();
}

/** Validate an incoming webhook signature against FLW_SECRET_HASH */
export function verifyWebhookSignature(signature: string | null): boolean {
  return !!signature && signature === process.env.FLW_SECRET_HASH;
}

/** Map a Flutterwave plan id back to a Zuri plan tier */
export function planTierFromFlwId(flwPlanId: string): "starter" | "growth" | null {
  if (
    flwPlanId === process.env.FLW_PLAN_STARTER_MONTHLY ||
    flwPlanId === process.env.FLW_PLAN_STARTER_ANNUAL
  ) return "starter";
  if (
    flwPlanId === process.env.FLW_PLAN_GROWTH_MONTHLY ||
    flwPlanId === process.env.FLW_PLAN_GROWTH_ANNUAL
  ) return "growth";
  return null;
}