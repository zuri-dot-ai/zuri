import { NextResponse } from "next/server";
import { generateMonthlyCalendar } from "@/lib/content/calendar-generator";
import {
  assertCalendarQuota,
  incrementCalendarUsage,
  mapBrandForCalendar,
  requireContentUser,
  requireProCalendar,
} from "@/lib/content/api-helpers";
import { PLAN_CONFIG } from "@/lib/payments/plans";

export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  let body: { month?: number; year?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const now = new Date();
  const month = body.month ?? now.getMonth() + 1;
  const year = body.year ?? now.getFullYear();

  if (month < 1 || month > 12 || year < 2020 || year > now.getFullYear() + 1) {
    return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
  }

  const planLimits = PLAN_CONFIG[auth.planId].limits;
  const postsPerMonth = planLimits.calendar_posts_per_month;
  const requested = postsPerMonth === null ? 30 : postsPerMonth;

  const quota = await assertCalendarQuota(
    auth.supabase,
    auth.user.id,
    requested
  );
  if ("error" in quota) return quota.error;

  const [{ data: brand }, { data: pillars }] = await Promise.all([
    auth.supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", auth.user.id)
      .single(),
    auth.supabase
      .from("content_pillars")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (!brand) {
    return NextResponse.json({ error: "No brand profile" }, { status: 404 });
  }

  const mapped = mapBrandForCalendar(brand as Record<string, unknown>);
  const allPlatforms =
    mapped.platforms.length > 0
      ? mapped.platforms.filter((p) =>
          ["instagram", "facebook", "linkedin", "x", "tiktok"].includes(p)
        )
      : ["instagram", "facebook"];
  const platformLimit = planLimits.social_platforms;
  const activePlatforms =
    platformLimit === null ? allPlatforms : allPlatforms.slice(0, platformLimit);

  // Cap generation to remaining quota when limited
  const effectivePosts =
    quota.remaining === null
      ? requested
      : Math.min(requested, quota.remaining);

  const slots = await generateMonthlyCalendar({
    userId: auth.user.id,
    month,
    year,
    brand: mapped,
    pillars: pillars ?? [],
    platforms: activePlatforms,
    postsPerMonth: effectivePosts,
  });

  if (slots.length > 0) {
    const { data: inserted, error } = await auth.supabase
      .from("content_calendar")
      .insert(slots.map((s) => ({ ...s, user_id: auth.user.id })))
      .select();

    if (error) {
      console.error("[generate-month]", error);
      return NextResponse.json(
        { error: "Failed to save calendar" },
        { status: 500 }
      );
    }

    await incrementCalendarUsage(auth.supabase, auth.user.id, inserted?.length ?? 0);

    return NextResponse.json({
      success: true,
      slots: inserted ?? [],
      slots_created: inserted?.length ?? 0,
    });
  }

  return NextResponse.json({
    success: true,
    slots: [],
    slots_created: 0,
    message:
      "No remaining days in this month to schedule. Try next month.",
  });
}
