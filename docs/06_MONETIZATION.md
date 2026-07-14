# ZURI — MONETIZATION SYSTEM
# Complete specification for pricing tiers, Flutterwave integration, feature gating, and subscription lifecycle

---

## 1. PLAN OVERVIEW

| | Free | Pro | Growth | Premium |
|---|---|---|---|---|
| Price (monthly) | ₦0 | ₦23,000 | ₦51,000 | ₦73,000 |
| Price (annual) | ₦0 | ₦230,000 | ₦510,000 | ₦730,000 |
| Annual saving | — | ₦46,000 | ₦102,000 | ₦146,000 |
| Free trial | — | 7 days | 7 days | 7 days |
| Plan ID (DB) | `free` | `pro` | `growth` | `premium` |

Annual billing = 10 months charged, 12 months of access (2 months free). All prices in NGN. Payment processor: Flutterwave.

---

## 2. COMPLETE FEATURE MATRIX

### 2.1 Website Builder

| Feature | Free | Pro | Growth | Premium |
|---|---|---|---|---|
| Brand profiles | 1 | 1 | 1 | 3 |
| Websites deployable | 0 (preview only) | 1 | 1 | 3 |
| Deployment URL | — | handle.zuri.com | handle.zuri.com or custom domain | All custom domains |
| Custom domain connection | No | No | Yes (1) | Yes (all sites) |
| Max pages per site | — | 5 | Unlimited | Unlimited |
| Supported branches | Preview only | 1, 3, 5, 8 | 1, 3, 5, 6, 8 | 1, 3, 5, 6, 8 |
| Website regenerations/month | 0 | 1 | 3 | Unlimited |
| Priority generation queue | No | No | No | Yes |
| Remove Zuri footer branding | No | No | Yes | Yes |

Unsupported branches (2, 4, 7 and any complex e-commerce/CMS site) redirect to the "Custom Site" contact flow on ALL plans including Premium.

### 2.2 Content Strategy

| Feature | Free | Pro | Growth | Premium |
|---|---|---|---|---|
| Content calendar | No | Yes | Yes | Yes |
| Posts per month | 0 | 12 | 30 | Unlimited |
| Social platforms | 0 | 2 | 4 | All (IG, FB, LinkedIn, X, TikTok) |
| Posting time suggestions | No | No | Yes | Yes (AI-optimized) |
| Hashtag research | No | No | Yes | Yes |
| AI performance report | No | No | No | Monthly (auto-generated) |

### 2.3 Content Generation

| Feature | Free | Pro | Growth | Premium |
|---|---|---|---|---|
| AI captions / copy | No | Unlimited | Unlimited | Unlimited |
| AI image generation | 0 | 15/month | 50/month | 200/month |
| Blog post generation | 0 | 2/month | 6/month | Unlimited |
| Email newsletter generation | 0 | 1/month | 4/month | Unlimited |
| Video generation | No | Coming soon (waitlisted) | Coming soon (priority waitlist) | First access on launch |

### 2.4 Analytics

| Feature | Free | Pro | Growth | Premium |
|---|---|---|---|---|
| Website analytics | No | Yes | Yes | Yes |
| Data retention | — | 30 days | 90 days | 1 year |
| Metrics | — | Views, sessions, form submissions | + bounce rate, device breakdown | + all metrics |
| Meta Business API (FB + IG) | No | No | Yes | Yes |
| Google Search Console | No | No | Yes | Yes |
| Email analytics | No | No | No | Yes |
| AI performance summary | No | No | No | Monthly |

### 2.5 Agency Marketplace

| Feature | Free | Pro | Growth | Premium |
|---|---|---|---|---|
| Browse agency listings | No | No | Yes | Yes |
| Contact agencies | No | No | Yes | Yes |
| Profile listed (agencies can find you) | No | No | Yes | Yes (featured + verified badge) |
| Priority matching | No | No | No | Yes |

### 2.6 Account & Support

| Feature | Free | Pro | Growth | Premium |
|---|---|---|---|---|
| User seats | 1 | 1 | 1 | 3 |
| Storage | 50MB | 500MB | 2GB | 10GB |
| Support channel | Community forum | Email (48h) | Priority email (24h) | Dedicated account manager |
| Account manager call | No | No | No | Monthly strategy call |
| API access | No | No | No | Yes |
| Early feature access | No | No | No | Yes |

