import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyTransaction } from "@/lib/flutterwave";
import { activateSubscription } from "@/lib/payments/activate-subscription";
import { isPlanId } from "@/lib/payments/plans";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const txRef = searchParams.get("tx_ref");
  const transactionId = searchParams.get("transaction_id");
  const status = searchParams.get("status");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (status !== "successful" || !transactionId) {
    return NextResponse.redirect(
      `${appUrl}/settings?tab=billing&payment=failed`
    );
  }

  try {
    const result = await verifyTransaction(transactionId);
    if (result.data?.status !== "successful") {
      return NextResponse.redirect(
        `${appUrl}/settings?tab=billing&payment=failed`
      );
    }

    const meta = result.data?.meta ?? {};
    const userId: string = meta.user_id;
    const planId = meta.plan_id;
    const interval: "monthly" | "annual" =
      meta.interval === "annual" ? "annual" : "monthly";
    const amount = Number(result.data?.amount ?? 0);

    if (!userId || !isPlanId(planId) || planId === "free") {
      throw new Error("Missing or invalid meta in transaction");
    }

    // Ensure caller is the paying user when session exists
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && user.id !== userId) {
      return NextResponse.redirect(
        `${appUrl}/settings?tab=billing&payment=error`
      );
    }

    const service = createServiceClient();
    await activateSubscription(
      service,
      userId,
      planId,
      interval,
      String(transactionId),
      amount,
      txRef ?? undefined
    );

    return NextResponse.redirect(`${appUrl}/dashboard?payment=success`);
  } catch (err) {
    console.error("[billing/verify]", err);
    return NextResponse.redirect(
      `${appUrl}/settings?tab=billing&payment=error`
    );
  }
}
