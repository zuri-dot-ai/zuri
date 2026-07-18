import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getResend } from "@/lib/email/resend-client";

// #region agent log
fetch('http://127.0.0.1:7419/ingest/076876bf-f6bf-42a9-9aff-97004d9bbbbe',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'91f293'},body:JSON.stringify({sessionId:'91f293',location:'emails/nudge/route.ts:module',message:'Module loaded without Resend construct',data:{hasKey:!!process.env.RESEND_API_KEY?.trim()},timestamp:Date.now(),hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
// #endregion

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
      const [{ data: profile }, { data: sub }, { data: tasks }] =
        await Promise.all([
          service
            .from("profiles")
            .select("email")
            .eq("id", row.user_id)
            .maybeSingle(),
          service
            .from("subscriptions")
            .select("plan_id, status")
            .eq("user_id", row.user_id)
            .maybeSingle(),
          service
            .from("action_plan_tasks")
            .select("task_title, ai_asset, platform")
            .eq("user_id", row.user_id)
            .eq("is_completed", false)
            .order("day_number", { ascending: true })
            .limit(2),
        ]);

      const planId = sub?.plan_id ?? "free";
      const paid =
        (sub?.status === "active" || sub?.status === "grace_period") &&
        planId !== "free";
      if (!profile?.email || !paid) continue;

      const taskLines = (tasks ?? [])
        .map(
          (t, i) =>
            `Task ${i + 1}: ${t.task_title}\n${t.ai_asset ? `Draft ready: ${t.ai_asset.slice(0, 120)}…` : ""}`
        )
        .join("\n\n");

      const resend = getResend();
      if (!resend) continue;

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Zuri <onboarding@resend.dev>",
        to: profile.email,
        subject: "Your content is waiting for you",
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