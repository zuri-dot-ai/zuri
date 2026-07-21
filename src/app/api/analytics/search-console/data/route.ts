import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkFeatureAccess } from "@/lib/payments/feature-gate";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await checkFeatureAccess(supabase, user.id, "search_console");
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Growth plan required", upgradeRequired: "growth" },
      { status: 403 }
    );
  }

  const service = createServiceClient();

  const { data: connection } = await service
    .from("search_console_connections")
    .select("status, last_synced_at, connected_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection || connection.status !== "active") {
    return NextResponse.json({
      connected: false,
      status: connection?.status ?? "disconnected",
      snapshot: null,
    });
  }

  const { data: snapshot } = await service
    .from("search_console_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    connected: true,
    status: connection.status,
    last_synced_at: connection.last_synced_at,
    snapshot: snapshot
      ? {
          site_url: snapshot.site_url,
          snapshot_date: snapshot.snapshot_date,
          total_clicks: snapshot.total_clicks,
          total_impressions: snapshot.total_impressions,
          avg_position: snapshot.avg_position,
          top_queries: snapshot.top_queries,
          top_pages: snapshot.top_pages,
        }
      : null,
  });
}
