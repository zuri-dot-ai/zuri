import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "Zuri <onboarding@resend.dev>";

/**
 * Website/contact emails stay in log-only mode until EMAIL_DELIVERY_MODE=send
 * is explicitly approved. Billing emails below still use sendEmail() as before.
 */
function websiteEmailDeliveryMode(): "log" | "send" {
  return process.env.EMAIL_DELIVERY_MODE === "send" ? "send" : "log";
}

async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY missing — skipping:", args.subject);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: args.to,
    subject: args.subject,
    text: args.text,
  });
}

async function sendWebsiteEmail(args: {
  to: string;
  subject: string;
  text: string;
}) {
  if (websiteEmailDeliveryMode() === "log") {
    console.info("[email:log-only]", {
      to: args.to,
      subject: args.subject,
      text: args.text,
    });
    return;
  }
  await sendEmail(args);
}

export async function sendPlanActivationEmail(args: {
  to: string;
  name: string | null;
  planName: string;
  billingCycle: "monthly" | "annual";
  nextBillingDate: string;
}) {
  const greeting = args.name ? `Hi ${args.name},` : "Hi,";
  await sendEmail({
    to: args.to,
    subject: `Welcome to Zuri ${args.planName} — you're all set`,
    text: [
      greeting,
      "",
      `Your ${args.planName} plan is now active (${args.billingCycle} billing).`,
      `Next billing date: ${args.nextBillingDate}.`,
      "",
      "Log in and pick up where you left off:",
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      "",
      "— The Zuri Team",
    ].join("\n"),
  });
}

export async function sendPaymentFailedEmail(args: {
  to: string;
  name: string | null;
  gracePeriodEnd: string;
  updatePaymentUrl: string;
}) {
  const greeting = args.name ? `Hi ${args.name},` : "Hi,";
  await sendEmail({
    to: args.to,
    subject: "Action needed — Zuri payment failed",
    text: [
      greeting,
      "",
      "We couldn't process your Zuri subscription payment.",
      `You have until ${args.gracePeriodEnd} to update your payment method before your plan is downgraded.`,
      "",
      `Update payment details: ${args.updatePaymentUrl}`,
      "",
      "— The Zuri Team",
    ].join("\n"),
  });
}

export async function sendDowngradeEmail(args: {
  to: string;
  name: string | null;
}) {
  const greeting = args.name ? `Hi ${args.name},` : "Hi,";
  await sendEmail({
    to: args.to,
    subject: "Your Zuri plan has been updated to Free",
    text: [
      greeting,
      "",
      "Your grace period ended without a successful payment, so your account is now on the Free plan.",
      "You can resubscribe any time to restore full access:",
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`,
      "",
      "— The Zuri Team",
    ].join("\n"),
  });
}

export async function sendSitePublishedEmail(args: {
  to: string;
  name: string | null;
  siteUrl: string;
}) {
  const greeting = args.name ? `Hi ${args.name},` : "Hi,";
  await sendWebsiteEmail({
    to: args.to,
    subject: "Your site is live on Zuri",
    text: [
      greeting,
      "",
      "Your website is live.",
      `Visit it here: ${args.siteUrl}`,
      "",
      "You can edit copy, swap your theme, and update images any time from your dashboard:",
      `${process.env.NEXT_PUBLIC_APP_URL}/website`,
      "",
      "— The Zuri Team",
    ].join("\n"),
  });
}

export async function sendContactFormNotification(args: {
  ownerEmail: string;
  ownerName: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
  handle: string;
  serviceInterest?: string | null;
}) {
  const greeting = args.ownerName ? `Hi ${args.ownerName},` : "Hi,";
  const lines = [
    greeting,
    "",
    `Someone reached out through your ${args.handle}.buildzuri.com website.`,
    "",
    `From: ${args.senderName}`,
    `Email: ${args.senderEmail}`,
  ];
  if (args.serviceInterest) {
    lines.push(`Service interest: ${args.serviceInterest}`);
  }
  lines.push("", "Message:", args.message, "", "— Zuri");

  await sendWebsiteEmail({
    to: args.ownerEmail,
    subject: `New enquiry on ${args.handle}.buildzuri.com`,
    text: lines.join("\n"),
  });
}
