// POST /api/payments/webhook
// Handles: charge.completed, subscription.cancelled, payment.failed

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { activateSubscription } from "@/lib/payments/activate-subscription";
import { handleFailedPayment } from "@/lib/payments/handle-failed-payment";
import { flutterwaveWebhookHash } from "@/lib/payments/env";

export async function POST(req: Request) {
  // Step 1: Verify webhook signature
  const signature = req.headers.get("verif-hash");
  if (signature !== flutterwaveWebhookHash()) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = await req.json();
  const eventId = payload.data?.id?.toString();

  if (!eventId) {
    return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
  }

  // Service role required for webhook_events + subscription writes (RLS)
  const supabase = createServiceClient();

  // Step 2: Idempotency — check if already processed
  const { data: existingEvent } = await supabase
    .from("webhook_events")
    .select("id, processed")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingEvent?.processed) {
    return NextResponse.json({ received: true }); // Already handled, return 200 to stop retries
  }

  // Step 3: Log the event
  await supabase.from("webhook_events").upsert(
    {
      event_id: eventId,
      event_type: payload.event,
      payload,
      processed: false,
    },
    { onConflict: "event_id" }
  );

  // Step 4: Handle event types
  try {
    switch (payload.event) {
      case "charge.completed": {
        if (payload.data.status === "successful") {
          const {
            meta,
            id: transactionId,
            amount,
            tx_ref: txRef,
          } = payload.data;
          const { user_id, plan_id, billing_cycle } = meta ?? {};
          if (user_id && plan_id) {
            await activateSubscription(
              supabase,
              user_id,
              plan_id,
              billing_cycle ?? "monthly",
              transactionId.toString(),
              amount,
              txRef
            );
          }
        }
        break;
      }
      case "subscription.cancelled": {
        const userId = payload.data?.meta?.user_id;
        if (userId) {
          await supabase
            .from("subscriptions")
            .update({
              cancel_at_period_end: true,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }
        break;
      }
      case "payment.failed": {
        const userId = payload.data?.meta?.user_id;
        if (userId) {
          await handleFailedPayment(supabase, userId);
        }
        break;
      }
    }

    // Mark as processed
    await supabase
      .from("webhook_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq("event_id", eventId);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    // Return 200 even on error to prevent Flutterwave from retrying endlessly
    // The unprocessed event remains in the log for manual inspection
    return NextResponse.json({
      received: true,
      warning: "Processing error logged",
    });
  }
}
