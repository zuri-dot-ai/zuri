import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { canvaDeepLink } from "@/lib/canva";

const resend = new Resend(process.env.RESEND_API_KEY);

// Protect with a cron secret so this can't be called publicly
function verifyCron(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Find active subscribers who haven't logged in for 3+ days
  const { data: inactive } = await service
    .from("user_progress")
    .select("user_id, last_active_date")
    .lte("last_active_date", threeDaysAgo.toISOString().split("T")[0])
    .not("last_active_date", "is", null);

  if (!inactive || inactive.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;

  for (const row of inactive) {
    try {
      // Get user email + their next two pending tasks
      const [{ data: user }, { data: tasks }] = await Promise.all([
        service
          .from("users")
          .select("email, subscription_plan")
          .eq("id", row.user_id)
          .single(),
        service
          .from("action_plan_tasks")
          .select("task_title, ai_asset, platform")
          .eq("user_id", row.user_id)
          .eq("is_completed", false)
          .order("day_number", { ascending: true })
          .limit(2),
      ]);

      // Only nudge paid subscribers
      if (!user?.email || user.subscription_plan === "free") continue;

      const taskLines = (tasks ?? [])
        .map(
          (t, i) =>
            `Task ${i + 1}: ${t.task_title}\n${t.ai_asset ? `Draft ready: ${t.ai_asset.slice(0, 120)}…` : ""}`
        )
        .join("\n\n");

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Zuri <onboarding@resend.dev>",
        to: user.email,
        subject: "Your content is waiting for you 📬",
        text: [
          "Hey — your Zuri dashboard has been quiet for a few days.",
          "",
          "Here are two tasks ready to go right now:",
          "",
          taskLines || "Log in to see your next tasks.",
          "",
          "Your content drafts are written. Your plan is running. All you have to do is show up.",
          "",
          "Back to your dashboard: https://app.zuri.app/dashboard",
          "",
          "— Zuri",
        ].join("\n"),
      });

      sent++;
    } catch (err) {
      console.error(`[nudge] Failed for user ${row.user_id}:`, err);
    }
  }

  return NextResponse.json({ sent });
}