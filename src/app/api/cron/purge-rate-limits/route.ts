// Purges rate_limit_log entries older than 2 hours. Runs hourly.
// supabase/migrations/008_misc.sql defines rate_limit_log + purge_old_rate_limits().

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { error: rpcError } = await supabase.rpc("purge_old_rate_limits");

  if (rpcError) {
    // Fallback: delete directly if the RPC function isn't available.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { error: deleteError } = await supabase
      .from("rate_limit_log")
      .delete()
      .lt("created_at", twoHoursAgo);

    if (deleteError) {
      console.error("purge-rate-limits fallback delete failed:", deleteError);
      return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
