// Daily reminder when a high-urgency Nigerian cultural moment is coming up.
// docs/08_NOTIFICATIONS.md §9.3 — reuses the existing cultural calendar dataset.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@/lib/notifications/create-notification";
import { getUpcomingMoments } from "@/lib/content/cultural-calendar";

const REMIND_DAYS_AHEAD = 7;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const upcoming = getUpcomingMoments(REMIND_DAYS_AHEAD).filter(
    (m) => m.urgency === "high"
  );

  if (upcoming.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, moments: [] });
  }

  const moment = upcoming[0];
  const supabase = createServiceClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("onboarding_completed", true);

  let sent = 0;
  for (const profile of profiles ?? []) {
    await createNotification({
      userId: profile.id,
      type: "calendar_ready",
      title: `${moment.name} is coming up`,
      body: moment.content_angle,
      actionUrl: "/plan",
      actionLabel: "Plan content",
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent, moment: moment.name });
}
