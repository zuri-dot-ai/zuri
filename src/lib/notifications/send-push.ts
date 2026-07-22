// Web push send logic (docs/08_NOTIFICATIONS.md addendum — Session 4C v2).
// Called from createNotification() as an additional channel on the same
// existing notification events — not a parallel system.

import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

let configured = false;

function ensureConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    return false;
  }

  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

export interface SendPushParams {
  userId: string;
  title: string;
  body: string;
  url?: string;
}

/**
 * Sends a browser push notification to every subscription the user has
 * registered, provided push_enabled is true in their preferences. Best-effort
 * and fire-and-forget-safe: failures are logged, never thrown, and dead
 * subscriptions (410 Gone / 404) are pruned from push_subscriptions.
 */
export async function sendPushNotification(
  params: SendPushParams
): Promise<void> {
  if (!ensureConfigured()) {
    // Missing VAPID keys should fail loudly at startup (validate-env.ts),
    // not on every send — just skip here.
    return;
  }

  const supabase = createServiceClient();

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("push_enabled")
    .eq("user_id", params.userId)
    .maybeSingle();

  if (prefs && prefs.push_enabled === false) return;

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", params.userId);

  if (!subscriptions || subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title: params.title,
    body: params.body,
    url: params.url ?? "/",
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          payload
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        } else {
          console.error("sendPushNotification failed:", err);
        }
      }
    })
  );
}
