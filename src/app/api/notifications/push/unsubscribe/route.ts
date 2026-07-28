// DELETE — remove a stored FCM token for the current user.
// Also called when the user toggles push_enabled off in preferences.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const fcmToken: string | undefined = body?.fcm_token;

  let query = supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id);

  if (fcmToken) {
    query = query.eq("fcm_token", fcmToken);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
