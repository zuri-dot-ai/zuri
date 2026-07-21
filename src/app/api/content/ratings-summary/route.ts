import { NextResponse } from "next/server";
import {
  requireContentUser,
  requireProCalendar,
} from "@/lib/content/api-helpers";

export async function GET() {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  const { data } = await auth.supabase
    .from("content_ratings")
    .select(
      "rating, generated_content(id, platform, calendar_slot_id, content_calendar(pillar_id, content_pillars(name)))"
    )
    .eq("user_id", auth.user.id);

  return NextResponse.json({ ratings: data ?? [] });
}
