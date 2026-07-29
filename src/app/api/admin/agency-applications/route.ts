// GET /api/admin/agency-applications — list applications. docs/07_AGENCY_MARKETPLACE.md §9

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";

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
    .from("agency_applications")
    .select(
      `
      id,
      agency_name,
      contact_name,
      email,
      phone,
      whatsapp,
      website,
      logo_url,
      location_city,
      services,
      team_size,
      price_range,
      portfolio_urls,
      portfolio_image_urls,
      description,
      referral_source,
      status,
      reviewer_notes,
      reviewed_at,
      created_at
    `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { error: "Failed to load applications", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ applications: data ?? [] });
}
