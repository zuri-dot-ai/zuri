import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getResend } from "@/lib/email/resend-client";
import type { AgencyBrief } from "@/types/brand";

// #region agent log
fetch("http://127.0.0.1:7419/ingest/076876bf-f6bf-42a9-9aff-97004d9bbbbe", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Debug-Session-Id": "91f293",
  },
  body: JSON.stringify({
    sessionId: "91f293",
    location: "agencies/match/route.ts:module",
    message: "Module loaded without Resend construct",
    data: {
      hasKey: !!process.env.RESEND_API_KEY?.trim(),
      keyLen: process.env.RESEND_API_KEY?.trim()?.length ?? 0,
    },
    timestamp: Date.now(),
    hypothesisId: "A",
    runId: "post-fix",
  }),
}).catch(() => {});
// #endregion

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agencyId, brief } = (await request.json()) as {
    agencyId: string;
    brief: AgencyBrief;
  };

  // Record the match request
  const { error } = await supabase.from("agency_match_requests").insert({
    user_id: user.id,
    agency_id: agencyId,
    brief_json: brief,
    status: "pending",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the agency by email (service client bypasses RLS to read contact email)
  try {
    const service = createServiceClient();
    const { data: agency } = await service
      .from("agencies")
      .select("name, contact_email")
      .eq("id", agencyId)
      .single();

    const resend = getResend();
    if (agency?.contact_email && resend) {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "Zuri <onboarding@resend.dev>",
        to: agency.contact_email,
        subject: `New client brief from Zuri — ${brief.business_summary?.slice(0, 40)}`,
        text: [
          `Hi ${agency.name},`,
          ``,
          `A business owner on Zuri would like to work with you.`,
          ``,
          `Business: ${brief.business_summary}`,
          `Goals: ${brief.goals?.join(", ")}`,
          `Platforms: ${brief.platforms?.join(", ")}`,
          `Content volume: ${brief.content_volume}`,
          `Budget: ${brief.budget_range}`,
          `Timeline: ${brief.timeline}`,
          ``,
          `Please respond within ${48}h. — The Zuri Team`,
        ].join("\n"),
      });
    }
  } catch (err) {
    // Email failure shouldn't block the match record
    console.error("[agency-match email]", err);
  }

  return NextResponse.json({ status: "sent" });
}
