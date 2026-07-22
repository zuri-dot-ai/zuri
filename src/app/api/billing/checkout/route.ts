import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import { initCheckout } from "@/lib/flutterwave";
import { PRICING } from "@/lib/constants";
import type { PlanId } from "@/lib/payments/plans";

export async function POST(request: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  const rateLimit = await checkRateLimit(supabase, user.id, "api:general");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const { planId, interval } = (await request.json()) as {
    planId: PlanId;
    interval: "monthly" | "annual";
  };

  const plan = PRICING.find((p) => p.id === planId);
  if (!plan || planId === "free") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const flwPlanEnvKey =
    `FLW_PLAN_${planId.toUpperCase()}_${interval.toUpperCase()}` as keyof NodeJS.ProcessEnv;
  const flwPlanId = process.env[flwPlanEnvKey];

  const amount = interval === "annual" ? plan.ngnAnnual : plan.ngnMonthly;
  const txRef = `zuri-${user.id.slice(0, 8)}-${Date.now()}`;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  try {
    const result = await initCheckout({
      txRef,
      amount,
      currency: "NGN",
      customerEmail: profile?.email ?? user.email ?? "",
      customerName: profile?.full_name ?? undefined,
      planId: flwPlanId,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/verify?tx_ref=${txRef}`,
      meta: {
        user_id: user.id,
        plan_id: planId,
        interval,
      },
    });

    if (!result?.data?.link) {
      throw new Error("No checkout link returned from Flutterwave");
    }

    return NextResponse.json({ checkoutUrl: result.data.link });
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId: user?.id,
      route: "/api/billing/checkout",
    });
    return NextResponse.json(
      { error: ERROR_MESSAGES.PAYMENT_INITIATION_FAILED, support_ref: ref },
      { status: 500 }
    );
  }
}
