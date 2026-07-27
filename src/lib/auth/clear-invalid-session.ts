import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

/**
 * Detect Auth errors that mean the browser JWT is no longer valid server-side
 * (deleted user, revoked session, etc.). These show up as 403 on /auth/v1/user.
 */
export function isInvalidAuthSessionError(
  error: AuthError | Error | null | undefined
): boolean {
  if (!error) return false;
  const status =
    typeof error === "object" && "status" in error
      ? Number((error as { status?: unknown }).status)
      : undefined;
  const message = (error.message ?? "").toLowerCase();

  if (status === 403 || status === 401) return true;
  return (
    message.includes("user from sub claim") ||
    message.includes("session from session_id") ||
    message.includes("user not found") ||
    message.includes("does not exist") ||
    message.includes("invalid jwt") ||
    message.includes("session not found")
  );
}

/**
 * Drop a poisoned local session so a deleted/banned JWT cannot keep
 * poisoning middleware, OAuth callback, or /start bootstrap.
 */
export async function clearInvalidLocalSession(
  supabase: SupabaseClient
): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* local clear is best-effort */
  }
}
