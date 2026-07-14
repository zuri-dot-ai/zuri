import { NextResponse } from "next/server";
import { createPaymentPlan } from "@/lib/flutterwave";

// Protect with admin secret
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [sm, gm, sa, ga] = await Promise.all([
      createPaymentPlan({ amount: 38000, name: "Zuri Starter Monthly", interval: "monthly" }),
      createPaymentPlan({ amount: 61000, name: "Zuri Growth Monthly", interval: "monthly" }),
      createPaymentPlan({ amount: 380000, name: "Zuri Starter Annual", interval: "yearly" }),
      createPaymentPlan({ amount: 610000, name: "Zuri Growth Annual", interval: "yearly" }),
    ]);

    return NextResponse.json({
      message: "Copy these IDs into your .env.local",
      FLW_PLAN_STARTER_MONTHLY: sm?.data?.id,
      FLW_PLAN_GROWTH_MONTHLY: gm?.data?.id,
      FLW_PLAN_STARTER_ANNUAL: sa?.data?.id,
      FLW_PLAN_GROWTH_ANNUAL: ga?.data?.id,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}