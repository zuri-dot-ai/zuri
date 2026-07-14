import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiJSON, FLASH } from "@/lib/gemini";
import { WEEKLY_CHECKIN_SYSTEM, weeklyCheckinPrompt } from "@/lib/prompts";
import type { WeeklyCheckin } from "@/types/brand";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    console.error("[weekly-checkin]", err);
    return NextResponse.json({ error: "Could not generate check-in." }, { status: 500 });
  }
}