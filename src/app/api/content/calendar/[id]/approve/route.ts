import { NextResponse } from "next/server";
import {
  requireContentUser,
  requireProCalendar,
} from "@/lib/content/api-helpers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  const { id } = await params;

  const { data, error } = await auth.supabase
    .from("content_calendar")
    .update({
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("*, content_pillars(id, name, color, icon)")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  return NextResponse.json({ slot: data });
}