---

## 3. USAGE LIMITS & CREDIT SYSTEM

### 3.1 Tracked Metrics (reset on billing anniversary each month)

```
images_generated          — resets monthly
blog_posts_generated      — resets monthly
newsletters_generated     — resets monthly
content_calendar_posts    — resets monthly
website_regenerations     — resets monthly
content_ideas_used        — resets monthly (Free tier only)
storage_used_mb           — rolling total, does not reset
```

### 3.2 Limit Enforcement Rules

- NEVER hard-block the user mid-session. When a limit is reached, surface a non-blocking upgrade prompt and disable the specific action button only.
- Show a usage progress bar on the dashboard (e.g. "12 of 15 images used this month").
- At 80% of any limit, show a soft warning ("You're approaching your image limit").
- At 100%, show an upgrade modal. The rest of the app remains fully functional.
- Storage limit enforcement: warn at 80%, block new uploads at 100% (not generation — only file uploads).

### 3.3 What "Unlimited" Means

Unlimited is subject to fair-use rate limiting to prevent API abuse. Server-side limits apply:
- Content generation: max 50 AI requests per hour per user
- Image generation: max 30 images per hour per user
- These limits are not surfaced to the user unless hit, in which case show: "You're generating content quickly. Please wait a few minutes."

---

## 4. FLUTTERWAVE INTEGRATION

### 4.1 Architecture

```
User selects plan
  → POST /api/payments/initiate
  → Server creates Flutterwave payment link (hosted payment page)
  → Redirect user to Flutterwave checkout
  → User pays
  → Flutterwave redirects to /payment/callback?status=successful&tx_ref=...&transaction_id=...
  → Server verifies transaction via Flutterwave API (server-to-server)
  → On success: update subscriptions table, send welcome email via Resend
  → Flutterwave also fires webhook → POST /api/payments/webhook
  → Webhook updates subscription for recurring renewals
```

### 4.2 Environment Variables Required

```env
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_...
FLUTTERWAVE_ENCRYPTION_KEY=...
FLUTTERWAVE_WEBHOOK_HASH=...   # Secret hash for webhook verification
NEXT_PUBLIC_APP_URL=https://app.zuri.com
```

### 4.3 Payment Initiation — /api/payments/initiate

```typescript
// POST /api/payments/initiate
// Body: { planId: 'pro' | 'growth' | 'premium', billingCycle: 'monthly' | 'annual' }

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLAN_CONFIG } from "@/lib/payments/plans";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId, billingCycle } = await req.json();

  // Validate plan
  if (!["pro", "growth", "premium"].includes(planId)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!["monthly", "annual"].includes(billingCycle)) {
    return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 });
  }

  const plan = PLAN_CONFIG[planId];
  const amount = billingCycle === "annual" ? plan.price_annual : plan.price_monthly;

  // Fetch user profile for prefill
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, handle")
    .eq("id", user.id)
    .single();

  // Generate unique transaction reference
  const txRef = `zuri_${user.id.slice(0, 8)}_${Date.now()}`;

  const payload = {
    tx_ref: txRef,
    amount,
    currency: "NGN",
    redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
    customer: {
      email: profile?.email ?? user.email,
      name: profile?.full_name ?? "Zuri User",
    },
    customizations: {
      title: "Zuri",
      description: `${plan.name} Plan — ${billingCycle === "annual" ? "Annual" : "Monthly"}`,
      logo: `${process.env.NEXT_PUBLIC_APP_URL}/Zuri_Logo.png`,
    },
    meta: {
      user_id: user.id,
      plan_id: planId,
      billing_cycle: billingCycle,
    },
  };

  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (data.status !== "success") {
    console.error("Flutterwave initiation error:", data);
    return NextResponse.json({ error: "Payment initiation failed" }, { status: 500 });
  }

  // Store pending transaction reference for verification
  await supabase.from("payment_history").insert({
    user_id: user.id,
    plan_id: planId,
    amount,
    currency: "NGN",
    status: "pending",
    flutterwave_reference: txRef,
    billing_cycle: billingCycle,
    payment_type: "subscription_new",
  });

  return NextResponse.json({ payment_link: data.data.link });
}
```

