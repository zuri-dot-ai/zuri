import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * CRITICAL: Always check server-side. Never trust client-provided admin claims.
 */
export async function requireAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  return data?.is_admin === true;
}
