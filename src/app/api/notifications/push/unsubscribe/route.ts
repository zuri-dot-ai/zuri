// DELETE — remove a stored PushSubscription for the current user.
// Also called when the user toggles push_enabled off in preferences.
// docs/08_NOTIFICATIONS.md addendum — Session 4B v2.

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
  const endpoint: string | undefined = body?.endpoint;

  let query = supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id);

  if (endpoint) {
    query = query.eq("endpoint", endpoint);
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
