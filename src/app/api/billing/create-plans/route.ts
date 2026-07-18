import { NextResponse } from "next/server";
import { createPaymentPlan } from "@/lib/flutterwave";
import { PLAN_CONFIG } from "@/lib/payments/plans";

// Protect with admin secret
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pro = PLAN_CONFIG.pro;
    const growth = PLAN_CONFIG.growth;
    const premium = PLAN_CONFIG.premium;

    const [pm, gm, prm, pa, ga, pra] = await Promise.all([
      createPaymentPlan({
        amount: pro.price_monthly,
        name: "Zuri Pro Monthly",
        interval: "monthly",
      }),
      createPaymentPlan({
        amount: growth.price_monthly,
        name: "Zuri Growth Monthly",
        interval: "monthly",
      }),
      createPaymentPlan({
        amount: premium.price_monthly,
        name: "Zuri Premium Monthly",
        interval: "monthly",
      }),
      createPaymentPlan({
        amount: pro.price_annual,
        name: "Zuri Pro Annual",
        interval: "yearly",
      }),
      createPaymentPlan({
        amount: growth.price_annual,
        name: "Zuri Growth Annual",
        interval: "yearly",
      }),
      createPaymentPlan({
        amount: premium.price_annual,
        name: "Zuri Premium Annual",
        interval: "yearly",
      }),
    ]);

    return NextResponse.json({
      message: "Copy these IDs into your root .env.local",
      FLW_PLAN_PRO_MONTHLY: pm?.data?.id,
      FLW_PLAN_GROWTH_MONTHLY: gm?.data?.id,
      FLW_PLAN_PREMIUM_MONTHLY: prm?.data?.id,
      FLW_PLAN_PRO_ANNUAL: pa?.data?.id,
      FLW_PLAN_GROWTH_ANNUAL: ga?.data?.id,
      FLW_PLAN_PREMIUM_ANNUAL: pra?.data?.id,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
