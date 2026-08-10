import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: sites } = await supabase
    .from("websites")
    .select("id, user_id, status");

  const published = (sites ?? []).filter((s) => s.status === "published");
  let purged = 0;

  for (const site of published) {
    try {
      const retentionDays = 90;
      const cutoff = new Date();
      cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);
      const cutoffIso = cutoff.toISOString();

      const { count: rawDeleted } = await supabase
        .from("analytics_events")
        .delete()
        .eq("website_id", site.id)
        .lt("created_at", cutoffIso);

      const { count: hourlyDeleted } = await supabase
        .from("analytics_rollups_hourly")
        .delete()
        .eq("website_id", site.id)
        .lt("hour_bucket", cutoffIso);

      purged += (rawDeleted ?? 0) + (hourlyDeleted ?? 0);
    } catch (err) {
      console.error(`[purge-customer-analytics] failed for ${site.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, purged });
}
