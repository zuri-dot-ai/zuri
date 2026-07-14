import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  try {
    // Unpublish their website first (so the subdomain 404s cleanly)
    await service
      .from("websites")
      .update({ is_published: false })
      .eq("user_id", user.id);

    // Delete the auth user — cascades to all public.* tables via FK ON DELETE CASCADE
    const { error } = await service.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[account/delete]", err);
    return NextResponse.json({ error: "Could not delete account" }, { status: 500 });
  }
}