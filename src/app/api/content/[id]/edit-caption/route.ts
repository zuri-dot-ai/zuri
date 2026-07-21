import { NextResponse } from "next/server";
import {
  requireContentUser,
  requireProCalendar,
} from "@/lib/content/api-helpers";
import {
  captureVoiceExample,
  isSubstantiveEdit,
} from "@/lib/content/voice-bank";
import { sanitizeText } from "@/lib/utils/sanitize";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  const { id } = await params;

  let body: { caption?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const clean = sanitizeText(typeof body.caption === "string" ? body.caption : "");
  if (clean.length < 3) {
    return NextResponse.json(
      { error: "Caption is too short." },
      { status: 400 }
    );
  }

  const { data: existing } = await auth.supabase
    .from("generated_content")
    .select("id, caption, platform")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  if (existing.caption && isSubstantiveEdit(existing.caption, clean)) {
    try {
      await captureVoiceExample(
        auth.supabase,
        auth.user.id,
        clean,
        "edited",
        existing.platform
      );
    } catch (err) {
      console.error("[edit-caption] voice capture failed:", err);
    }
  }

  const { error: updateError } = await auth.supabase
    .from("generated_content")
    .update({ caption: clean, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    console.error("[edit-caption]", updateError);
    return NextResponse.json(
      { error: "Could not save caption." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
