// docs/08_NOTIFICATIONS.md §4 — single entry point for in-app + email notifications.

import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email/resend";
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
}

/** Fire-and-forget — use inside API routes after the main response has been sent. */
export function createNotificationAsync(params: CreateNotificationParams): void {
  createNotification(params).catch((err) =>
    console.error("Async notification failed:", err)
  );
}
