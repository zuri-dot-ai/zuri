import { cookies } from "next/headers";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

export const CUSTOM_SITE_COOKIE_NAME = "zuri_custom_site_session";
export const CUSTOM_SITE_SESSION_TTL_HOURS = 72;

export async function getCustomSiteSessionIdFromCookie(): Promise<
  string | null
> {
  const cookieStore = await cookies();
  return cookieStore.get(CUSTOM_SITE_COOKIE_NAME)?.value ?? null;
}

export async function createCustomSiteAnonymousSession(params: {
  ipHash: string | null;
  userAgentHash: string | null;
}): Promise<string> {
  const sessionToken = crypto.randomUUID();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("anonymous_custom_site_sessions")
    .insert({
      session_token: sessionToken,
      ip_hash: params.ipHash,
      user_agent_hash: params.userAgentHash,
    });

  if (error) {
    throw new Error(
      `Failed to create custom site session: ${error.message}`
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(CUSTOM_SITE_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CUSTOM_SITE_SESSION_TTL_HOURS * 3600,
    path: "/",
  });

  return sessionToken;
}

export async function clearCustomSiteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOM_SITE_COOKIE_NAME);
}

export async function convertCustomSiteSession(
  sessionToken: string,
  userId: string
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("anonymous_custom_site_sessions")
    .update({ converted_user_id: userId })
    .eq("session_token", sessionToken)
    .is("converted_user_id", null);

  if (error) {
    throw new Error(
      `Failed to convert custom site session: ${error.message}`
    );
  }
}
