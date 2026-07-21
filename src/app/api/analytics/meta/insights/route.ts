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

  const gate = await checkFeatureAccess(supabase, user.id, "meta_analytics");
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Growth plan required", upgradeRequired: "growth" },
      { status: 403 }
    );
  }

  const service = createServiceClient();

  const { data: connection } = await service
    .from("meta_connections")
    .select(
      "status, facebook_page_name, instagram_username, last_synced_at, connected_at"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection || connection.status !== "active") {
    return NextResponse.json({
      connected: false,
      status: connection?.status ?? "disconnected",
      insights: null,
    });
  }

  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: rows } = await service
    .from("meta_insights")
    .select("platform, metric_name, metric_value, period_date")
    .eq("user_id", user.id)
    .gte("period_date", since)
    .order("period_date", { ascending: true });

  const sumMetric = (platform: string, name: string) =>
    (rows ?? [])
      .filter((r) => r.platform === platform && r.metric_name === name)
      .reduce((a, r) => a + Number(r.metric_value || 0), 0);

  const latestMetric = (platform: string, name: string) => {
    const matches = (rows ?? []).filter(
      (r) => r.platform === platform && r.metric_name === name
    );
    return matches.length
      ? Number(matches[matches.length - 1].metric_value || 0)
      : 0;
  };

  return NextResponse.json({
    connected: true,
    status: connection.status,
    facebook_page_name: connection.facebook_page_name,
    instagram_username: connection.instagram_username,
    last_synced_at: connection.last_synced_at,
    overview: {
      ig_reach: sumMetric("instagram", "reach"),
      ig_impressions: sumMetric("instagram", "impressions"),
      ig_followers: latestMetric("instagram", "follower_count"),
      fb_reach: sumMetric("facebook", "page_reach"),
      fb_impressions: sumMetric("facebook", "page_impressions"),
      fb_fans: latestMetric("facebook", "page_fans"),
    },
  });
}