### 4.4 Payment Verification — /api/payments/verify

```typescript
// GET /api/payments/verify?transaction_id=xxx&tx_ref=yyy&status=successful
// Called after Flutterwave redirects user back

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const transactionId = searchParams.get("transaction_id");
  const status = searchParams.get("status");

  if (status !== "successful" || !transactionId) {
    // Payment was cancelled or failed — do NOT update subscription
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/pricing?payment=cancelled`);
  }

  // Idempotency check — do not process same transaction twice
  const { data: existing } = await supabase
    .from("payment_history")
    .select("id, status")
    .eq("flutterwave_transaction_id", transactionId)
    .single();

  if (existing?.status === "successful") {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=already_processed`);
  }

  // Verify with Flutterwave server-to-server
  const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` },
  });
  const verifyData = await verifyRes.json();

  if (verifyData.status !== "success" || verifyData.data.status !== "successful") {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/pricing?payment=failed`);
  }

  const { meta, amount, currency } = verifyData.data;
  const { user_id, plan_id, billing_cycle } = meta;

  // Security: ensure the user_id in meta matches authenticated user
  if (user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Activate subscription
  await activateSubscription(supabase, user_id, plan_id, billing_cycle, transactionId, amount);

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success&plan=${plan_id}`);
}
```

### 4.5 Webhook Handler — /api/payments/webhook

```typescript
// POST /api/payments/webhook
// Handles: charge.completed, subscription.cancelled, payment.failed

