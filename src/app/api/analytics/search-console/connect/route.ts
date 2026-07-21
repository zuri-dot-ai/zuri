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

  const gate = await checkFeatureAccess(supabase, user.id, "search_console");
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Growth plan required", upgradeRequired: "growth" },
      { status: 403 }
    );
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const oauth2Url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  oauth2Url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  oauth2Url.searchParams.set(
    "redirect_uri",
    `${appUrl}/api/analytics/search-console/callback`
  );
  oauth2Url.searchParams.set("response_type", "code");
  oauth2Url.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/webmasters.readonly"
  );
  oauth2Url.searchParams.set("access_type", "offline");
  oauth2Url.searchParams.set("prompt", "consent");
  oauth2Url.searchParams.set("state", user.id);

  return NextResponse.redirect(oauth2Url.toString());
}
