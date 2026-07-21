import { NextResponse } from "next/server";
import {
  requireContentUser,
  requireProCalendar,
} from "@/lib/content/api-helpers";

export async function GET(req: Request) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, 30);

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "No content selected." },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase
    .from("generated_content")
    .select(
      "id, platform, format_type, caption, hashtags, image_url, status, calendar_slot_id, content_calendar(topic, scheduled_date)"
    )
    .eq("user_id", auth.user.id)
    .in("id", ids);

  if (error) {
    console.error("[preview-batch]", error);
    return NextResponse.json(
      { error: "Could not load preview batch." },
      { status: 500 }
    );
  }

  return NextResponse.json({ items: data ?? [] });
}
