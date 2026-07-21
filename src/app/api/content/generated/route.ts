import { NextResponse } from "next/server";
import {
  requireContentUser,
  requireProCalendar,
} from "@/lib/content/api-helpers";

/** GET ?id=uuid | ?slotId=uuid — load one generated_content row + optional rating */
export async function GET(req: Request) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const slotId = searchParams.get("slotId");

  if (!id && !slotId) {
    return NextResponse.json(
      { error: "Provide id or slotId." },
      { status: 400 }
    );
  }

  let query = auth.supabase
    .from("generated_content")
    .select(
      "id, caption, hashtags, image_url, platform, format_type, status, calendar_slot_id"
    )
    .eq("user_id", auth.user.id);

  if (id) query = query.eq("id", id);
  else query = query.eq("calendar_slot_id", slotId!);

  const { data: content, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[generated GET]", error);
    return NextResponse.json(
      { error: "Could not load content." },
      { status: 500 }
    );
  }

  if (!content) {
    return NextResponse.json({ content: null });
  }

  const { data: ratingRow } = await auth.supabase
    .from("content_ratings")
    .select("rating")
    .eq("generated_content_id", content.id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  return NextResponse.json({
    content: { ...content, rating: ratingRow?.rating ?? null },
  });
}
