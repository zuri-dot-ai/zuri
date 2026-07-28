// POST — store an FCM device token against the current user.

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
  const fcmToken: string | undefined = body?.fcm_token;

  if (!fcmToken || typeof fcmToken !== "string") {
    return NextResponse.json({ error: "Missing fcm_token" }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      fcm_token: fcmToken,
    },
    { onConflict: "fcm_token" }
  );

  if (error) {
    return NextResponse.json(
      { error: "Failed to store subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
