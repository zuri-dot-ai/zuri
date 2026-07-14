import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "auth.signup"
  | "auth.login"
  | "auth.logout"
  | "auth.password_reset"
  | "account.delete_requested"
  | "account.delete_confirmed"
  | "handle.changed"
  | "website.published"
  | "website.unpublished"
  | "website.deleted"
  | "custom_domain.added"
  | "custom_domain.removed"
  | "subscription.upgraded"
  | "subscription.downgraded"
  | "subscription.cancelled"
  | "payment.successful"
  | "payment.failed"
  | "admin.agency_approved"
  | "admin.agency_rejected"
  | "security.rate_limit_exceeded"
  | "security.invalid_webhook_signature"
  | "security.unauthorized_admin_attempt";

function anonymizeIp(ip: string): string {
  if (ip.includes(":")) {
    // IPv6 — keep first 3 groups
    const groups = ip.split(":");
    return groups.slice(0, 3).join(":") + ":0:0:0:0:0";
  }
  // IPv4 — keep first 3 octets
  const octets = ip.split(".");
  if (octets.length !== 4) return "0.0.0.0";
  return `${octets[0]}.${octets[1]}.${octets[2]}.0`;
}

export async function createAuditLog(
  supabase: SupabaseClient,
  userId: string | null,
  action: AuditAction,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  req?: Request
): Promise<void> {
  try {
    const ip = req
      ? (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null)
      : null;

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      resource_type: resourceType ?? null,
      resource_id: resourceId ?? null,
      details: details ?? null,
      ip_address: ip ? anonymizeIp(ip) : null,
    });
  } catch (err) {
    // Audit logging failure must never crash the app
    console.error("Audit log creation failed:", err);
  }
}
