// POST — store a browser PushSubscription against the current user.
// docs/08_NOTIFICATIONS.md addendum — Session 4B v2.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const endpoint: string | undefined = body?.endpoint;
  const p256dh: string | undefined = body?.keys?.p256dh;
  const authKey: string | undefined = body?.keys?.auth;

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json(
      { error: "Missing endpoint or keys" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth_key: authKey,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return NextResponse.json(
      { error: "Failed to store subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
