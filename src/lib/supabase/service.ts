/**
 * Service-role Supabase client — bypasses RLS.
 *
 * NEVER import in client components or pages.
 * Use only in cron jobs, webhooks, internal triggers, and trusted server contexts.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
