import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";

/** GET /api/admin/custom-site-requests — list all custom site requests. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await requireAdmin(supabase, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("custom_site_requests")
    .select(
      `
      id,
      user_id,
      project_type,
      description,
      features,
      custom_integrations_text,
      other_features_text,
      budget_range,
      timeline,
      reference_url,
      status,
      reviewer_notes,
      reviewed_at,
      created_at,
      profiles:user_id ( full_name, email )
    `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { error: "Failed to load requests", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ requests: data ?? [] });
}
