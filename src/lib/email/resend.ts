// docs/08_NOTIFICATIONS.md §5.1 — core email sender used by createNotification()
// and cron jobs. Never throws — email failures must not break the caller.

import { getResend } from "@/lib/email/resend-client";
import { createServiceClient } from "@/lib/supabase/service";
import { isValidEmail } from "@/lib/utils/sanitize";
import { renderEmailTemplate } from "@/lib/email/templates";
import { isEmailRateLimited, logEmailSend } from "@/lib/email/rate-limit";

const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL || "Zuri <onboarding@resend.dev>";
const REPLY_TO = process.env.RESEND_REPLY_TO || "support@buildzuri.com";

/**
 * Website/contact emails stay log-only until EMAIL_DELIVERY_MODE=send is
 * explicitly approved — matches the pre-existing safeguard in the old
 * src/lib/email/templates.ts helpers. All other templates send normally
 * whenever RESEND_API_KEY is configured.
 */
const LOG_ONLY_TEMPLATES = new Set(["website_published", "contact_form_received"]);

function emailDeliveryMode(): "log" | "send" {
  return process.env.EMAIL_DELIVERY_MODE === "send" ? "send" : "log";
}

export interface SendEmailParams {
  to: string;
  subject: string;
  template: string;
  templateProps: Record<string, unknown>;
  replyTo?: string;
  /** Used for rate limiting + email_send_log — omit for non-user emails (e.g. agency inbox). */
  userId?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  try {
    if (!isValidEmail(params.to)) {
      console.error(`Invalid email address: ${params.to}`);
      return;
    }

    const supabase = createServiceClient();

    if (params.userId) {
      const limited = await isEmailRateLimited(
        supabase,
        params.userId,
        params.template
      );
      if (limited) {
        console.info(`[email] rate limited — skipping ${params.template} for ${params.userId}`);
        return;
      }
    }

    if (
      LOG_ONLY_TEMPLATES.has(params.template) &&
      emailDeliveryMode() === "log"
    ) {
      console.info("[email:log-only]", {
        to: params.to,
        subject: params.subject,
        template: params.template,
      });
      return;
    }

    const resend = getResend();
    if (!resend) {
      console.warn("[email] RESEND_API_KEY missing — skipping:", params.subject);
      return;
    }

    const { html, text } = await renderEmailTemplate(
      params.template,
      params.templateProps
    );

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html,
      text,
      replyTo: params.replyTo ?? REPLY_TO,
      headers: {
        "X-Zuri-Template": params.template,
      },
    });

    if (params.userId) {
      await logEmailSend(supabase, params.userId, params.template);
    }
  } catch (err) {
    console.error(
      `Email send failed (template: ${params.template}, to: ${params.to}):`,
      err
    );
  }
}
