import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateMonthlyReport } from "@/lib/analytics/monthly-report-generator";
import { createNotification } from "@/lib/notifications/create-notification";

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

  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const monthName = prevMonth.toLocaleString("en-NG", {
    month: "long",
    year: "numeric",
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.buildzuri.com";

  let generated = 0;
  for (const { user_id } of premiumUsers) {
    try {
      await generateMonthlyReport(user_id);
      generated++;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", user_id)
        .maybeSingle();

      await createNotification({
        userId: user_id,
        type: "monthly_report_ready",
        title: "Your monthly report is ready",
        body: `Your ${monthName} performance report is ready to view.`,
        actionUrl: "/analytics",
        actionLabel: "View my report",
        email: profile?.email
          ? {
              to: profile.email,
              subject: `Your ${monthName} performance report is ready`,
              template: "monthly_report_ready",
              templateProps: {
                firstName: profile.full_name?.split(" ")[0] ?? "there",
                monthName,
                reportUrl: `${appUrl}/analytics`,
              },
            }
          : undefined,
      });
    } catch (err) {
      console.error(`Monthly report failed for ${user_id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, generated });
}
