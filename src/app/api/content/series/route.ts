import { NextResponse } from "next/server";
import {
  assertCalendarQuota,
  incrementCalendarUsage,
  isValidPlatform,
  mapBrandForCalendar,
  requireContentUser,
  requireGrowthPlus,
  requireProCalendar,
} from "@/lib/content/api-helpers";
import {
  generateSeries,
  SERIES_TEMPLATES,
} from "@/lib/content/series-generator";

export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  const growth = requireGrowthPlus(auth.planId, "Content series generator");
  if ("error" in growth) return growth.error;

  let body: {
    template?: string;
    platform?: string;
    startDate?: string;
    pillarId?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const template = SERIES_TEMPLATES.find(
    (t) => t.name === body.template
  );
  if (!template) {
    return NextResponse.json(
      {
        error: "Unknown series template.",
        templates: SERIES_TEMPLATES.map((t) => t.name),
      },
      { status: 400 }
    );
  }

  if (!body.platform || !isValidPlatform(body.platform)) {
    return NextResponse.json(
      { error: "Platform must be one of: instagram, facebook, linkedin, x, tiktok." },
      { status: 400 }
    );
  }

  const startDate = body.startDate
    ? new Date(body.startDate)
    : new Date();
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Invalid start date." }, { status: 400 });
  }

  const quota = await assertCalendarQuota(
    auth.supabase,
    auth.user.id,
    template.post_count
  );
  if ("error" in quota) return quota.error;

  const { data: brand } = await auth.supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", auth.user.id)
    .single();

  if (!brand) {
    return NextResponse.json({ error: "No brand profile" }, { status: 404 });
  }

  const mapped = mapBrandForCalendar(brand as Record<string, unknown>);

  try {
    const slots = await generateSeries(
      mapped,
      template,
      body.platform,
      startDate,
      auth.user.id,
      body.pillarId ?? null
    );

    const { data: inserted, error } = await auth.supabase
      .from("content_calendar")
      .insert(slots.map((s) => ({ ...s, user_id: auth.user.id })))
      .select();

    if (error) {
      console.error("[series]", error);
      return NextResponse.json(
        { error: "Series generation failed. Please try again." },
        { status: 500 }
      );
    }

    await incrementCalendarUsage(
      auth.supabase,
      auth.user.id,
      inserted?.length ?? 0
    );

    return NextResponse.json({
      slots: inserted ?? [],
      slots_created: inserted?.length ?? 0,
    });
  } catch (err) {
    console.error("[series]", err);
    return NextResponse.json(
      { error: "Series generation failed. Please try again." },
      { status: 500 }
    );
  }
}
