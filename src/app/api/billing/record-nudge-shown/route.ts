import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * Called once when the recurring upgrade/trial-activation modal is shown
 * (not on every render — the client fires this once on mount when visible).
 * Stamps last_upgrade_nudge_at so the next eligible show is 24h later.
 */
export async function POST() {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const service = createServiceClient();
  const { error } = await service
    .from("subscriptions")
    .update({ last_upgrade_nudge_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    console.error("[record-nudge-shown] failed:", error.message);
    return NextResponse.json({ error: "Could not record" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}