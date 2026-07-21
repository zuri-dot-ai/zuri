import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncMetaInsights } from "@/lib/analytics/meta-sync";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: connections } = await supabase
    .from("meta_connections")
    .select("user_id")
    .eq("status", "active");

  let synced = 0;
  for (const conn of connections ?? []) {
    try {
      await syncMetaInsights(conn.user_id);
      synced++;
    } catch (err) {
      console.error(`Meta sync failed for ${conn.user_id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, synced });
}
