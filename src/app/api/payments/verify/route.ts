// GET /api/payments/verify?transaction_id=xxx&tx_ref=yyy&status=successful
// Called after Flutterwave redirects user back via /payment/callback

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { activateSubscription } from "@/lib/payments/activate-subscription";
import { appUrl, flutterwaveSecretKey } from "@/lib/payments/env";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const transactionId = searchParams.get("transaction_id");
  const status = searchParams.get("status");
  const txRefParam = searchParams.get("tx_ref");
  const base = appUrl();

  if (status !== "successful" || !transactionId) {
    // Payment was cancelled or failed — do NOT update subscription
    return NextResponse.redirect(`${base}/pricing?payment=cancelled`);
  }

  const service = createServiceClient();

  // Idempotency check — do not process same transaction twice
  const { data: existing } = await service
    .from("payment_history")
    .select("id, status")
    .eq("flutterwave_transaction_id", transactionId)
    .maybeSingle();

  if (existing?.status === "successful") {
    return NextResponse.redirect(
      `${base}/dashboard?payment=already_processed`
    );
  }

  // Verify with Flutterwave server-to-server
  const verifyRes = await fetch(
    `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
    {
      headers: {
        Authorization: `Bearer ${flutterwaveSecretKey()}`,
      },
    }
  );
  const verifyData = await verifyRes.json();

  if (
    verifyData.status !== "success" ||
    verifyData.data?.status !== "successful"
  ) {
    return NextResponse.redirect(`${base}/pricing?payment=failed`);
  }

  const { meta, amount, tx_ref: verifiedTxRef } = verifyData.data;
  const user_id = meta?.user_id as string | undefined;
  const plan_id = meta?.plan_id as string | undefined;
  const billing_cycle = (meta?.billing_cycle as "monthly" | "annual") ?? "monthly";
  const txRef = (verifiedTxRef as string | undefined) ?? txRefParam ?? undefined;

  // Security: ensure the user_id in meta matches authenticated user
  if (!user_id || user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!plan_id) {
    return NextResponse.redirect(`${base}/pricing?payment=failed`);
  }

  // Activate subscription
  await activateSubscription(
    service,
    user_id,
    plan_id,
    billing_cycle,
    transactionId,
    amount,
    txRef
  );

  return NextResponse.redirect(
    `${base}/dashboard?payment=success&plan=${plan_id}`
  );
}
