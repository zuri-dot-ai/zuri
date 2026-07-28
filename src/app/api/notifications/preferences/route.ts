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
  "push_enabled",
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
    console.error("[notifications/preferences] GET failed:", error.message);
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
      push_enabled: true,
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

  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Prefer UPDATE (authenticated often has UPDATE without INSERT). Fall back
  // to INSERT only when no row exists yet.
  const { data: updated, error: updateError } = await supabase
    .from("notification_preferences")
    .update(payload)
    .eq("user_id", user.id)
    .select("user_id");

  if (updateError) {
    console.error(
      "[notifications/preferences] UPDATE failed:",
      updateError.message
    );
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }

  if (!updated || updated.length === 0) {
    const { error: insertError } = await supabase
      .from("notification_preferences")
      .insert({ user_id: user.id, ...payload });

    if (insertError) {
      console.error(
        "[notifications/preferences] INSERT failed:",
        insertError.message
      );
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 }
      );
    }
  }

  // Toggling push off should remove stored subscriptions server-side too —
  // best-effort, since the client-side unsubscribeFromPush() unsubscribe
  // call may not always run (e.g. tab closed mid-toggle).
  if (updates.push_enabled === false) {
    const { error: deleteError } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id);
    if (deleteError) {
      console.error(
        "[notifications/preferences] push_subscriptions delete failed:",
        deleteError.message
      );
    }
  }

  return NextResponse.json({ success: true });
}
