import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geminiJSON, PRO } from "@/lib/gemini";
import { ACTION_PLAN_SYSTEM, actionPlanPrompt } from "@/lib/prompts";
import type { GeneratedTask } from "@/types/brand";
import type { TaskType, Platform } from "@/types/database";

export const maxDuration = 60; // 90-task generation can take a moment

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platforms, skillLevel } = (await request.json()) as {
    platforms: string[];
    skillLevel: string;
  };

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Complete onboarding first" }, { status: 400 });
  }

  try {
    // ── GEMINI 2.5 PRO: generate 90 tasks ──
    const tasks = await geminiJSON<GeneratedTask[]>(
      actionPlanPrompt({ profile, platforms, skillLevel: skillLevel || "beginner" }),
      { model: PRO, system: ACTION_PLAN_SYSTEM, temperature: 0.6 }
    );

    const today = new Date();

    const rows = tasks.slice(0, 90).map((t) => {
      const due = new Date(today);
      due.setDate(today.getDate() + (t.day - 1));
      return {
        user_id: user.id,
        day_number: t.day,
        task_title: t.title,
        task_description: t.description,
        why_this_matters: t.why_this_matters,
        task_type: (t.task_type as TaskType) || "content",
        ai_asset: t.ai_asset,
        estimated_minutes: t.estimated_minutes || 10,
        platform: (t.platform as Platform) || null,
        due_date: due.toISOString().split("T")[0],
      };
    });

    // Clear any prior plan, then insert fresh
    await supabase.from("action_plan_tasks").delete().eq("user_id", user.id);
    const { error } = await supabase.from("action_plan_tasks").insert(rows);
    if (error) throw error;

    return NextResponse.json({ count: rows.length });
  } catch (err) {
    console.error("[generate-plan]", err);
    return NextResponse.json(
      { error: "Could not generate your action plan. Please try again." },
      { status: 500 }
    );
  }
}