export async function POST(req: Request) {
  // Step 1: Verify webhook signature
  const signature = req.headers.get("verif-hash");
  if (signature !== process.env.FLUTTERWAVE_WEBHOOK_HASH) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = await req.json();
  const eventId = payload.data?.id?.toString();

  if (!eventId) {
    return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
  }

  const supabase = await createClient();

  // Step 2: Idempotency — check if already processed
  const { data: existingEvent } = await supabase
    .from("webhook_events")
    .select("id, processed")
    .eq("event_id", eventId)
    .single();

  if (existingEvent?.processed) {
    return NextResponse.json({ received: true }); // Already handled, return 200 to stop retries
  }

  // Step 3: Log the event
  await supabase.from("webhook_events").upsert({
    event_id: eventId,
    event_type: payload.event,
    payload,
    processed: false,
  }, { onConflict: "event_id" });

  // Step 4: Handle event types
  try {
    switch (payload.event) {
      case "charge.completed": {
        if (payload.data.status === "successful") {
          const { meta, id: transactionId, amount } = payload.data;
          const { user_id, plan_id, billing_cycle } = meta ?? {};
          if (user_id && plan_id) {
            await activateSubscription(supabase, user_id, plan_id, billing_cycle ?? "monthly", transactionId.toString(), amount);
          }
        }
        break;
      }
      case "subscription.cancelled": {
        const userId = payload.data?.meta?.user_id;
        if (userId) {
          await supabase
            .from("subscriptions")
            .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
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
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("event_id", eventId);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    // Return 200 even on error to prevent Flutterwave from retrying endlessly
    // The unprocessed event remains in the log for manual inspection
    return NextResponse.json({ received: true, warning: "Processing error logged" });
  }
}
```

### 4.6 Shared: activateSubscription Helper

```typescript
// src/lib/payments/activate-subscription.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_CONFIG } from "./plans";
import { sendPlanActivationEmail } from "@/lib/email/templates";

export async function activateSubscription(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
  billingCycle: "monthly" | "annual",
  transactionId: string,
  amount: number
) {
  const plan = PLAN_CONFIG[planId];
  const now = new Date();
  const periodEnd = new Date(now);

  if (billingCycle === "annual") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // Upsert subscription
  await supabase.from("subscriptions").upsert({
    user_id: userId,
    plan_id: planId,
    status: "active",
    billing_cycle: billingCycle,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: false,
    updated_at: now.toISOString(),
  }, { onConflict: "user_id" });

  // Update payment history record
  await supabase.from("payment_history")
    .update({ status: "successful", flutterwave_transaction_id: transactionId })
    .eq("flutterwave_reference", transactionId)
    .is("flutterwave_transaction_id", null);

  // If no matching pending record found, insert new record
  await supabase.from("payment_history").upsert({
    user_id: userId,
    plan_id: planId,
    amount,
    currency: "NGN",
    status: "successful",
    flutterwave_transaction_id: transactionId,
    billing_cycle: billingCycle,
    payment_type: "subscription_new",
  }, { onConflict: "flutterwave_transaction_id", ignoreDuplicates: true });

  // Initialise usage tracking for this billing period
  const periodStart = now.toISOString().split("T")[0];
  await supabase.from("usage_tracking").upsert({
    user_id: userId,
    period_start: periodStart,
  }, { onConflict: "user_id,period_start", ignoreDuplicates: true });

  // Send activation email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (profile?.email) {
    await sendPlanActivationEmail({
      to: profile.email,
      name: profile.full_name,
      planName: plan.name,
      billingCycle,
      nextBillingDate: periodEnd.toLocaleDateString("en-NG"),
    });
  }
}
```

### 4.7 Failed Payment Handler

```typescript
// src/lib/payments/handle-failed-payment.ts

export async function handleFailedPayment(supabase: SupabaseClient, userId: string) {
  // Set status to grace_period, giving user 3 days to fix payment method
  const graceEnd = new Date();
  graceEnd.setDate(graceEnd.getDate() + 3);

  await supabase.from("subscriptions").update({
    status: "grace_period",
    grace_period_end: graceEnd.toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  // Send failed payment email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (profile?.email) {
    await sendPaymentFailedEmail({
      to: profile.email,
      name: profile.full_name,
      gracePeriodEnd: graceEnd.toLocaleDateString("en-NG"),
      updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });
  }
}

// Cron job (run daily via Vercel Cron or Supabase pg_cron):
// Checks grace_period subscriptions whose grace_period_end < now
// and downgrades them to 'free'
export async function processExpiredGracePeriods(supabase: SupabaseClient) {
  const { data: expired } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("status", "grace_period")
    .lt("grace_period_end", new Date().toISOString());

  if (!expired?.length) return;

  for (const sub of expired) {
    await supabase.from("subscriptions").update({
      plan_id: "free",
      status: "active",
      cancel_at_period_end: false,
      grace_period_end: null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", sub.user_id);

    // Send downgrade notification email
    // ... sendDowngradeEmail(...)
  }
}
```

---

## 5. PLAN CONFIGURATION FILE

```typescript
// src/lib/payments/plans.ts
// Single source of truth for all plan limits. Used by feature gating, UI, and API routes.

export type PlanId = "free" | "pro" | "growth" | "premium";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price_monthly: number;     // NGN, full units (not kobo)
  price_annual: number;      // NGN, full annual amount
  limits: PlanLimits;
}

export interface PlanLimits {
  websites: number;
  custom_domain: boolean;
  max_pages_per_site: number | null;         // null = unlimited
  website_regenerations: number | null;      // null = unlimited
  priority_queue: boolean;
  remove_branding: boolean;
  social_platforms: number | null;           // null = all
  calendar_posts_per_month: number | null;
  images_per_month: number;
  blog_posts_per_month: number | null;
  newsletters_per_month: number | null;
  analytics_enabled: boolean;
  analytics_retention_days: number | null;
  meta_analytics: boolean;
  search_console: boolean;
  email_analytics: boolean;
  agency_listed: boolean;
  agency_featured: boolean;
  can_contact_agencies: boolean;
  storage_mb: number;
  seats: number;
  api_access: boolean;
  video_generation: boolean;
  content_ideas_per_month: number | null;    // null = no limit (paid plans use full generation)
  supported_branches: number[];
}

export const PLAN_CONFIG: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    price_monthly: 0,
    price_annual: 0,
    limits: {
      websites: 0,
      custom_domain: false,
      max_pages_per_site: 0,
      website_regenerations: 0,
      priority_queue: false,
      remove_branding: false,
      social_platforms: 0,
      calendar_posts_per_month: 0,
      images_per_month: 0,
      blog_posts_per_month: 0,
      newsletters_per_month: 0,
      analytics_enabled: false,
      analytics_retention_days: null,
      meta_analytics: false,
      search_console: false,
      email_analytics: false,
      agency_listed: false,
      agency_featured: false,
      can_contact_agencies: false,
      storage_mb: 50,
      seats: 1,
      api_access: false,
      video_generation: false,
      content_ideas_per_month: 5,
      supported_branches: [],
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    price_monthly: 23000,
    price_annual: 230000,
    limits: {
      websites: 1,
      custom_domain: false,
      max_pages_per_site: 5,
      website_regenerations: 1,
      priority_queue: false,
      remove_branding: false,
      social_platforms: 2,
      calendar_posts_per_month: 12,
      images_per_month: 15,
      blog_posts_per_month: 2,
      newsletters_per_month: 1,
      analytics_enabled: true,
      analytics_retention_days: 30,
      meta_analytics: false,
      search_console: false,
      email_analytics: false,
      agency_listed: false,
      agency_featured: false,
      can_contact_agencies: false,
      storage_mb: 500,
      seats: 1,
      api_access: false,
      video_generation: false,
      content_ideas_per_month: null,
      supported_branches: [1, 3, 5, 8],
    },
  },
  growth: {
    id: "growth",
    name: "Growth",
    price_monthly: 51000,
    price_annual: 510000,
    limits: {
      websites: 1,
      custom_domain: true,
      max_pages_per_site: null,
      website_regenerations: 3,
      priority_queue: false,
      remove_branding: true,
      social_platforms: 4,
      calendar_posts_per_month: 30,
      images_per_month: 50,
      blog_posts_per_month: 6,
      newsletters_per_month: 4,
      analytics_enabled: true,
      analytics_retention_days: 90,
      meta_analytics: true,
      search_console: true,
      email_analytics: false,
      agency_listed: true,
      agency_featured: false,
      can_contact_agencies: true,
      storage_mb: 2048,
      seats: 1,
      api_access: false,
      video_generation: false,
      content_ideas_per_month: null,
      supported_branches: [1, 3, 5, 6, 8],
    },
  },
  premium: {
    id: "premium",
    name: "Premium",
    price_monthly: 73000,
    price_annual: 730000,
    limits: {
      websites: 3,
      custom_domain: true,
      max_pages_per_site: null,
      website_regenerations: null,
      priority_queue: true,
      remove_branding: true,
      social_platforms: null,
      calendar_posts_per_month: null,
      images_per_month: 200,
      blog_posts_per_month: null,
      newsletters_per_month: null,
      analytics_enabled: true,
      analytics_retention_days: 365,
      meta_analytics: true,
      search_console: true,
      email_analytics: true,
      agency_listed: true,
      agency_featured: true,
      can_contact_agencies: true,
      storage_mb: 10240,
      seats: 3,
      api_access: true,
      video_generation: true,
      content_ideas_per_month: null,
      supported_branches: [1, 3, 5, 6, 8],
    },
  },
};
```

---

## 6. FEATURE GATING SYSTEM

### 6.1 Server-Side Gate (use in all API routes before performing any action)

```typescript
// src/lib/payments/feature-gate.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_CONFIG, PlanLimits } from "./plans";

export interface GateResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: string;  // plan ID the user needs to upgrade to
}

export async function checkFeatureAccess(
  supabase: SupabaseClient,
  userId: string,
  feature: keyof PlanLimits
): Promise<GateResult> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("user_id", userId)
    .single();

  const planId = (sub?.status === "active" || sub?.status === "grace_period")
    ? (sub.plan_id ?? "free")
    : "free";

  const limits = PLAN_CONFIG[planId]?.limits;
  if (!limits) return { allowed: false, reason: "Plan not found" };

  const value = limits[feature];

  // Boolean feature
  if (typeof value === "boolean") {
    if (value) return { allowed: true };
    // Find the minimum plan that unlocks this feature
    const upgradeTarget = findMinimumPlanFor(feature, true);
    return { allowed: false, reason: `Not available on ${PLAN_CONFIG[planId].name} plan`, upgradeRequired: upgradeTarget };
  }

  // Numeric limit — 0 means blocked
  if (typeof value === "number" && value === 0) {
    const upgradeTarget = findMinimumPlanFor(feature, 1);
    return { allowed: false, reason: `Not available on ${PLAN_CONFIG[planId].name} plan`, upgradeRequired: upgradeTarget };
  }

  return { allowed: true };
}

export async function checkUsageLimit(
  supabase: SupabaseClient,
  userId: string,
  metric: keyof UsageTracking
): Promise<{ allowed: boolean; used: number; limit: number | null; remaining: number | null }> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("user_id", userId)
    .single();

  const planId = sub?.status === "active" ? (sub.plan_id ?? "free") : "free";
  const limits = PLAN_CONFIG[planId]?.limits;
  const limit = (limits as any)[metric] as number | null;

  if (limit === null) return { allowed: true, used: 0, limit: null, remaining: null }; // Unlimited

  const periodStart = new Date();
  periodStart.setDate(1); // First of current month — adjust to billing anniversary if needed
  const periodStartStr = periodStart.toISOString().split("T")[0];

  const { data: usage } = await supabase
    .from("usage_tracking")
    .select(metric)
    .eq("user_id", userId)
    .eq("period_start", periodStartStr)
    .single();

  const used = (usage as any)?.[metric] ?? 0;
  const remaining = Math.max(0, limit - used);

  return { allowed: used < limit, used, limit, remaining };
}

