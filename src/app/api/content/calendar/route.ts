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

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = auth.supabase
    .from("content_calendar")
    .select("*, content_pillars(id, name, color, icon)")
    .eq("user_id", auth.user.id)
    .order("scheduled_date", { ascending: true });

  if (from) query = query.gte("scheduled_date", from);
  if (to) query = query.lte("scheduled_date", to);

  const { data, error } = await query;
  if (error) {
    console.error("[content/calendar GET]", error);
    return NextResponse.json({ error: "Failed to load calendar" }, { status: 500 });
  }

  return NextResponse.json({ slots: data ?? [] });
}
