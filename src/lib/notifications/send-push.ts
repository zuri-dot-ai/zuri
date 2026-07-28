// FCM push send logic. Called from createNotification() as an additional
// channel on the same existing notification events — not a parallel system.

import { getAdminMessaging } from "@/lib/firebase/admin";
import { createServiceClient } from "@/lib/supabase/service";

export interface SendPushParams {
  userId: string;
  title: string;
  body: string;
  url?: string;
}

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/**
 * Sends a browser push notification to every FCM token the user has
 * registered, provided push_enabled is true in their preferences. Best-effort
 * and fire-and-forget-safe: failures are logged, never thrown, and dead
 * tokens are pruned from push_subscriptions.
 */
export async function sendPushNotification(
  params: SendPushParams
): Promise<void> {
  const messaging = getAdminMessaging();
  if (!messaging) {
    // Missing Admin credentials should fail loudly at startup (validate-env.ts),
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
    .select("fcm_token")
    .eq("user_id", params.userId);

  if (!subscriptions || subscriptions.length === 0) return;

  const link = params.url ?? "/";
  const absoluteLink = link.startsWith("http")
    ? link
    : `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${link}`;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await messaging.send({
          token: sub.fcm_token,
          notification: {
            title: params.title,
            body: params.body,
          },
          data: {
            url: link,
            title: params.title,
            body: params.body,
          },
          webpush: {
            fcmOptions: {
              link: absoluteLink || link,
            },
            notification: {
              icon: "/Zuri_Logo.png",
              badge: "/Zuri_Favicon.png",
            },
          },
        });
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code && INVALID_TOKEN_CODES.has(code)) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("fcm_token", sub.fcm_token);
        } else {
          console.error("sendPushNotification failed:", err);
        }
      }
    })
  );
}
