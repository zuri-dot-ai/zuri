// POST /api/payments/initiate
// Body: { planId: 'pro' | 'growth' | 'premium', billingCycle: 'monthly' | 'annual' }

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { PLAN_CONFIG, PAID_PLAN_IDS, isPlanId } from "@/lib/payments/plans";
import { appUrl, flutterwaveSecretKey } from "@/lib/payments/env";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import { ERROR_MESSAGES } from "@/lib/errors/messages";

export async function POST(req: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  const rateLimit = await checkRateLimit(supabase, user.id, "api:general");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const body = await req.json();
  const planId = body.planId as string;
  const billingCycle = body.billingCycle as string;

  // Validate plan
  if (!isPlanId(planId) || !PAID_PLAN_IDS.includes(planId)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (billingCycle !== "monthly" && billingCycle !== "annual") {
    return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 });
  }

  const secret = flutterwaveSecretKey();
  if (!secret) {
    console.error("Flutterwave secret key not configured");
    return NextResponse.json(
      { error: ERROR_MESSAGES.PAYMENT_INITIATION_FAILED },
      { status: 500 }
    );
  }

  const plan = PLAN_CONFIG[planId];
  const amount =
    billingCycle === "annual" ? plan.price_annual : plan.price_monthly;

  try {
    // Fetch user profile for prefill
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, handle")
      .eq("id", user.id)
      .single();

    // Generate unique transaction reference
    const txRef = `zuri_${user.id.slice(0, 8)}_${Date.now()}`;
    const base = appUrl();

    const payload = {
      tx_ref: txRef,
      amount,
      currency: "NGN",
      redirect_url: `${base}/payment/callback`,
      customer: {
        email: profile?.email ?? user.email,
        name: profile?.full_name ?? "Zuri User",
      },
      customizations: {
        title: "Zuri",
        description: `${plan.name} Plan — ${billingCycle === "annual" ? "Annual" : "Monthly"}`,
        logo: `${base}/Zuri_Logo.png`,
      },
      meta: {
        user_id: user.id,
        plan_id: planId,
        billing_cycle: billingCycle,
      },
    };

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.status !== "success") {
      console.error("Flutterwave initiation error:", data);
      return NextResponse.json(
        { error: ERROR_MESSAGES.PAYMENT_INITIATION_FAILED },
        { status: 500 }
      );
    }

    // Store pending transaction reference for verification (service role — RLS write)
    const service = createServiceClient();
    await service.from("payment_history").insert({
      user_id: user.id,
      plan_id: planId,
      amount,
      currency: "NGN",
      status: "pending",
      flutterwave_reference: txRef,
      billing_cycle: billingCycle,
      payment_type: "subscription_new",
    });

    return NextResponse.json({ payment_link: data.data.link });
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId: user?.id,
      route: "/api/payments/initiate",
    });
    return NextResponse.json(
      { error: ERROR_MESSAGES.PAYMENT_INITIATION_FAILED, support_ref: ref },
      { status: 500 }
    );
  }
}
