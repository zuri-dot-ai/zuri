// docs/08_NOTIFICATIONS.md §4 — single entry point for in-app + email notifications.

import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email/resend";
import { sendPushNotification } from "./send-push";
import { NOTIFICATION_DISPLAY, type NotificationType } from "./types";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  email?: {
    to: string;
    subject: string;
    template: string;
    templateProps: Record<string, unknown>;
  };
}

export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  const supabase = createServiceClient();
  const display = NOTIFICATION_DISPLAY[params.type];

  try {
    await supabase.from("notifications").insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      action_url: params.actionUrl ?? null,
      action_label: params.actionLabel ?? null,
      icon: display.icon,
      icon_color: display.color,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    console.error("In-app notification creation failed:", err);
  }

  if (params.email) {
    await sendEmail({
      to: params.email.to,
      subject: params.email.subject,
      template: params.email.template,
      templateProps: params.email.templateProps,
      userId: params.userId,
    });
  }

  // Web push rides on the same single entry point as in-app + email —
  // an additional channel on the existing event, not a parallel system.
  // Best-effort: never let a push failure affect the notification result.
  try {
    await sendPushNotification({
      userId: params.userId,
      title: params.title,
      body: params.body,
      url: params.actionUrl,
    });
  } catch (err) {
    console.error("Push notification send failed:", err);
  }
}

/** Fire-and-forget — use inside API routes after the main response has been sent. */
export function createNotificationAsync(params: CreateNotificationParams): void {
  createNotification(params).catch((err) =>
    console.error("Async notification failed:", err)
  );
}
