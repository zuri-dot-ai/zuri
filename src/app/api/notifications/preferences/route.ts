// GET + PATCH notification preferences. docs/08_NOTIFICATIONS.md §7.3
// Mandatory templates (billing, security) always send regardless of prefs —
// enforced in create-notification/sendEmail, not by these toggles.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_FIELDS = [
  "email_weekly_digest",
  "email_content_reminders",
  "email_usage_alerts",
  "email_marketing",
  "in_app_all",
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }

  return NextResponse.json({
    preferences: data ?? {
      user_id: user.id,
      email_weekly_digest: true,
      email_content_reminders: true,
      email_usage_alerts: true,
      email_marketing: true,
      in_app_all: true,
    },
  });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const updates = Object.fromEntries(
    Object.entries(body).filter(
      ([key, value]) => ALLOWED_FIELDS.includes(key) && typeof value === "boolean"
    )
  );

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      { user_id: user.id, ...updates, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
