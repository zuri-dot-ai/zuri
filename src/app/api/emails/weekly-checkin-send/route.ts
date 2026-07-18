import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getResend } from "@/lib/email/resend-client";
import { geminiJSON, FLASH } from "@/lib/gemini";
import { WEEKLY_CHECKIN_SYSTEM, weeklyCheckinPrompt } from "@/lib/prompts";
import type { WeeklyCheckin } from "@/types/brand";

function verifyCron(request: Request): boolean {
  return (
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
  );
}

export async function POST(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // All active paid subscribers via subscriptions + profiles
  const { data: paidSubs } = await service
    .from("subscriptions")
    .select("user_id, plan_id")
    .eq("status", "active")
    .neq("plan_id", "free");

  if (!paidSubs?.length) return NextResponse.json({ sent: 0 });

  const userIds = paidSubs.map((s) => s.user_id);
  const { data: profiles } = await service
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);

  const subscribers = profiles ?? [];
  if (!subscribers.length) return NextResponse.json({ sent: 0 });

  let sent = 0;

  for (const sub of subscribers) {
    try {
      const [{ data: profile }, { data: progress }, { count: weekCount }] =
        await Promise.all([
          service
            .from("business_profiles")
            .select("business_name")
            .eq("user_id", sub.id)
            .single(),
          service
            .from("user_progress")
            .select("current_streak, week_completion_rate")
            .eq("user_id", sub.id)
            .single(),
          service
            .from("action_plan_tasks")
            .select("*", { count: "exact", head: true })
            .eq("user_id", sub.id)
            .eq("is_completed", true)
            .gte("completed_at", weekAgo.toISOString()),
        ]);

      // Gemini writes the personal message
      const checkin = await geminiJSON<WeeklyCheckin>(
        weeklyCheckinPrompt({
          businessName: profile?.business_name ?? "your business",
          tasksCompletedLastWeek: weekCount ?? 0,
          currentStreak: progress?.current_streak ?? 0,
          weekRate: Math.round(progress?.week_completion_rate ?? 0),
        }),
        { model: FLASH, system: WEEKLY_CHECKIN_SYSTEM, temperature: 0.7 }
      );

      const resend = getResend();
      if (!resend) continue;

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Zuri <onboarding@resend.dev>",
        to: sub.email,
        subject: checkin.headline,
        text: [
          checkin.encouragement,
          "",
          "Your top 3 moves this week:",
          ...checkin.top_moves.map((m, i) => `${i + 1}. ${m}`),
          "",
          "Back to your dashboard: https://app.zuri.app/dashboard",
          "",
          "— Your Zuri Coach",
        ].join("\n"),
      });

      sent++;
    } catch (err) {
      console.error(`[weekly-checkin-send] Failed for ${sub.id}:`, err);
    }
  }

  return NextResponse.json({ sent });
}