// src/app/api/website/regenerate/route.ts
//
// REWRITTEN (2026-08): the original version awaited regenerateWebsite()
// inline in the POST handler, which works fine on paper but means the
// browser's fetch() has to stay open for the full pipeline duration
// (template select + Gemini Pro copy fill + image resolution — often
// 15-40s+). On Vercel Hobby, Node.js function duration is hard-capped at
// 60s regardless of what maxDuration declares, and more importantly the
// BROWSER's own request either times out client-side (safeFetchJSON's
// default 20s) or just makes for a bad "frozen tab" UX even if it doesn't
// time out.
//
// Fixed by mirroring the exact pattern already used successfully for
// initial generation (src/app/api/ai/generate-website/route.ts +
// src/lib/onboarding/complete-session.ts's triggerPostOnboardingJobs()):
//   1. POST creates a website_generation_jobs row (status: "queued") and
//      returns { jobId } immediately — no waiting.
//   2. It fires an UNAWAITED internal fetch to a worker endpoint
//      (POST .../regenerate/run) using the x-internal-secret pattern,
//      which is where the actual regenerateWebsite() call + markJob()
//      bookkeeping happens server-to-server.
//   3. The frontend polls website_generation_jobs via the Supabase client
//      SDK, exactly like GenerationStatusCard already does for initial
//      generation — this is proven, working infrastructure, not new
//      infrastructure.
//
// The regeneration-credit increment (usage_tracking.website_regenerations)
// now happens inside the worker route, only after regenerateWebsite()
// actually succeeds — same "don't charge for a failed run" behavior as
// before, just moved to where the real completion signal now lives.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkUsageLimit } from "@/lib/payments/feature-gate";
import { getActivePlanId, planDisplayName } from "@/lib/payments/get-plan";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Plan gate (unchanged from before — check BEFORE creating a job row,
  //    so a blocked user never sees a "queued" job that will just fail) ──
  const gate = await checkUsageLimit(supabase, user.id, "website_regenerations");
  if (!gate.allowed) {
    const planId = await getActivePlanId(supabase, user.id);
    return NextResponse.json(
      {
        error:
          gate.limit === 0
            ? `Regenerating your website requires a paid plan. Upgrade to Pro or higher.`
            : `You've used all ${gate.limit} of your regenerations this month on the ${planDisplayName(
                planId
              )} plan.`,
        upgradeRequired: gate.limit === 0 ? "pro" : undefined,
        used: gate.used,
        limit: gate.limit,
      },
      { status: 403 }
    );
  }

  // ── Confirm a website already exists (regenerate, not first generation) ─
  const { data: existingWebsite } = await supabase
    .from("websites")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingWebsite) {
    return NextResponse.json(
      {
        error:
          "No website found to regenerate. Generate your website first from onboarding.",
      },
      { status: 404 }
    );
  }

  // ── Prevent double-submission: block if a regeneration job is already
  //    in flight for this user ──
  const service = createServiceClient();
  const { data: activeJob } = await service
    .from("website_generation_jobs")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeJob) {
    return NextResponse.json({
      success: true,
      jobId: activeJob.id,
      alreadyInProgress: true,
    });
  }

  // ── Create the job row, same shape as generate-website's job creation ──
  const { data: job, error: jobErr } = await service
    .from("website_generation_jobs")
    .insert({ user_id: user.id, status: "queued" })
    .select("id")
    .single();

  if (jobErr || !job) {
    return NextResponse.json(
      { error: "Could not start regeneration. Please try again." },
      { status: 500 }
    );
  }

  // ── Fire the actual work server-to-server, unawaited — same
  //    fire-and-forget pattern as triggerPostOnboardingJobs() in
  //    complete-session.ts. The browser never waits on this. ──
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (!appUrl || !internalSecret) {
    // Same fallback signal as triggerPostOnboardingJobs() — env not
    // configured, so tell the client to kick the worker itself (it can
    // fire the same unawaited-from-client-perspective fetch and simply
    // not await the promise, relying on the polling loop rather than the
    // POST response).
    return NextResponse.json({
      success: true,
      jobId: job.id,
      clientMustTrigger: true,
    });
  }

  fetch(`${appUrl}/api/website/regenerate/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": internalSecret,
    },
    body: JSON.stringify({ userId: user.id, jobId: job.id }),
  }).catch((err) => console.error("Website regeneration trigger failed:", err));

  return NextResponse.json({ success: true, jobId: job.id });
}

/** Lightweight GET for the frontend to check remaining regenerations before
 *  rendering the button state (used/limit), without triggering a regenerate. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await checkUsageLimit(supabase, user.id, "website_regenerations");
  const planId = await getActivePlanId(supabase, user.id);

  return NextResponse.json({
    allowed: gate.allowed,
    used: gate.used,
    limit: gate.limit,
    remaining: gate.remaining,
    planId,
  });
}