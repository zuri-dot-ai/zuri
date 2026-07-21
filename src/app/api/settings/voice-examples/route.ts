import { NextResponse } from "next/server";
import { requireContentUser } from "@/lib/content/api-helpers";

export async function GET() {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("brand_voice_examples")
    .select("id, text, source, platform, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[voice-examples GET]", error);
    return NextResponse.json(
      { error: "Could not load voice examples." },
      { status: 500 }
    );
  }

  return NextResponse.json({ examples: data ?? [] });
}

export async function DELETE(req: Request) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing example id." }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("brand_voice_examples")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    console.error("[voice-examples DELETE]", error);
    return NextResponse.json(
      { error: "Could not delete voice example." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
