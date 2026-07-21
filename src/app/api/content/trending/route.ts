import { NextResponse } from "next/server";
import {
  mapBrandForCalendar,
  requireContentUser,
  requireGrowthPlus,
  requireProCalendar,
} from "@/lib/content/api-helpers";
import { getTrendingTopics } from "@/lib/content/trending-topics";

export const maxDuration = 60;

export async function GET() {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  const growth = requireGrowthPlus(auth.planId, "Trending topics");
  if ("error" in growth) return growth.error;

  const { data: brand } = await auth.supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", auth.user.id)
    .single();

  if (!brand) {
    return NextResponse.json({ error: "No brand profile" }, { status: 404 });
  }

  const mapped = mapBrandForCalendar(brand as Record<string, unknown>);
  const topics = await getTrendingTopics(
    mapped.industry || "business",
    mapped.location_city || mapped.location || "Lagos"
  );

  return NextResponse.json({ topics });
}
