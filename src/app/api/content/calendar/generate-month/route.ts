import { NextResponse } from "next/server";
import {
  calendarChunkCount,
  generateCalendarChunk,
} from "@/lib/content/calendar-generator";
import {
  assertCalendarQuota,
  incrementCalendarUsage,
  mapBrandForCalendar,
  requireContentUser,
  requireProCalendar,
} from "@/lib/content/api-helpers";
import { PLAN_CONFIG } from "@/lib/payments/plans";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import { classifySupabaseError } from "@/lib/errors/supabase-errors";
import { isRateLimitError, RATE_LIMIT_MESSAGE } from "@/lib/errors/gemini-errors";
import { ERROR_MESSAGES } from "@/lib/errors/messages";

export const maxDuration = 120;

function monthDateBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export async function POST(req: Request) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;

  const rateLimit = await checkRateLimit(
    auth.supabase,
    auth.user.id,
    "generation:content"
  );
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const pro = await requireProCalendar(auth.supabase, auth.user.id);
  if ("error" in pro) return pro.error;

  let body: { month?: number; year?: number; chunkIndex?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const now = new Date();
  const month = body.month ?? now.getMonth() + 1;
  const year = body.year ?? now.getFullYear();
  const chunkIndex = Number.isInteger(body.chunkIndex)
    ? Math.max(0, body.chunkIndex as number)
    : 0;

  if (month < 1 || month > 12 || year < 2020 || year > now.getFullYear() + 1) {
    return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
  }

  const planLimits = PLAN_CONFIG[auth.planId].limits;
  const postsPerMonth = planLimits.calendar_posts_per_month;
  // Keep the full month size for deterministic chunk planning across requests.
  const requested = postsPerMonth === null ? 30 : postsPerMonth;

  // Only require room for at least one more post — per-chunk inserts
  // increment usage, so asserting the full month here would fail on chunk 1+.
  const quota = await assertCalendarQuota(auth.supabase, auth.user.id, 1);
  if ("error" in quota) return quota.error;

  try {
    const { start, end } = monthDateBounds(year, month);
    const [{ data: brand }, { data: pillars }, { data: existingRows }] =
      await Promise.all([
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
        auth.supabase
          .from("content_calendar")
          .select("scheduled_date, platform")
          .eq("user_id", auth.user.id)
          .gte("scheduled_date", start)
          .lte("scheduled_date", end),
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

    const existingKeys = new Set(
      (existingRows ?? []).map((r) => `${r.scheduled_date}|${r.platform}`)
    );

    // Month already fully populated — nothing to generate.
    if (existingKeys.size >= requested && requested > 0) {
      const chunkCount = calendarChunkCount(requested);
      return NextResponse.json({
        success: true,
        slots: [],
        slots_created: 0,
        chunkIndex,
        chunkCount,
        done: true,
        usedFallback: false,
        message: "Calendar already has posts for this month.",
      });
    }

    const {
      slots,
      usedFallback,
      reason,
      chunkIndex: resolvedChunk,
      chunkCount,
      done,
      totalPosts,
    } = await generateCalendarChunk(
      {
        userId: auth.user.id,
        month,
        year,
        brand: mapped,
        pillars: pillars ?? [],
        platforms: activePlatforms,
        postsPerMonth: requested,
      },
      { chunkIndex }
    );

    if (usedFallback) {
      console.error(
        `[generate-month] AI generation failed for userId=${auth.user.id} month=${month}/${year} chunk=${resolvedChunk}/${chunkCount} — starter/template content was created instead. reason=${reason}`
      );
    }

    let newSlots = slots.filter(
      (s) => !existingKeys.has(`${s.scheduled_date}|${s.platform}`)
    );
    if (quota.remaining !== null && newSlots.length > quota.remaining) {
      newSlots = newSlots.slice(0, quota.remaining);
    }

    if (newSlots.length > 0) {
      const { data: inserted, error } = await auth.supabase
        .from("content_calendar")
        .insert(newSlots.map((s) => ({ ...s, user_id: auth.user.id })))
        .select();

      if (error) {
        const { status, message } = classifySupabaseError(error);
        return NextResponse.json(
          { error: message || ERROR_MESSAGES.CALENDAR_GENERATION_FAILED },
          { status }
        );
      }

      await incrementCalendarUsage(
        auth.supabase,
        auth.user.id,
        inserted?.length ?? 0
      );

      return NextResponse.json({
        success: true,
        slots: inserted ?? [],
        slots_created: inserted?.length ?? 0,
        chunkIndex: resolvedChunk,
        chunkCount,
        done,
        totalPosts,
        usedFallback,
        ...(usedFallback ? { reason } : {}),
      });
    }

    // Chunk produced only duplicates (resume after partial success) or empty.
    return NextResponse.json({
      success: true,
      slots: [],
      slots_created: 0,
      chunkIndex: resolvedChunk,
      chunkCount,
      done,
      totalPosts,
      message:
        totalPosts === 0
          ? "No remaining days in this month to schedule. Try next month."
          : undefined,
      usedFallback,
      ...(usedFallback ? { reason } : {}),
    });
  } catch (err) {
    if (isRateLimitError(err)) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId: auth.user.id,
      route: "/api/content/calendar/generate-month",
    });
    const isTimeout =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("timeout"));
    if (isTimeout) {
      return NextResponse.json(
        { error: "The request timed out. Please try again." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: ERROR_MESSAGES.CALENDAR_GENERATION_FAILED, support_ref: ref },
      { status: 500 }
    );
  }
}
