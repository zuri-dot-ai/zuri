import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeOnboardingSession } from "@/lib/onboarding/complete-session";
import {
  RATE_LIMITS,
  rateLimitExceededResponse,
} from "@/lib/security/rate-limit";

/**
 * Onboarding V2 (docs/01_ONBOARDING_V2.md §7.5) — fires from the Step 11
 * signup-success handler. The request body is just `{ sessionToken }`;
 * everything else is looked up server-side from the anonymous session row.
 * NEVER trust a client-submitted OnboardingState body directly.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionToken =
    typeof body.sessionToken === "string" ? body.sessionToken : "";

  const result = await completeOnboardingSession(user, sessionToken);

  if (!result.ok) {
    if (result.status === 429) {
      return rateLimitExceededResponse(
        RATE_LIMITS["onboarding:complete"].windowSeconds
      );
    }
    return NextResponse.json(
      {
        error: result.error,
        details: result.details,
        code: result.code,
      },
      { status: result.status }
    );
  }

  return NextResponse.json({
    success: true,
    jobId: result.jobId,
    triggeredGeneration: result.triggeredGeneration,
  });
}
