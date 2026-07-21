// GET /api/agencies — public list of active agencies with filters.
// docs/07_AGENCY_MARKETPLACE.md §3

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeText } from "@/lib/utils/sanitize";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const services = searchParams.getAll("service");
  const priceRange = searchParams.get("price_range");
  const location = searchParams.get("location");
  const search = searchParams.get("q");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = 12;

  const supabase = createServiceClient();
  let query = supabase
    .from("agencies")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("is_zuri_certified", { ascending: false })
    .order("is_verified", { ascending: false })
    .order("inquiries_count", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (services.length > 0) {
    query = query.overlaps("services", services);
  }

  if (priceRange && ["budget", "mid", "premium"].includes(priceRange)) {
    query = query.eq("price_range", priceRange);
  }

  if (location && location !== "all") {
    query = query.ilike("location_city", `%${location}%`);
  }

  if (search && search.length >= 2) {
    const cleanSearch = sanitizeText(search).slice(0, 50);
    query = query.or(
      `name.ilike.%${cleanSearch}%,tagline.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`
    );
  }

  const { data: agencies, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to load agencies" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    agencies: agencies ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  });
}