function findMinimumPlanFor(feature: keyof PlanLimits, requiredValue: any): string {
  for (const planId of ["pro", "growth", "premium"]) {
    const value = PLAN_CONFIG[planId as any].limits[feature];
    if (typeof requiredValue === "boolean" && value === true) return planId;
    if (typeof requiredValue === "number" && typeof value === "number" && value >= requiredValue) return planId;
    if (value !== null && value !== false && value !== 0) return planId;
  }
  return "premium";
}
```

### 6.2 Client-Side Hook

```typescript
// src/hooks/use-subscription.ts
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLAN_CONFIG, PlanId, PlanLimits } from "@/lib/payments/plans";

interface SubscriptionState {
  planId: PlanId;
  planName: string;
  status: string;
  limits: PlanLimits;
  periodEnd: string | null;
  isLoading: boolean;
}

export function useSubscription(): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({
    planId: "free",
    planName: "Free",
    status: "active",
    limits: PLAN_CONFIG.free.limits,
    periodEnd: null,
    isLoading: true,
  });

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("subscriptions")
      .select("plan_id, status, current_period_end")
      .single()
      .then(({ data }) => {
        const planId = (data?.status === "active" || data?.status === "grace_period")
          ? ((data?.plan_id ?? "free") as PlanId)
          : "free";
        setState({
          planId,
          planName: PLAN_CONFIG[planId].name,
          status: data?.status ?? "active",
          limits: PLAN_CONFIG[planId].limits,
          periodEnd: data?.current_period_end ?? null,
          isLoading: false,
        });
      });
  }, []);

  return state;
}
```

---

## 7. DATABASE SCHEMA

```sql
-- ============================================================
-- PLANS (seed data — do not modify at runtime)
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id text PRIMARY KEY,  -- 'free', 'pro', 'growth', 'premium'
  name text NOT NULL,
  price_monthly integer NOT NULL DEFAULT 0,  -- NGN full units
  price_annual integer NOT NULL DEFAULT 0,
  limits jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SUBSCRIPTIONS (one row per user, upserted on plan change)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id text REFERENCES plans(id) NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  -- status values: active | grace_period | cancelled | expired
  billing_cycle text NOT NULL DEFAULT 'monthly',  -- monthly | annual
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT now() + interval '1 month',
  grace_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  flutterwave_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Every new auth user gets a free subscription automatically
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_subscription();

