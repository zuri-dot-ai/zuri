import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/custom-site/start-selfserve
 * For users whose custom request was declined — reopen standard AI onboarding.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const origin = new URL(req.url).origin;
  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?redirect=${encodeURIComponent("/api/custom-site/start-selfserve")}`
    );
  }

  const service = createServiceClient();
  const { data: request } = await service
    .from("custom_site_requests")
    .select("id, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request || request.status !== "declined") {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  await service
    .from("profiles")
    .update({
      onboarding_completed: false,
      onboarding_completed_at: null,
    })
    .eq("id", user.id);

  return NextResponse.redirect(`${origin}/start`);
}
