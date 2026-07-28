import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyWebhookSignature, planTierFromFlwId } from "@/lib/flutterwave";
import { activateSubscription } from "@/lib/payments/activate-subscription";
import { handleFailedPayment } from "@/lib/payments/handle-failed-payment";
import { createNotificationAsync } from "@/lib/notifications/create-notification";
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

        // activateSubscription already sends templated payment_successful email
        await activateSubscription(
          service,
          profile.id,
          tier,
          cycle,
          txId,
          amount,
          data?.tx_ref ? String(data.tx_ref) : undefined
        );
        break;
      }

      case "subscription.cancelled": {
        const customerEmail: string = data?.customer?.email;
        if (!customerEmail) break;

        const { data: profile } = await service
          .from("profiles")
          .select("id, email, full_name")
          .eq("email", customerEmail)
          .maybeSingle();

        if (!profile?.id) break;

        const { data: sub } = await service
          .from("subscriptions")
          .select("current_period_end")
          .eq("user_id", profile.id)
          .maybeSingle();

        await service
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", profile.id);

        const periodEnd = sub?.current_period_end
          ? new Date(sub.current_period_end).toLocaleDateString("en-NG")
          : "the end of your billing period";
        const resubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`;

        createNotificationAsync({
          userId: profile.id,
          type: "subscription_cancelled",
          title: "Your subscription is cancelled",
          body: `Your subscription will remain active until ${periodEnd}.`,
          actionUrl: "/settings?tab=billing",
          actionLabel: "Resubscribe",
          email: {
            to: customerEmail,
            subject: "Your Zuri subscription has been cancelled",
            template: "subscription_cancelled",
            templateProps: {
              firstName: profile.full_name?.split(" ")[0] ?? "there",
              periodEnd,
              resubscribeUrl,
            },
          },
        });
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

        // handleFailedPayment sets grace_period + sends templated payment_failed
        if (profile?.id) {
          await handleFailedPayment(service, profile.id);
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
