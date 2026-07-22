import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { geminiJSON, PRO } from "@/lib/gemini";
import { ACTION_PLAN_SYSTEM, actionPlanPrompt } from "@/lib/prompts";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import { isRateLimitError, RATE_LIMIT_MESSAGE } from "@/lib/errors/gemini-errors";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import type { GeneratedTask } from "@/types/brand";
import type { TaskType, Platform } from "@/types/database";

export const maxDuration = 60; // 90-task generation can take a moment

export async function POST(request: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  const rateLimit = await checkRateLimit(supabase, user.id, "generation:content");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

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
    if (isRateLimitError(err)) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId: user.id,
      route: "/api/ai/generate-plan",
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