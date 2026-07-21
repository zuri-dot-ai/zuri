// docs/08_NOTIFICATIONS.md §10 — prevents the same email template being sent
// too frequently to the same user. Uses email_send_log (service-role only).

import type { SupabaseClient } from "@supabase/supabase-js";

const EMAIL_RATE_LIMITS: Record<string, { count: number; windowHours: number }> = {
  contact_form_received: { count: 5, windowHours: 1 },
  usage_warning: { count: 1, windowHours: 720 },
  usage_limit_reached: { count: 1, windowHours: 24 },
  domain_dns_delayed: { count: 1, windowHours: 24 },
  meta_token_expired: { count: 1, windowHours: 24 },
};

export async function isEmailRateLimited(
  supabase: SupabaseClient,
  userId: string,
  template: string
): Promise<boolean> {
  const limit = EMAIL_RATE_LIMITS[template];
  if (!limit) return false;

  const windowStart = new Date(
    Date.now() - limit.windowHours * 60 * 60 * 1000
  ).toISOString();

  const { count } = await supabase
    .from("email_send_log")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("template", template)
    .gte("sent_at", windowStart);

  return (count ?? 0) >= limit.count;
}

export async function logEmailSend(
  supabase: SupabaseClient,
  userId: string,
  template: string
): Promise<void> {
  await supabase.from("email_send_log").insert({
    user_id: userId,
    template,
    sent_at: new Date().toISOString(),
  });
}
