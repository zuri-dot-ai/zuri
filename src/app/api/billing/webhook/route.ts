import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyWebhookSignature, planTierFromFlwId } from "@/lib/flutterwave";
import { activateSubscription } from "@/lib/payments/activate-subscription";
import { getResend } from "@/lib/email/resend-client";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";

export async function POST(request: Request) {
  const signature = request.headers.get("verif-hash");

  if (!verifyWebhookSignature(signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = await request.json();
  const { event: eventType, data } = event;
  const service = createServiceClient();

  try {
    switch (eventType) {
      case "subscription.activated":
      case "charge.completed": {
        const flwPlanId = data?.plan ?? data?.payment_plan;
        const customerEmail: string = data?.customer?.email;
        if (!customerEmail) break;

        const tier = planTierFromFlwId(String(flwPlanId));
        if (!tier) break;

        const { data: profile } = await service
          .from("profiles")
          .select("id, email, full_name")
          .eq("email", customerEmail)
          .maybeSingle();

        if (!profile?.id) break;

        const amount = Number(data?.amount ?? 0);
        const txId = String(data?.id ?? data?.tx_ref ?? Date.now());
        const cycle =
          String(data?.plan ?? "").includes("annual") ||
          String(flwPlanId) === process.env.FLW_PLAN_PRO_ANNUAL ||
          String(flwPlanId) === process.env.FLW_PLAN_GROWTH_ANNUAL ||
          String(flwPlanId) === process.env.FLW_PLAN_PREMIUM_ANNUAL
            ? "annual"
            : "monthly";

        await activateSubscription(
          service,
          profile.id,
          tier,
          cycle,
          txId,
          amount,
          data?.tx_ref ? String(data.tx_ref) : undefined
        );

        if (eventType === "subscription.activated") {
          const resend = getResend();
          if (resend) {
            await resend.emails.send({
              from:
                process.env.RESEND_FROM_EMAIL ||
                "Zuri <onboarding@resend.dev>",
              to: customerEmail,
              subject: "Welcome to Zuri — you're all set",
              text: [
                `Welcome to the ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan!`,
                "",
                "Your website is ready to publish, your content calendar is unlocked, and your 90-day plan is running.",
                "",
                "Log in and pick up where you left off: https://app.buildzuri.com/dashboard",
                "",
                "— The Zuri Team",
              ].join("\n"),
            });
          }
        }
        break;
      }

      case "subscription.cancelled": {
        const customerEmail: string = data?.customer?.email;
        if (!customerEmail) break;

        const { data: profile } = await service
          .from("profiles")
          .select("id")
          .eq("email", customerEmail)
          .maybeSingle();

        if (profile?.id) {
          await service
            .from("subscriptions")
            .update({
              status: "cancelled",
              cancel_at_period_end: true,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", profile.id);
        }

        {
          const resend = getResend();
          if (resend) {
            await resend.emails.send({
              from:
                process.env.RESEND_FROM_EMAIL || "Zuri <onboarding@resend.dev>",
              to: customerEmail,
              subject: "Your Zuri subscription has been cancelled",
              text: [
                "Your Zuri subscription has been cancelled.",
                "",
                "Your website will stay live until the end of your current billing period.",
                "If this was a mistake, you can resubscribe any time at https://app.buildzuri.com/settings.",
                "",
                "— The Zuri Team",
              ].join("\n"),
            });
          }
        }
        break;
      }

      case "subscription.failed": {
        const customerEmail: string = data?.customer?.email;
        if (!customerEmail) break;

        const { data: profile } = await service
          .from("profiles")
          .select("id")
          .eq("email", customerEmail)
          .maybeSingle();

        if (profile?.id) {
          await service
            .from("subscriptions")
            .update({
              status: "grace_period",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", profile.id);
        }

        {
          const resend = getResend();
          if (resend) {
            await resend.emails.send({
              from:
                process.env.RESEND_FROM_EMAIL || "Zuri <onboarding@resend.dev>",
              to: customerEmail,
              subject: "Action needed — Zuri payment failed",
              text: [
                "We couldn't process your Zuri subscription payment.",
                "",
                "Please update your payment details to keep your website live:",
                "https://app.buildzuri.com/settings",
                "",
                "— The Zuri Team",
              ].join("\n"),
            });
          }
        }
        break;
      }

      default:
        console.log("[webhook] Unhandled event:", eventType);
    }
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, { supportRef: ref, route: "/api/billing/webhook" });
  }

  return NextResponse.json({ received: true });
}
