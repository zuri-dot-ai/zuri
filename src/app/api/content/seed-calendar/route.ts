import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateMonthlyCalendar } from "@/lib/content/calendar-generator";
import {
  resolveArchetype,
  seedContentPillars,
} from "@/lib/content/pillars";
import {
  incrementCalendarUsage,
  mapBrandForCalendar,
} from "@/lib/content/api-helpers";
import { PLAN_CONFIG, isPlanId } from "@/lib/payments/plans";

export const maxDuration = 120;

function isInternalRequest(req: Request): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  return req.headers.get("x-internal-secret") === secret;
}

export async function POST(req: Request) {
  const internal = isInternalRequest(req);

  if (!internal) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: { userId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = body.userId;
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const [{ data: brand }, { data: sub }] = await Promise.all([
    supabase.from("business_profiles").select("*").eq("user_id", userId).single(),
    supabase.from("subscriptions").select("plan_id, status").eq("user_id", userId).maybeSingle(),
  ]);

  if (!brand) {
    return NextResponse.json({ error: "No brand profile" }, { status: 404 });
  }

  const active =
    sub?.status === "active" ||
    sub?.status === "grace_period" ||
    sub?.status === "trialing";
  const planId =
    active && sub?.plan_id && isPlanId(sub.plan_id) ? sub.plan_id : "free";

  if (planId === "free") {
    return NextResponse.json({ skipped: true, reason: "free_plan" });
  }

  const planLimits = PLAN_CONFIG[planId].limits;

  const mapped = mapBrandForCalendar(brand as Record<string, unknown>);
  const archetype = resolveArchetype({
    business_type: mapped.business_type,
    industry: mapped.industry,
    services: mapped.services,
    brand_vibe: mapped.brand_vibe,
    business_name: mapped.business_name,
  });

  await seedContentPillars(supabase, userId, archetype);

  const { data: pillars } = await supabase
    .from("content_pillars")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("sort_order");

  const allPlatforms =
    mapped.platforms.length > 0
      ? mapped.platforms.filter((p) =>
          ["instagram", "facebook", "linkedin", "x", "tiktok"].includes(p)
        )
      : ["instagram", "facebook"];
  const platformLimit = planLimits.social_platforms;
  const activePlatforms =
    platformLimit === null ? allPlatforms : allPlatforms.slice(0, platformLimit);

  const now = new Date();
  const slots = await generateMonthlyCalendar({
    userId,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    brand: mapped,
    pillars: pillars ?? [],
    platforms: activePlatforms,
    postsPerMonth: planLimits.calendar_posts_per_month,
  });

  if (slots.length > 0) {
    const { error } = await supabase.from("content_calendar").insert(
      slots.map((slot) => ({
        ...slot,
        user_id: userId,
      }))
    );
    if (error) {
      console.error("[seed-calendar] insert failed:", error);
      return NextResponse.json(
        { error: "Failed to save calendar slots" },
        { status: 500 }
      );
    }
  }

  await incrementCalendarUsage(supabase, userId, slots.length);

  return NextResponse.json({ success: true, slots_created: slots.length });
}
