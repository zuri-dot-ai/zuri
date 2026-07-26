import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  createCustomSiteAnonymousSession,
  getCustomSiteSessionIdFromCookie,
} from "@/lib/custom-site/anonymous-session";
import {
  getClientIp,
  hashForRateLimit,
} from "@/lib/onboarding/anonymous-session";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/security/rate-limit";

/**
 * POST /api/custom-site/start
 * Public. Creates (or reuses) the anonymous custom-site session cookie.
 */
export async function POST(req: Request) {
  const existingToken = await getCustomSiteSessionIdFromCookie();
  if (existingToken) {
    const service = createServiceClient();
    const { data: existing } = await service
      .from("anonymous_custom_site_sessions")
      .select("session_token, expires_at")
      .eq("session_token", existingToken)
      .maybeSingle();

    if (existing && new Date(existing.expires_at).getTime() > Date.now()) {
      return NextResponse.json({ sessionToken: existing.session_token });
    }
  }

  const ip = getClientIp(req.headers);
  const ipHash = ip ? hashForRateLimit(ip) : null;
  const userAgent = req.headers.get("user-agent");
  const userAgentHash = userAgent ? hashForRateLimit(userAgent) : null;

  if (ipHash) {
    const service = createServiceClient();
    const rateLimit = await checkRateLimit(service, ipHash, "custom_site:start");
    if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);
  }

  try {
    const sessionToken = await createCustomSiteAnonymousSession({
      ipHash,
      userAgentHash,
    });
    return NextResponse.json({ sessionToken });
  } catch (err) {
    console.error("[custom-site/start] failed:", err);
    return NextResponse.json(
      { error: "Could not start custom site request. Please try again." },
      { status: 500 }
    );
  }
}
