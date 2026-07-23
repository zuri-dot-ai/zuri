// Purges expired anonymous_onboarding_sessions rows daily (privacy hygiene,
// not just cleanup — docs/01_ONBOARDING_V2.md §2.2). onboarding_uploaded_images
// rows cascade-delete automatically via anonymous_session_token FK.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { error: rpcError } = await supabase.rpc(
    "purge_expired_anonymous_sessions"
  );

  if (rpcError) {
    // Fallback: delete directly if the RPC function isn't available.
    const { error: deleteError } = await supabase
      .from("anonymous_onboarding_sessions")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (deleteError) {
      console.error("purge-expired-sessions fallback delete failed:", deleteError);
      return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
