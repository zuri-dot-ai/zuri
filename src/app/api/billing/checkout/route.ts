import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { initCheckout } from "@/lib/flutterwave";
import { PRICING } from "@/lib/constants";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId, interval } = (await request.json()) as {
    planId: "starter" | "growth";
    interval: "monthly" | "annual";
  };

  const plan = PRICING.find((p) => p.id === planId);
  if (!plan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  // Pick the correct Flutterwave plan ID from env
  const flwPlanEnvKey =
    `FLW_PLAN_${planId.toUpperCase()}_${interval.toUpperCase()}` as keyof NodeJS.ProcessEnv;
  const flwPlanId = process.env[flwPlanEnvKey];

  const amount = interval === "annual" ? plan.ngnAnnual : plan.ngnMonthly;

  // Unique tx reference for this checkout attempt
  const txRef = `zuri-${user.id.slice(0, 8)}-${Date.now()}`;

  const { data: account } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  try {
    const result = await initCheckout({
      txRef,
      amount,
      currency: "NGN",
      customerEmail: account?.email ?? user.email ?? "",
      customerName: account?.full_name ?? undefined,
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
    console.error("[billing/checkout]", err);
    return NextResponse.json(
      { error: "Could not create checkout. Please try again." },
      { status: 500 }
    );
  }
}