import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyTransaction } from "@/lib/flutterwave";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const txRef = searchParams.get("tx_ref");
  const transactionId = searchParams.get("transaction_id");
  const status = searchParams.get("status");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (status !== "successful" || !transactionId) {
    return NextResponse.redirect(`${appUrl}/settings?tab=billing&payment=failed`);
  }

  try {
    // Verify the transaction with Flutterwave
    const result = await verifyTransaction(transactionId);
    if (result.data?.status !== "successful") {
      return NextResponse.redirect(`${appUrl}/settings?tab=billing&payment=failed`);
    }

    const meta = result.data?.meta ?? {};
    const userId: string = meta.user_id;
    const planId: "starter" | "growth" = meta.plan_id;

    if (!userId || !planId) {
      throw new Error("Missing meta in transaction");
    }

    // Use service client — update bypasses RLS
    const service = createServiceClient();
    await service
      .from("users")
      .update({
        subscription_plan: planId,
        subscription_status: "active",
      })
      .eq("id", userId);

    return NextResponse.redirect(`${appUrl}/dashboard?payment=success`);
  } catch (err) {
    console.error("[billing/verify]", err);
    return NextResponse.redirect(`${appUrl}/settings?tab=billing&payment=error`);
  }
}