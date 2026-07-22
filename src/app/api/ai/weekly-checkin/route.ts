import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { geminiJSON, FLASH } from "@/lib/gemini";
import { WEEKLY_CHECKIN_SYSTEM, weeklyCheckinPrompt } from "@/lib/prompts";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import { isRateLimitError, RATE_LIMIT_MESSAGE } from "@/lib/errors/gemini-errors";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import type { WeeklyCheckin } from "@/types/brand";

export async function POST() {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  const rateLimit = await checkRateLimit(supabase, user.id, "generation:content");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const [{ data: profile }, { data: progress }] = await Promise.all([
    supabase.from("business_profiles").select("business_name").eq("user_id", user.id).single(),
    supabase.from("user_progress").select("*").eq("user_id", user.id).single(),
  ]);

  // Count tasks completed in the last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count } = await supabase
    .from("action_plan_tasks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_completed", true)
    .gte("completed_at", weekAgo.toISOString());

  try {
    // ── GEMINI 2.0 FLASH: personalized check-in ──
    const checkin = await geminiJSON<WeeklyCheckin>(
      weeklyCheckinPrompt({
        businessName: profile?.business_name || "your business",
        tasksCompletedLastWeek: count || 0,
        currentStreak: progress?.current_streak || 0,
        weekRate: progress?.week_completion_rate || 0,
      }),
      { model: FLASH, system: WEEKLY_CHECKIN_SYSTEM, temperature: 0.7 }
    );

    return NextResponse.json({ checkin });
  } catch (err) {
    if (isRateLimitError(err)) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId: user.id,
      route: "/api/ai/weekly-checkin",
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
      { error: ERROR_MESSAGES.SERVER_ERROR, support_ref: ref },
      { status: 500 }
    );
  }
}