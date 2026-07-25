import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/security/rate-limit";
import { sanitizeText } from "@/lib/utils/sanitize";
import { geminiJSON, FLASH } from "@/lib/gemini";

const MAX_DESCRIPTION_LENGTH = 70;

/**
 * POST /api/onboarding/generate-service-description
 * Anonymous session-gated helper for Step 2 — one short service blurb via Gemini Flash.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sessionToken =
    typeof body.sessionToken === "string" ? body.sessionToken.trim() : "";
  const serviceName = sanitizeText(body.serviceName ?? "");
  const businessType = sanitizeText(body.businessType ?? "");

  if (!sessionToken) {
    return NextResponse.json({ error: "Missing sessionToken" }, { status: 400 });
  }
  if (serviceName.length < 2) {
    return NextResponse.json(
      { error: "Enter a service name first" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: session, error: sessionError } = await supabase
    .from("anonymous_onboarding_sessions")
    .select("id, expires_at, data")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (sessionError && sessionError.code !== "PGRST116") {
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json(
      { error: "Onboarding session not found or expired" },
      { status: 404 }
    );
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Onboarding session expired" },
      { status: 410 }
    );
  }

  const rate = await checkRateLimit(
    supabase,
    sessionToken,
    "onboarding:generate_service_description"
  );
  if (!rate.allowed) {
    return rateLimitExceededResponse(rate.resetIn);
  }

  const sessionData =
    session.data && typeof session.data === "object"
      ? (session.data as Record<string, unknown>)
      : {};
  const businessName =
    typeof sessionData.businessName === "string"
      ? sanitizeText(sessionData.businessName)
      : "";
  const category =
    businessType ||
    (typeof sessionData.businessType === "string"
      ? sanitizeText(sessionData.businessType)
      : "");

  try {
    const result = await geminiJSON<{ description: string }>(
      `Write one short service description for a Nigerian small business website.

Service name: "${serviceName}"
Business category: "${category || "general"}"
Business name: "${businessName || "(not set yet)"}"

Rules:
- Exactly one sentence
- Max ${MAX_DESCRIPTION_LENGTH} characters
- Specific and natural — what the service includes or who it's for
- No quotes, no brackets, no marketing fluff, no hashtags
Return JSON: { "description": "..." }`,
      { model: FLASH, temperature: 0.7 }
    );

    const description = sanitizeText(result.description ?? "")
      .replace(/^["']|["']$/g, "")
      .slice(0, MAX_DESCRIPTION_LENGTH);

    if (description.length < 10) {
      return NextResponse.json(
        { error: "Couldn't generate — try again or type your own." },
        { status: 502 }
      );
    }

    return NextResponse.json({ description });
  } catch (err) {
    console.error("[generate-service-description]", err);
    return NextResponse.json(
      { error: "Couldn't generate — try again or type your own." },
      { status: 502 }
    );
  }
}
