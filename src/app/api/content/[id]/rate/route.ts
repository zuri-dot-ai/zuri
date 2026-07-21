import { NextResponse } from "next/server";
import {
  requireContentUser,
  requireProCalendar,
} from "@/lib/content/api-helpers";
import { captureVoiceExample } from "@/lib/content/voice-bank";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  const { id } = await params;

  let body: { rating?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rating = body.rating;
  if (!Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5) {
    return NextResponse.json(
      { error: "Rating must be an integer from 1 to 5." },
      { status: 400 }
    );
  }

  const { data: content } = await auth.supabase
    .from("generated_content")
    .select("id, caption, platform")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (!content) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  const { data: saved, error: upsertError } = await auth.supabase
    .from("content_ratings")
    .upsert(
      {
        user_id: auth.user.id,
        generated_content_id: content.id,
        rating: rating as number,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "generated_content_id" }
    )
    .select()
    .single();

  if (upsertError) {
    console.error("[rate]", upsertError);
    return NextResponse.json(
      { error: "Could not save rating." },
      { status: 500 }
    );
  }

  if ((rating as number) >= 4 && content.caption) {
    try {
      await captureVoiceExample(
        auth.supabase,
        auth.user.id,
        content.caption,
        "rated",
        content.platform
      );
    } catch (err) {
      console.error("[rate] voice capture failed:", err);
    }
  }

  return NextResponse.json({ success: true, rating: saved.rating });
}
