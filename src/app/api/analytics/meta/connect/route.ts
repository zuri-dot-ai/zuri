import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: `${appUrl}/api/analytics/meta/callback`,
    scope: [
      "pages_read_engagement",
      "pages_show_list",
      "instagram_basic",
      "instagram_manage_insights",
      "read_insights",
    ].join(","),
    state: user.id,
    response_type: "code",
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v18.0/dialog/oauth?${params}`
  );
}
