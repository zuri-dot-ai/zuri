// docs/11_ERROR_HANDLING.md §7.2
// Runs every 10 minutes — detects website generation jobs stuck in "processing"
// state for more than 5 minutes, retries up to 2x, then marks as failed.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@/lib/notifications/create-notification";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: stuckJobs } = await supabase
    .from("website_generation_jobs")
    .select("id, user_id, retry_count")
    .eq("status", "processing")
    .lt("updated_at", fiveMinutesAgo);

  for (const job of stuckJobs ?? []) {
    const retryCount = (job.retry_count as number | null) ?? 0;

    if (retryCount < 2) {
      // Re-queue for retry
      await supabase
        .from("website_generation_jobs")
        .update({
          status: "queued",
          retry_count: retryCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      // Re-trigger generation (fire-and-forget)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/generate-website`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET!,
        },
        body: JSON.stringify({ userId: job.user_id, jobId: job.id }),
      }).catch(() => {});
    } else {
      // Max retries reached — mark as failed
      await supabase
        .from("website_generation_jobs")
        .update({
          status: "failed",
          error_message: "Job timed out after maximum retries",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      await createNotification({
        userId: job.user_id,
        type: "website_generation_failed",
        title: "Website generation failed",
        body: "We couldn't generate your website after multiple attempts. Please try again from your dashboard.",
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        actionLabel: "Retry",
      });
    }
  }

  return NextResponse.json({ processed: stuckJobs?.length ?? 0 });
}
