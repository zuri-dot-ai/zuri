import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { processExpiredGracePeriods } from "@/lib/payments/handle-failed-payment";
import {
  processExpiredTrials,
  sendTrialEndingReminders,
} from "@/lib/payments/process-trials";

export async function GET(req: Request) {
  // Vercel Cron authentication
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Service role — no user session on cron invocations; required for RLS writes
  const supabase = createServiceClient();
  const remindersSent = await sendTrialEndingReminders(supabase);
  const trialsExpired = await processExpiredTrials(supabase);
  await processExpiredGracePeriods(supabase);
  return NextResponse.json({ ok: true, remindersSent, trialsExpired });
}
