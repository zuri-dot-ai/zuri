import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sanitizeText } from "@/lib/utils/sanitize";
import { sendEmail } from "@/lib/email/resend";
import {
  isCustomSiteRequestStatus,
  PROJECT_TYPE_LABELS,
  type CustomSiteProjectType,
  type CustomSiteRequestStatus,
} from "@/lib/custom-site/types";

/**
 * PATCH /api/admin/custom-site-requests/[id]
 * Update status + optional reviewer notes; email user on approve/decline/in_review.
 */
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
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: { status?: string; reviewer_notes?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.status || !isCustomSiteRequestStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const status = body.status as CustomSiteRequestStatus;
  const reviewerNotes =
    body.reviewer_notes != null
      ? sanitizeText(body.reviewer_notes).slice(0, 2000) || null
      : undefined;

  const service = createServiceClient();

  const { data: existing, error: fetchError } = await service
    .from("custom_site_requests")
    .select(
      `
      id,
      user_id,
      project_type,
      status,
      profiles:user_id ( full_name, email )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const updatePayload: Record<string, unknown> = {
    status,
    reviewed_at: new Date().toISOString(),
  };
  if (reviewerNotes !== undefined) {
    updatePayload.reviewer_notes = reviewerNotes;
  }

  const { error: updateError } = await service
    .from("custom_site_requests")
    .update(updatePayload)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update request", details: updateError.message },
      { status: 500 }
    );
  }

  if (status === "approved" || status === "declined" || status === "in_review") {
    const profile = existing.profiles as
      | { full_name: string | null; email: string | null }
      | { full_name: string | null; email: string | null }[]
      | null;
    const profileRow = Array.isArray(profile) ? profile[0] : profile;
    const email = profileRow?.email;
    const firstName =
      (profileRow?.full_name ?? "").trim().split(/\s+/)[0] || "there";
    const projectTypeLabel =
      PROJECT_TYPE_LABELS[existing.project_type as CustomSiteProjectType] ??
      existing.project_type;

    if (email) {
      void sendEmail({
        to: email,
        subject:
          status === "approved"
            ? "Your custom project was approved"
            : status === "declined"
              ? "Update on your custom project request"
              : "Your custom project is in review",
        template: "custom_site_request_status",
        templateProps: {
          firstName,
          projectTypeLabel,
          status,
          notes: reviewerNotes ?? undefined,
        },
      }).catch((err) => {
        console.error("[admin/custom-site-requests] status email failed:", err);
      });
    }
  }

  return NextResponse.json({ success: true, status });
}
