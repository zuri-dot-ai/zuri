// Monday in-app reminder to review the week's content calendar.
// docs/08_NOTIFICATIONS.md §9.2

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@/lib/notifications/create-notification";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];
  const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: rows } = await supabase
    .from("content_calendar")
    .select("user_id")
    .eq("status", "draft")
    .gte("scheduled_date", today)
    .lte("scheduled_date", weekAhead);

  const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
  let sent = 0;

  for (const userId of userIds) {
    const { count } = await supabase
      .from("content_calendar")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("status", "draft")
      .gte("scheduled_date", today)
      .lte("scheduled_date", weekAhead);

    await createNotification({
      userId,
      type: "content_generated",
      title: "Review this week's content",
      body: `You have ${count ?? 0} draft post${count === 1 ? "" : "s"} ready to review for this week.`,
      actionUrl: "/plan",
      actionLabel: "Review calendar",
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
