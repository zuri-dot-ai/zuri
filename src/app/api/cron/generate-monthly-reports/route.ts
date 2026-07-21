import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateMonthlyReport } from "@/lib/analytics/monthly-report-generator";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: premiumUsers } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("plan_id", "premium")
    .in("status", ["active", "trialing", "grace_period"]);

  if (!premiumUsers?.length) {
    return NextResponse.json({ ok: true, generated: 0 });
  }

  let generated = 0;
  for (const { user_id } of premiumUsers) {
    try {
      await generateMonthlyReport(user_id);
      generated++;
    } catch (err) {
      console.error(`Monthly report failed for ${user_id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, generated });
}
