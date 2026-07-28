import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email/resend";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  try {
    const { data: profile } = await service
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const email = profile?.email ?? user.email;
    if (email) {
      await sendEmail({
        to: email,
        subject: "Your Zuri account has been deleted",
        template: "account_deleted",
        templateProps: {
          firstName: profile?.full_name?.split(" ")[0] ?? "there",
        },
        userId: user.id,
      });
    }

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
