// Admin approve/reject for agency applications. docs/07_AGENCY_MARKETPLACE.md §9

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sendEmail } from "@/lib/email/resend";
import { sanitizeText } from "@/lib/utils/sanitize";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await requireAdmin(supabase, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body.status === "approved" ? "approved" : body.status === "rejected" ? "rejected" : null;

  if (!status) {
    return NextResponse.json(
      { error: "status must be 'approved' or 'rejected'" },
      { status: 400 }
    );
  }

  const service = createServiceClient();
  const { data: application, error: fetchError } = await service
    .from("agency_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (application.status !== "pending") {
    return NextResponse.json(
      { error: `Application is already ${application.status}` },
      { status: 409 }
    );
  }

  const reason =
    typeof body.reason === "string" ? sanitizeText(body.reason).slice(0, 500) : null;

  const { error: updateError } = await service
    .from("agency_applications")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: status === "rejected" ? reason : null,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (status === "rejected" && application.email) {
    await sendEmail({
      to: application.email,
      subject: `Update on ${application.agency_name ?? "your"} Zuri application`,
      template: "agency_rejection",
      templateProps: {
        contactName: application.contact_name ?? "there",
        agencyName: application.agency_name ?? "your agency",
        reason,
      },
    });
  }

  return NextResponse.json({ success: true, status });
}
