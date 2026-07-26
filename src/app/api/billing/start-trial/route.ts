import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { isPlanId, PLAN_CONFIG, type PlanId } from "@/lib/payments/plans";
import {
  buildStartTrialUpdate,
  canStartTrial,
} from "@/lib/payments/trials";
import { createNotificationAsync } from "@/lib/notifications/create-notification";

export async function POST(request: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  const rateLimit = await checkRateLimit(supabase, user.id, "api:general");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  let body: { planId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const planId = body.planId;
  if (!isPlanId(planId) || planId === "free") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("plan_id, status, trials_used, trial_ends_at, trial_tier")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subError) {
    return NextResponse.json({ error: "Could not load subscription" }, { status: 500 });
  }

  const row = sub ?? {
    plan_id: "free",
    status: "active",
    trials_used: [] as string[],
    trial_ends_at: null,
    trial_tier: null,
  };

  const eligibility = canStartTrial(row, planId as PlanId);
  if (!eligibility.ok) {
    return NextResponse.json({ error: eligibility.reason }, { status: 400 });
  }

  const update = buildStartTrialUpdate(planId as PlanId, row.trials_used);

  const { error: updateError } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: user.id,
        ...update,
      },
      { onConflict: "user_id" }
    );

  if (updateError) {
    return NextResponse.json(
      { error: "Could not start trial" },
      { status: 500 }
    );
  }

  const planName = PLAN_CONFIG[planId as PlanId].name;
  createNotificationAsync({
    userId: user.id,
    type: "plan_upgraded",
    title: `${planName} trial started`,
    body: `You're on a ${planName} trial until ${new Date(update.trial_ends_at).toLocaleDateString("en-NG")}. No payment required.`,
    actionUrl: "/settings?tab=billing",
    actionLabel: "View billing",
  });

  return NextResponse.json({
    planId,
    trialEndsAt: update.trial_ends_at,
    status: "trialing",
  });
}
