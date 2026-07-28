// Welcome email — once per new user (rate-limited via email_send_log).

import type { User } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";

const NEW_USER_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRecentlyCreated(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() < NEW_USER_WINDOW_MS;
}

function firstNameFromUser(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const full =
    (typeof meta?.full_name === "string" && meta.full_name) ||
    (typeof meta?.name === "string" && meta.name) ||
    "";
  const first = full.trim().split(/\s+/)[0];
  return first || "there";
}

/** Fire-and-forget welcome for newly created accounts. Safe to call on every auth callback. */
export function sendWelcomeEmailIfNewUser(user: User): void {
  if (!user.email || !isRecentlyCreated(user.created_at)) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.buildzuri.com";

  void sendEmail({
    to: user.email,
    subject: "Welcome to Zuri — let's build your presence",
    template: "welcome",
    templateProps: {
      firstName: firstNameFromUser(user),
      onboardingUrl: `${appUrl}/start`,
    },
    userId: user.id,
  }).catch((err) => console.error("[email] welcome failed:", err));
}
