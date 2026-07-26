import { cookies } from "next/headers";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

export const ANON_COOKIE_NAME = "zuri_anon_session";
export const ANON_SESSION_TTL_HOURS = 72; // matches the "come back later" tolerance

/**
 * Reads the anonymous session cookie if present. Does NOT create one —
 * use `getOrCreateAnonymousSessionId()` from a route that can set cookies
 * (Route Handlers / Server Actions), or read the cookie directly on the
 * client for API calls.
 */
export async function getAnonymousSessionIdFromCookie(): Promise<
  string | null
> {
  const cookieStore = await cookies();
  return cookieStore.get(ANON_COOKIE_NAME)?.value ?? null;
}

/**
 * Creates a brand-new anonymous session: generates a token, inserts the
 * `anonymous_onboarding_sessions` row, and sets the cookie. Intended for use
 * from `POST /api/onboarding/start` only — callers elsewhere should read the
 * existing cookie instead of minting new sessions.
 */
export async function createAnonymousSession(params: {
  ipHash: string | null;
  userAgentHash: string | null;
}): Promise<string> {
  const sessionToken = crypto.randomUUID();
  const supabase = createServiceClient();

  const { error } = await supabase.from("anonymous_onboarding_sessions").insert({
    session_token: sessionToken,
    ip_hash: params.ipHash,
    user_agent_hash: params.userAgentHash,
  });

  if (error) {
    throw new Error(`Failed to create anonymous session: ${error.message}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(ANON_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ANON_SESSION_TTL_HOURS * 3600,
    path: "/",
  });

  return sessionToken;
}

/** Clears the anonymous session cookie — called right after conversion. */
export async function clearAnonymousSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ANON_COOKIE_NAME);
}

/**
 * Re-attaches the anonymous session cookie for an existing, still-valid token
 * (e.g. after OAuth when the httpOnly cookie was missing but sessionStorage
 * still had the backup). Does not create a new session row.
 */
export async function restoreAnonymousSessionCookie(
  sessionToken: string
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("anonymous_onboarding_sessions")
    .select("session_token, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  // Allow restore even if converted_user_id is set — complete may have
  // partially run; answers in `data` are still needed for a retry.
  if (!existing || new Date(existing.expires_at).getTime() <= Date.now()) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(ANON_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ANON_SESSION_TTL_HOURS * 3600,
    path: "/",
  });

  return true;
}

/** One-way hash for rate-limiting keys — never store raw IP/UA. */
export function hashForRateLimit(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Best-effort real client IP extraction behind common proxies/CDNs. */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? null;
}
