import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncSearchConsoleData } from "@/lib/analytics/search-console-sync";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: connections } = await supabase
    .from("search_console_connections")
    .select("user_id")
    .eq("status", "active");

  let synced = 0;
  for (const conn of connections ?? []) {
    try {
      await syncSearchConsoleData(conn.user_id);
      synced++;
    } catch (err) {
      console.error(`GSC sync failed for ${conn.user_id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, synced });
}
