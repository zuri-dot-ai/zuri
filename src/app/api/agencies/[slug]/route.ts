// GET /api/agencies/[slug] — single agency detail page.
// docs/07_AGENCY_MARKETPLACE.md §3

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug?.replace(/[^a-z0-9-]/g, "").slice(0, 60);
  if (!slug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: agency } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!agency) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  }

  return NextResponse.json({ agency });
}
