import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyWebhookSignature, planTierFromFlwId } from "@/lib/flutterwave";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const signature = request.headers.get("verif-hash");

  // Reject any request that doesn't have the correct secret hash
  if (!verifyWebhookSignature(signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = await request.json();
  const { event: eventType, data } = event;

  const service = createServiceClient();

  try {
    switch (eventType) {
      // ── Subscription activated / renewed ──────────────────────────────
      case "subscription.activated":
      case "charge.completed": {
        const flwPlanId = data?.plan ?? data?.payment_plan;
        const customerEmail: string = data?.customer?.email;
        if (!customerEmail) break;

        const tier = planTierFromFlwId(String(flwPlanId));
        if (!tier) break;

        // Find user by email and upgrade their plan
        await service
          .from("users")
          .update({
            subscription_plan: tier,
            subscription_status: "active",
            flutterwave_customer_id: String(data?.customer?.id ?? ""),
          })
          .eq("email", customerEmail);

        // Welcome email on first activation
        if (eventType === "subscription.activated") {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "Zuri <onboarding@resend.dev>",
            to: customerEmail,
            subject: "Welcome to Zuri — you're all set ✨",
            text: [
              `Welcome to the ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan!`,
              "",
              "Your website is ready to publish, your content calendar is unlocked, and your 90-day plan is running.",
              "",
              "Log in and pick up where you left off: https://app.zuri.app/dashboard",
              "",
              "— The Zuri Team",
            ].join("\n"),
          });
        }
        break;
      }

      // ── Subscription cancelled ─────────────────────────────────────────
      case "subscription.cancelled": {
        const customerEmail: string = data?.customer?.email;
        if (!customerEmail) break;

        await service
          .from("users")
          .update({
            subscription_plan: "free",
            subscription_status: "cancelled",
          })
          .eq("email", customerEmail);

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Zuri <onboarding@resend.dev>",
          to: customerEmail,
          subject: "Your Zuri subscription has been cancelled",
          text: [
            "Your Zuri subscription has been cancelled.",
            "",
            "Your website will stay live until the end of your current billing period.",
            "If this was a mistake, you can resubscribe any time at https://app.zuri.app/settings.",
            "",
            "— The Zuri Team",
          ].join("\n"),
        });
        break;
      }

      // ── Payment failed ─────────────────────────────────────────────────
      case "subscription.failed": {
        const customerEmail: string = data?.customer?.email;
        if (!customerEmail) break;

        await service
          .from("users")
          .update({ subscription_status: "past_due" })
          .eq("email", customerEmail);

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Zuri <onboarding@resend.dev>",
          to: customerEmail,
          subject: "Action needed — Zuri payment failed",
          text: [
            "We couldn't process your Zuri subscription payment.",
            "",
            "Please update your payment details to keep your website live:",
            "https://app.zuri.app/settings",
            "",
            "— The Zuri Team",
          ].join("\n"),
        });
        break;
      }

      default:
        // Unknown event — log and acknowledge
        console.log("[webhook] Unhandled event:", eventType);
    }
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    // Still return 200 — Flutterwave will retry on non-2xx
  }

  // Always acknowledge receipt
  return NextResponse.json({ received: true });
}