import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { processExpiredGracePeriods } from "@/lib/payments/handle-failed-payment";

export async function GET(req: Request) {
  // Vercel Cron authentication
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Service role — no user session on cron invocations; required for RLS writes
  const supabase = createServiceClient();
  await processExpiredGracePeriods(supabase);
  return NextResponse.json({ ok: true });
}
