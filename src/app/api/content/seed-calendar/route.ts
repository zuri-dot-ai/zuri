import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  calendarChunkCount,
  generateCalendarChunk,
} from "@/lib/content/calendar-generator";
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

/** Stop starting new chunks once this much wall time has elapsed. */
const SEED_CHUNK_BUDGET_MS = 90_000;

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
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const postsPerMonth = planLimits.calendar_posts_per_month;
  const requested = postsPerMonth === null ? 30 : postsPerMonth;
  const chunkCount = calendarChunkCount(requested);

  const startedAt = Date.now();
  let slotsCreated = 0;
  let usedFallback = false;
  let reason: string | undefined;
  let chunksCompleted = 0;
  let stoppedEarly = false;

  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
    if (chunkIndex > 0 && Date.now() - startedAt >= SEED_CHUNK_BUDGET_MS) {
      stoppedEarly = true;
      console.warn(
        `[seed-calendar] stopping after ${chunksCompleted} chunk(s) — budget exhausted for userId=${userId}`
      );
      break;
    }

    const chunk = await generateCalendarChunk(
      {
        userId,
        month,
        year,
        brand: mapped,
        pillars: pillars ?? [],
        platforms: activePlatforms,
        postsPerMonth,
      },
      { chunkIndex, chunkCount }
    );

    if (chunk.usedFallback) {
      usedFallback = true;
      reason = chunk.reason;
      console.error(
        `[seed-calendar] AI generation failed for userId=${userId} chunk=${chunkIndex} — starter/template content was created instead. reason=${reason}`
      );
    }

    if (chunk.slots.length > 0) {
      const { error } = await supabase.from("content_calendar").insert(
        chunk.slots.map((slot) => ({
          ...slot,
          user_id: userId,
        }))
      );
      if (error) {
        console.error("[seed-calendar] insert failed:", error);
        // Keep earlier chunks; surface partial success if any were saved.
        if (slotsCreated > 0) {
          await incrementCalendarUsage(supabase, userId, slotsCreated);
          return NextResponse.json({
            success: true,
            slots_created: slotsCreated,
            chunks_completed: chunksCompleted,
            stopped_early: true,
            usedFallback,
            ...(usedFallback ? { reason } : {}),
            warning: "Failed to save a later chunk; earlier posts were kept.",
          });
        }
        return NextResponse.json(
          { error: "Failed to save calendar slots" },
          { status: 500 }
        );
      }
      slotsCreated += chunk.slots.length;
    }

    chunksCompleted += 1;
  }

  if (slotsCreated > 0) {
    await incrementCalendarUsage(supabase, userId, slotsCreated);
  }

  return NextResponse.json({
    success: true,
    slots_created: slotsCreated,
    chunks_completed: chunksCompleted,
    stopped_early: stoppedEarly,
    usedFallback,
    ...(usedFallback ? { reason } : {}),
  });
}
