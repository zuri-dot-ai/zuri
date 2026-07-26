import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  createAnonymousSession,
  getAnonymousSessionIdFromCookie,
  getClientIp,
  hashForRateLimit,
  restoreAnonymousSessionCookie,
} from "@/lib/onboarding/anonymous-session";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * POST /api/onboarding/start (docs/01_ONBOARDING_V2.md §7.1)
 * Public, no auth. Creates (or reuses) the anonymous onboarding session and
 * sets its cookie. Rate limited by ip_hash — 5 new sessions per 24h — since
 * no user_id exists yet to key off.
 *
 * Optional body `{ restoreToken }` re-attaches a known session from a
 * client-side backup when the httpOnly cookie is missing (OAuth return).
 */
export async function POST(req: Request) {
  let restoreToken: string | null = null;
  try {
    const body = (await req.json()) as { restoreToken?: unknown };
    if (typeof body.restoreToken === "string" && UUID_RE.test(body.restoreToken)) {
      restoreToken = body.restoreToken;
    }
  } catch {
    /* empty / non-JSON body is fine */
  }

  // Reuse an existing, still-valid session if the cookie is already set —
  // avoids burning the per-IP rate limit budget on repeat visits/refreshes.
  const existingToken = await getAnonymousSessionIdFromCookie();
  if (existingToken) {
    const service = createServiceClient();
    const { data: existing } = await service
      .from("anonymous_onboarding_sessions")
      .select("session_token, expires_at")
      .eq("session_token", existingToken)
      .maybeSingle();

    if (existing && new Date(existing.expires_at).getTime() > Date.now()) {
      return NextResponse.json({ sessionToken: existing.session_token });
    }
  }

  // Cookie missing — try client backup before minting a new empty session.
  if (restoreToken) {
    const restored = await restoreAnonymousSessionCookie(restoreToken);
    if (restored) {
      return NextResponse.json({ sessionToken: restoreToken });
    }
  }

  const ip = getClientIp(req.headers);
  const ipHash = ip ? hashForRateLimit(ip) : null;
  const userAgent = req.headers.get("user-agent");
  const userAgentHash = userAgent ? hashForRateLimit(userAgent) : null;

  if (ipHash) {
    const service = createServiceClient();
    const rateLimit = await checkRateLimit(service, ipHash, "onboarding:start");
    if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);
  }

  try {
    const sessionToken = await createAnonymousSession({ ipHash, userAgentHash });
    return NextResponse.json({ sessionToken });
  } catch (err) {
    console.error("[onboarding/start] failed to create session:", err);
    return NextResponse.json(
      { error: "Could not start onboarding. Please try again." },
      { status: 500 }
    );
  }
}