-- ============================================================
-- USAGE TRACKING (resets per billing period)
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_start date NOT NULL,  -- YYYY-MM-DD, first day of billing month
  images_generated integer NOT NULL DEFAULT 0,
  blog_posts_generated integer NOT NULL DEFAULT 0,
  newsletters_generated integer NOT NULL DEFAULT 0,
  content_calendar_posts integer NOT NULL DEFAULT 0,
  website_regenerations integer NOT NULL DEFAULT 0,
  content_ideas_used integer NOT NULL DEFAULT 0,
  storage_used_mb numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, period_start)
);

-- Atomic usage increment (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id uuid,
  p_metric text,
  p_amount integer DEFAULT 1
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_period date := date_trunc('month', now())::date;
BEGIN
  INSERT INTO usage_tracking (user_id, period_start)
  VALUES (p_user_id, v_period)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  EXECUTE format(
    'UPDATE usage_tracking SET %I = %I + $1, updated_at = now()
     WHERE user_id = $2 AND period_start = $3',
    p_metric, p_metric
  ) USING p_amount, p_user_id, v_period;
END;
$$;

-- ============================================================
-- PAYMENT HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id text REFERENCES plans(id),
  amount integer NOT NULL,  -- NGN full units
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending',  -- pending | successful | failed | refunded
  billing_cycle text,
  payment_type text,  -- subscription_new | subscription_renewal | upgrade | downgrade | refund
  flutterwave_transaction_id text UNIQUE,
  flutterwave_reference text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- WEBHOOK EVENTS LOG (idempotency)
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_usage_tracking_user_period ON usage_tracking(user_id, period_start);
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX idx_payment_history_transaction ON payment_history(flutterwave_transaction_id);
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription and usage
CREATE POLICY "Users read own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own usage" ON usage_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own payments" ON payment_history FOR SELECT USING (auth.uid() = user_id);

-- Only service role can write to these tables (all writes go through server-side API routes)
CREATE POLICY "Service role writes subscriptions" ON subscriptions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role writes usage" ON usage_tracking FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role writes payments" ON payment_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role writes webhooks" ON webhook_events FOR ALL USING (auth.role() = 'service_role');

-- Plans table is public read
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are public" ON plans FOR SELECT USING (true);
```

---

## 8. API ROUTES SUMMARY

| Method | Route | Purpose | Auth Required |
|---|---|---|---|
| POST | /api/payments/initiate | Generate Flutterwave payment link | Yes |
| GET | /api/payments/verify | Verify payment after redirect | Yes |
| POST | /api/payments/webhook | Handle Flutterwave webhook events | No (signature verified) |
| POST | /api/subscriptions/cancel | Schedule cancellation at period end | Yes |
| POST | /api/subscriptions/upgrade | Upgrade to higher plan | Yes |
| GET | /api/subscriptions/current | Get current plan, status, usage | Yes |
| GET | /api/subscriptions/usage | Get detailed usage for current period | Yes |

---

## 9. UPGRADE / DOWNGRADE LOGIC

### Upgrade (e.g. Pro → Growth)
- Immediate effect: user gets Growth limits the moment payment succeeds
- Charge: full price of new plan (no proration in v1 — communicate this clearly in UI)
- New billing period starts from upgrade date
- Old plan's remaining days are forfeited (communicate in upgrade confirmation dialog)

### Downgrade (e.g. Growth → Pro)
- Never immediate. Always scheduled for `current_period_end`
- User retains Growth features until the end of their paid period
- On `current_period_end`, subscription.plan_id updates to the lower plan
- If user has more websites than the lower plan allows (e.g. 2 sites on Growth downgrading to Pro which allows 1): send an email 7 days before, asking them to choose which site to keep. If no action taken, the most recently created site remains live; others are unpublished but not deleted (30-day recovery window)

### Cancellation
- Same as downgrade: cancel_at_period_end = true
- User retains access until period end
- 3 days before period end: send a "your plan is ending" email
- On period end: drop to Free. Website remains deployed but enter grace state: site stays live for 30 days, then gets a "suspended" page. User can resubscribe to restore instantly.

---

## 10. PAYMENT ERROR HANDLING

| Scenario | System Action | User-Facing Message |
|---|---|---|
| Payment initiation fails (Flutterwave API down) | Log error, return 500 | "Payment service is temporarily unavailable. Please try again in a few minutes." |
| User cancels at Flutterwave checkout | Redirect to /pricing?payment=cancelled | "Your payment was not completed. Your plan hasn't changed." |
| Payment verification fails (mismatch) | Log fraud attempt, alert admin | "We couldn't verify your payment. Contact support with reference: [tx_ref]." |
| Duplicate transaction processed | Return 200, skip processing | Silent (user already has access) |
| Webhook signature invalid | Return 401, log attempt | None (server only) |
| Grace period expires without payment | Downgrade to Free | Email sent 24h before: "Your access ends tomorrow." |
| User on wrong plan tries to access gated feature | Return 403 from API, surface upgrade modal in UI | "This feature requires the [Plan] plan. Upgrade to unlock it." |
| Storage limit reached | Block upload, allow generation | "You've reached your storage limit. Upgrade your plan or delete unused files." |
| Usage limit reached | Block generation, show upgrade prompt | "You've used all [X] this month. Upgrade for more, or wait until [date]." |
| Network timeout during checkout | No state change (payment never initiated) | "Something went wrong. Please try again." |

---

## 11. FREE TRIAL

- 7-day free trial on Pro, Growth, and Premium
- Card required at signup (Flutterwave card tokenization — user is not charged until day 7)
- Day 5: email reminder "Your trial ends in 2 days"
- Day 7: charge fires. If it fails, enter grace period immediately (3 days)
- If user cancels before day 7: no charge, account returns to Free
- Free tier users: no trial — they ARE on the free plan
- Trial state stored in subscriptions.status = 'trialing' with current_period_end = trial_end_date
- Trial user gets FULL plan features during trial period

---

## 12. REVENUE TRACKING (GeminiXprize requirement)

Revenue must be demonstrable to judges. The payment_history table provides this automatically.

```sql
-- Monthly revenue summary query (for admin dashboard)
SELECT
  date_trunc('month', created_at) AS month,
  plan_id,
  COUNT(*) AS transactions,
  SUM(amount) AS total_ngn,
  SUM(amount) / 100.0 AS total_ngn_display
FROM payment_history
WHERE status = 'successful'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
```

Build an admin-only route at /api/admin/revenue that returns this data. Protect it with a separate admin role check (not just auth.uid(), but a profiles.is_admin boolean).

---

## 13. PRICING PAGE UI REQUIREMENTS

- Monthly / Annual toggle at top. Default to Monthly. Annual shows "Save 2 months free" badge.
- 4 plan cards in a single row on desktop, stacked on mobile.
- Growth card: "Most Popular" badge.
- Each card: plan name → price → billing note → CTA button → feature list.
- CTA states:
  - Free user viewing Free card: "Current plan" (disabled)
  - Free user viewing any paid card: "Start free trial"
  - Paid user viewing their current plan: "Current plan" (disabled)
  - Paid user viewing higher plan: "Upgrade"
  - Paid user viewing lower plan: "Downgrade" (greyed, with tooltip: "Takes effect at end of billing period")
- Feature comparison table below cards (collapsible on mobile).
- FAQ section below comparison table (minimum 5 questions covering: trial, cancellation, downgrade, VAT, custom sites).
- Do NOT use a pop-up or modal for the pricing page. It must be a full standalone page at /pricing.

---

## 14. VAT / TAX NOTE

Flutterwave does not automatically apply VAT for Nigerian merchants. If FIRS compliance is required, add a 7.5% VAT line to the displayed price. Consult a Nigerian tax advisor before launch. For the competition submission, note this as "tax compliance: in progress."

---

## 15. IMPLEMENTATION ORDER

1. Create `src/lib/payments/plans.ts` — plan config (no dependencies)
2. Run database migration (schema section above)
3. Create `src/lib/payments/feature-gate.ts`
4. Create `src/lib/payments/activate-subscription.ts`
5. Create `src/lib/payments/handle-failed-payment.ts`
6. Create `/api/payments/initiate/route.ts`
7. Create `/api/payments/verify/route.ts` (callback page at `/payment/callback/page.tsx`)
8. Create `/api/payments/webhook/route.ts`
9. Create `/api/subscriptions/current/route.ts` and `/api/subscriptions/usage/route.ts`
10. Create `src/hooks/use-subscription.ts`
11. Build pricing page at `/pricing/page.tsx`
12. Add upgrade prompts to all gated features (use a shared `<UpgradePrompt planRequired="growth" />` component)
13. Set up Vercel Cron at `vercel.json` for grace period processing (daily at 00:00 WAT)
14. Test with Flutterwave test mode: complete full payment → verify → downgrade → cancel flow

## 16. VERCEL CRON SETUP

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/process-subscriptions",
      "schedule": "0 23 * * *"
    }
  ]
}
```

```typescript
// src/app/api/cron/process-subscriptions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processExpiredGracePeriods } from "@/lib/payments/handle-failed-payment";

export async function GET(req: Request) {
  // Vercel Cron authentication
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = await createClient();
  await processExpiredGracePeriods(supabase);
  return NextResponse.json({ ok: true });
}
```

Add `CRON_SECRET` to environment variables.
