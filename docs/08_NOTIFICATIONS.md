# ZURI — NOTIFICATIONS SYSTEM
# Complete specification for in-app notifications, email delivery (Resend),
# notification preferences, weekly digest, and all notification triggers

---

## 1. SYSTEM OVERVIEW

Zuri uses a two-channel notification system: **in-app** (real-time, bell icon in TopBar using Supabase Realtime) and **email** (Resend). Every significant event in the platform has a mapped notification. Billing and security emails can never be opted out of. Marketing and digest emails are user-controlled.

### Delivery Rules

| Channel | When to use |
|---|---|
| In-app only | Real-time generation status, content actions, minor UI events |
| Email only | Payment events, security, token expiry, weekly digest |
| Both | Contact form received, website published, calendar ready, generation failed, usage limit reached, monthly report ready, plan downgraded |

---

## 2. COMPLETE NOTIFICATION TRIGGER MAP

Every trigger below creates a row in the `notifications` table AND fires the specified email template where indicated.

### 2.1 Account & Auth

| Event | In-App | Email | Template | Cannot Opt Out |
|---|---|---|---|---|
| Signup complete | No | Yes | `welcome` | Yes |
| Password reset requested | No | Yes | `password_reset` | Yes |
| Account deleted | No | Yes | `account_deleted` | Yes |

### 2.2 Onboarding

| Event | In-App | Email | Template | Cannot Opt Out |
|---|---|---|---|---|
| Website generation complete | Yes | Yes | `website_generated` | No |
| Website generation failed | Yes | Yes | `website_generation_failed` | No |

### 2.3 Website

| Event | In-App | Email | Template | Cannot Opt Out |
|---|---|---|---|---|
| Website published (first time) | Yes | Yes | `website_published` | No |
| Website unpublished (user action) | Yes | No | — | — |
| Website suspended (plan expired) | Yes | Yes | `website_suspended` | Yes |
| Contact form submission received | Yes | Yes | `contact_form_received` | Yes |
| Custom domain connected | Yes | Yes | `domain_connected` | No |
| Custom domain DNS not propagated after 48h | Yes | Yes | `domain_dns_delayed` | No |
| Website generation retry succeeded | Yes | No | — | — |

### 2.4 Content

| Event | In-App | Email | Template | Cannot Opt Out |
|---|---|---|---|---|
| Monthly calendar generated (seeded or manual) | Yes | Yes | `calendar_ready` | No |
| Content item generated | Yes | No | — | — |
| Content generation failed | Yes | No | — | — |
| Usage limit warning (80% of any metric reached) | Yes | Yes | `usage_warning` | No |
| Usage limit reached (100%) | Yes | Yes | `usage_limit_reached` | No |

### 2.5 Analytics

| Event | In-App | Email | Template | Cannot Opt Out |
|---|---|---|---|---|
| Meta access token expired | Yes | Yes | `meta_token_expired` | No |
| Search Console token expired | Yes | Yes | `search_console_expired` | No |
| Monthly performance report ready | Yes | Yes | `monthly_report_ready` | No |

### 2.6 Billing & Subscription

| Event | In-App | Email | Template | Cannot Opt Out |
|---|---|---|---|---|
| Payment successful (new or renewal) | Yes | Yes | `payment_successful` | Yes |
| Payment failed | Yes | Yes | `payment_failed` | Yes |
| Grace period started | Yes | Yes | `grace_period_started` | Yes |
| Grace period ending (24h before expiry) | Yes | Yes | `grace_period_ending` | Yes |
| Trial ending (Day 5 of 7 — 2 days left) | Yes | Yes | `trial_ending` | Yes |
| Trial expired (no payment) | Yes | Yes | `trial_expired` | Yes |
| Plan upgraded | Yes | Yes | `plan_upgraded` | Yes |
| Plan downgraded | Yes | Yes | `plan_downgraded` | Yes |
| Subscription cancelled (confirmation) | Yes | Yes | `subscription_cancelled` | Yes |

### 2.7 Agency Marketplace

| Event | In-App | Email | Template | Cannot Opt Out |
|---|---|---|---|---|
| Inquiry sent to agency (user) | Yes | Yes | `agency_inquiry_sent` | No |
| New inquiry received (agency email) | No | Yes | `agency_inquiry_received` | Yes |

### 2.8 Scheduled / Digest

| Event | Channel | Template | Frequency | Cannot Opt Out |
|---|---|---|---|---|
| Weekly digest | Email | `weekly_digest` | Every Monday 8am WAT | No (opt-out allowed) |
| Content reminder: posts due this week | In-App | — | Every Monday 9am WAT | No |
| Cultural moment reminder | In-App | — | 3 days before moment | No |

---

## 3. NOTIFICATION DATA MODEL

```typescript
// src/lib/notifications/types.ts

export type NotificationType =
  | "website_generated"
  | "website_published"
  | "website_generation_failed"
  | "website_unpublished"
  | "website_suspended"
  | "contact_form_received"
  | "domain_connected"
  | "domain_dns_delayed"
  | "calendar_ready"
  | "content_generated"
  | "content_generation_failed"
  | "usage_limit_warning"
  | "usage_limit_reached"
  | "meta_token_expired"
  | "search_console_expired"
  | "monthly_report_ready"
  | "payment_successful"
  | "payment_failed"
  | "grace_period_started"
  | "grace_period_ending"
  | "trial_ending"
  | "trial_expired"
  | "plan_upgraded"
  | "plan_downgraded"
  | "subscription_cancelled"
  | "agency_inquiry_sent";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url: string | null;
  action_label: string | null;
  icon: string;              // Lucide icon name
  icon_color: string;        // Tailwind color class
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Icon + color mapping for in-app rendering
export const NOTIFICATION_DISPLAY: Record<NotificationType, { icon: string; color: string }> = {
  website_generated:            { icon: "Globe",          color: "text-gold" },
  website_published:            { icon: "CheckCircle",    color: "text-green-400" },
  website_generation_failed:    { icon: "AlertTriangle",  color: "text-red-400" },
  website_unpublished:          { icon: "EyeOff",         color: "text-white/50" },
  website_suspended:            { icon: "AlertOctagon",   color: "text-red-400" },
  contact_form_received:        { icon: "Mail",           color: "text-gold" },
  domain_connected:             { icon: "Link",           color: "text-green-400" },
  domain_dns_delayed:           { icon: "Clock",          color: "text-amber-400" },
  calendar_ready:               { icon: "CalendarCheck",  color: "text-gold" },
  content_generated:            { icon: "Sparkles",       color: "text-gold" },
  content_generation_failed:    { icon: "AlertCircle",    color: "text-red-400" },
  usage_limit_warning:          { icon: "AlertCircle",    color: "text-amber-400" },
  usage_limit_reached:          { icon: "AlertOctagon",   color: "text-red-400" },
  meta_token_expired:           { icon: "RefreshCw",      color: "text-amber-400" },
  search_console_expired:       { icon: "RefreshCw",      color: "text-amber-400" },
  monthly_report_ready:         { icon: "BarChart3",      color: "text-gold" },
  payment_successful:           { icon: "CreditCard",     color: "text-green-400" },
  payment_failed:               { icon: "AlertTriangle",  color: "text-red-400" },
  grace_period_started:         { icon: "Clock",          color: "text-amber-400" },
  grace_period_ending:          { icon: "Clock",          color: "text-red-400" },
  trial_ending:                 { icon: "Clock",          color: "text-amber-400" },
  trial_expired:                { icon: "XCircle",        color: "text-red-400" },
  plan_upgraded:                { icon: "ArrowUpCircle",  color: "text-green-400" },
  plan_downgraded:              { icon: "ArrowDownCircle",color: "text-amber-400" },
  subscription_cancelled:       { icon: "XCircle",        color: "text-white/50" },
  agency_inquiry_sent:          { icon: "Send",           color: "text-gold" },
};
```

---

## 4. NOTIFICATION CREATION UTILITY

Every part of the codebase that needs to fire a notification calls this single function. It handles both in-app and email in one call, never throws, and runs async without blocking the caller.

```typescript
// src/lib/notifications/create-notification.ts

import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { NOTIFICATION_DISPLAY, NotificationType } from "./types";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  // Email params (optional — only set if this notification sends an email)
  email?: {
    to: string;
    subject: string;
    template: string;           // React Email component name
    templateProps: Record<string, unknown>;
  };
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const supabase = createServiceClient();
  const display = NOTIFICATION_DISPLAY[params.type];

  try {
    // Create in-app notification
    // Supabase Realtime will push this to the subscribed client instantly
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
    // In-app notification failure must not block email
    console.error("In-app notification creation failed:", err);
  }

  // Send email if specified
  if (params.email) {
    await sendEmail({
      to: params.email.to,
      subject: params.email.subject,
      template: params.email.template,
      templateProps: params.email.templateProps,
    });
  }
}

// Convenience: create notification without blocking the calling function
// Use this inside API routes after the main response has been sent
export function createNotificationAsync(params: CreateNotificationParams): void {
  createNotification(params).catch(err =>
    console.error("Async notification failed:", err)
  );
}
```

---

## 5. RESEND EMAIL INTEGRATION

### 5.1 Core Email Sender

```typescript
// src/lib/email/resend.ts

import { Resend } from "resend";
import { renderEmailTemplate } from "./templates";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "Zuri <hello@zuri.com>";
const REPLY_TO = "support@zuri.com";

export interface SendEmailParams {
  to: string;
  subject: string;
  template: string;
  templateProps: Record<string, unknown>;
  replyTo?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  try {
    // Validate email address format before sending
    if (!isValidEmail(params.to)) {
      console.error(`Invalid email address: ${params.to}`);
      return;
    }

    const { html, text } = await renderEmailTemplate(params.template, params.templateProps);

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html,
      text,
      replyTo: params.replyTo ?? REPLY_TO,
      headers: {
        "X-Zuri-Template": params.template,  // For debugging in Resend logs
      },
    });
  } catch (err) {
    // Email failures are logged but never re-thrown
    // The calling code must not crash because an email failed
    console.error(`Email send failed (template: ${params.template}, to: ${params.to}):`, err);
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### 5.2 Template Renderer

```typescript
// src/lib/email/templates/index.ts

import { render } from "@react-email/render";
import { WelcomeEmail } from "./WelcomeEmail";
import { WebsiteGeneratedEmail } from "./WebsiteGeneratedEmail";
import { WebsitePublishedEmail } from "./WebsitePublishedEmail";
import { WebsiteGenerationFailedEmail } from "./WebsiteGenerationFailedEmail";
import { WebsiteSuspendedEmail } from "./WebsiteSuspendedEmail";
import { ContactFormReceivedEmail } from "./ContactFormReceivedEmail";
import { DomainConnectedEmail } from "./DomainConnectedEmail";
import { CalendarReadyEmail } from "./CalendarReadyEmail";
import { UsageWarningEmail } from "./UsageWarningEmail";
import { UsageLimitReachedEmail } from "./UsageLimitReachedEmail";
import { MetaTokenExpiredEmail } from "./MetaTokenExpiredEmail";
import { MonthlyReportReadyEmail } from "./MonthlyReportReadyEmail";
import { PaymentSuccessfulEmail } from "./PaymentSuccessfulEmail";
import { PaymentFailedEmail } from "./PaymentFailedEmail";
import { GracePeriodStartedEmail } from "./GracePeriodStartedEmail";
import { GracePeriodEndingEmail } from "./GracePeriodEndingEmail";
import { TrialEndingEmail } from "./TrialEndingEmail";
import { TrialExpiredEmail } from "./TrialExpiredEmail";
import { PlanUpgradedEmail } from "./PlanUpgradedEmail";
import { PlanDowngradedEmail } from "./PlanDowngradedEmail";
import { SubscriptionCancelledEmail } from "./SubscriptionCancelledEmail";
import { AgencyInquirySentEmail } from "./AgencyInquirySentEmail";
import { AgencyInquiryReceivedEmail } from "./AgencyInquiryReceivedEmail";
import { WeeklyDigestEmail } from "./WeeklyDigestEmail";
import { PasswordResetEmail } from "./PasswordResetEmail";

const TEMPLATE_MAP: Record<string, React.ComponentType<any>> = {
  welcome: WelcomeEmail,
  password_reset: PasswordResetEmail,
  website_generated: WebsiteGeneratedEmail,
  website_generation_failed: WebsiteGenerationFailedEmail,
  website_published: WebsitePublishedEmail,
  website_suspended: WebsiteSuspendedEmail,
  contact_form_received: ContactFormReceivedEmail,
  domain_connected: DomainConnectedEmail,
  calendar_ready: CalendarReadyEmail,
  usage_warning: UsageWarningEmail,
  usage_limit_reached: UsageLimitReachedEmail,
  meta_token_expired: MetaTokenExpiredEmail,
  monthly_report_ready: MonthlyReportReadyEmail,
  payment_successful: PaymentSuccessfulEmail,
  payment_failed: PaymentFailedEmail,
  grace_period_started: GracePeriodStartedEmail,
  grace_period_ending: GracePeriodEndingEmail,
  trial_ending: TrialEndingEmail,
  trial_expired: TrialExpiredEmail,
  plan_upgraded: PlanUpgradedEmail,
  plan_downgraded: PlanDowngradedEmail,
  subscription_cancelled: SubscriptionCancelledEmail,
  agency_inquiry_sent: AgencyInquirySentEmail,
  agency_inquiry_received: AgencyInquiryReceivedEmail,
  weekly_digest: WeeklyDigestEmail,
};

export async function renderEmailTemplate(
  templateName: string,
  props: Record<string, unknown>
): Promise<{ html: string; text: string }> {
  const Template = TEMPLATE_MAP[templateName];
  if (!Template) throw new Error(`Unknown email template: ${templateName}`);

  const element = React.createElement(Template, props);
  const html = render(element);
  const text = render(element, { plainText: true });

  return { html, text };
}
```

### 5.3 Base Email Layout (React Email)

All email templates use this shared layout for visual consistency.

```tsx
// src/lib/email/templates/BaseEmailLayout.tsx

import {
  Body, Container, Head, Html, Img, Link, Preview,
  Row, Column, Section, Text, Hr, Font,
} from "@react-email/components";

interface BaseEmailLayoutProps {
  preview: string;             // Email preview text (shown in inbox list)
  children: React.ReactNode;
}

const BRAND_GOLD = "#C9A84C";
const BRAND_BG = "#0C0C0E";
const BRAND_SURFACE = "#141416";
const BRAND_TEXT = "#F0EDE8";
const APP_URL = "https://app.zuri.com";

export function BaseEmailLayout({ preview, children }: BaseEmailLayoutProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <Font
          fontFamily="Montserrat"
          fallbackFontFamily="Arial"
          webFont={{
            url: "https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#F4F4F4", margin: 0, padding: "40px 0", fontFamily: "Montserrat, Arial, sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto" }}>
          {/* Header */}
          <Section style={{ backgroundColor: BRAND_BG, borderRadius: "12px 12px 0 0", padding: "24px 32px", textAlign: "center" }}>
            <Img
              src={`${APP_URL}/Zuri_Logo.png`}
              alt="Zuri"
              width={80}
              height={24}
              style={{ objectFit: "contain" }}
            />
          </Section>

          {/* Content */}
          <Section style={{ backgroundColor: BRAND_SURFACE, padding: "32px", borderLeft: "1px solid #222", borderRight: "1px solid #222" }}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ backgroundColor: BRAND_BG, borderRadius: "0 0 12px 12px", padding: "24px 32px", borderTop: `1px solid #222` }}>
            <Text style={{ color: "#666", fontSize: "12px", textAlign: "center", margin: "0 0 8px" }}>
              Built for Africa. Powered by Gemini.
            </Text>
            <Text style={{ color: "#444", fontSize: "11px", textAlign: "center", margin: 0 }}>
              <Link href={`${APP_URL}/settings/notifications`} style={{ color: "#666" }}>Manage notifications</Link>
              {" · "}
              <Link href={`${APP_URL}/privacy`} style={{ color: "#666" }}>Privacy</Link>
              {" · "}
              <Link href={`${APP_URL}/terms`} style={{ color: "#666" }}>Terms</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Shared styled components used across templates
export function EmailHeading({ children }: { children: string }) {
  return (
    <Text style={{ color: BRAND_TEXT, fontSize: "22px", fontWeight: 600, margin: "0 0 12px", lineHeight: "1.3" }}>
      {children}
    </Text>
  );
}

export function EmailBody({ children }: { children: string }) {
  return (
    <Text style={{ color: "#A0A0A0", fontSize: "15px", lineHeight: "1.6", margin: "0 0 20px" }}>
      {children}
    </Text>
  );
}

export function EmailButton({ href, children }: { href: string; children: string }) {
  return (
    <Section style={{ textAlign: "center", margin: "24px 0" }}>
      <Link
        href={href}
        style={{
          backgroundColor: BRAND_GOLD,
          color: "#0C0C0E",
          padding: "14px 32px",
          borderRadius: "8px",
          fontWeight: 600,
          fontSize: "14px",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

export function EmailDivider() {
  return <Hr style={{ borderColor: "#222", margin: "24px 0" }} />;
}

export function EmailHighlight({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ marginBottom: "8px" }}>
      <Column style={{ color: "#666", fontSize: "13px", width: "40%" }}>{label}</Column>
      <Column style={{ color: BRAND_TEXT, fontSize: "13px", fontWeight: 500 }}>{value}</Column>
    </Row>
  );
}
```

---

## 6. KEY EMAIL TEMPLATES

### 6.1 Welcome Email

```tsx
// src/lib/email/templates/WelcomeEmail.tsx
interface WelcomeEmailProps {
  firstName: string;
  onboardingUrl: string;
}

export function WelcomeEmail({ firstName, onboardingUrl }: WelcomeEmailProps) {
  return (
    <BaseEmailLayout preview={`Welcome to Zuri, ${firstName}! Your business presence starts now.`}>
      <EmailHeading>Welcome to Zuri, {firstName}.</EmailHeading>
      <EmailBody>
        {`You've just joined thousands of African entrepreneurs building a professional online presence. In the next few minutes, we'll create your website and content strategy — powered by AI, built for your business.`}
      </EmailBody>
      <EmailBody>
        {`Let's get started. Answer a few quick questions about your business and we'll handle the rest.`}
      </EmailBody>
      <EmailButton href={onboardingUrl}>Set up my business profile</EmailButton>
      <EmailDivider />
      <EmailBody>
        {`Questions? Reply to this email and our team will get back to you.`}
      </EmailBody>
    </BaseEmailLayout>
  );
}
```

### 6.2 Website Generated Email

```tsx
interface WebsiteGeneratedEmailProps {
  firstName: string;
  businessName: string;
  previewUrl: string;
}

export function WebsiteGeneratedEmail({ firstName, businessName, previewUrl }: WebsiteGeneratedEmailProps) {
  return (
    <BaseEmailLayout preview={`Your ${businessName} website is ready to preview.`}>
      <EmailHeading>Your website is ready to preview.</EmailHeading>
      <EmailBody>{`Hi ${firstName}, your AI-generated website for ${businessName} is ready. Review it, make any edits you like, and publish it when you're happy.`}</EmailBody>
      <EmailButton href={previewUrl}>Preview my website</EmailButton>
      <EmailBody>{`You can edit any section, swap images, and regenerate copy directly from your dashboard.`}</EmailBody>
    </BaseEmailLayout>
  );
}
```

### 6.3 Contact Form Received Email

```tsx
interface ContactFormReceivedEmailProps {
  ownerName: string;
  ownerBusinessName: string;
  senderName: string;
  senderEmail: string;
  message: string;
  serviceInterest: string | null;
  dashboardUrl: string;
}

export function ContactFormReceivedEmail({
  ownerName, ownerBusinessName, senderName, senderEmail,
  message, serviceInterest, dashboardUrl,
}: ContactFormReceivedEmailProps) {
  return (
    <BaseEmailLayout preview={`New enquiry for ${ownerBusinessName} from ${senderName}`}>
      <EmailHeading>New enquiry on your website.</EmailHeading>
      <EmailBody>{`Someone reached out through your ${ownerBusinessName} website. Here are the details:`}</EmailBody>
      <EmailDivider />
      <EmailHighlight label="From" value={senderName} />
      <EmailHighlight label="Email" value={senderEmail} />
      {serviceInterest && <EmailHighlight label="Service interest" value={serviceInterest} />}
      <EmailDivider />
      <Text style={{ color: "#A0A0A0", fontSize: "13px", marginBottom: "4px" }}>Message:</Text>
      <Text style={{ color: "#F0EDE8", fontSize: "14px", lineHeight: "1.6", backgroundColor: "#1A1A1C", padding: "16px", borderRadius: "8px", margin: "0 0 24px" }}>
        {message}
      </Text>
      <EmailButton href={`mailto:${senderEmail}`}>Reply to {senderName}</EmailButton>
      <EmailBody>{`You can also view all your enquiries from your Zuri dashboard.`}</EmailBody>
    </BaseEmailLayout>
  );
}
```

### 6.4 Payment Failed Email

```tsx
interface PaymentFailedEmailProps {
  firstName: string;
  planName: string;
  gracePeriodEnd: string;
  updatePaymentUrl: string;
}

export function PaymentFailedEmail({ firstName, planName, gracePeriodEnd, updatePaymentUrl }: PaymentFailedEmailProps) {
  return (
    <BaseEmailLayout preview={`Action required: your Zuri payment failed`}>
      <EmailHeading>We couldn't process your payment.</EmailHeading>
      <EmailBody>{`Hi ${firstName}, we attempted to charge your card for your ${planName} plan but the payment did not go through.`}</EmailBody>
      <EmailBody>{`Your account is in a grace period until ${gracePeriodEnd}. Update your payment method before then to avoid losing access to your features.`}</EmailBody>
      <EmailButton href={updatePaymentUrl}>Update payment method</EmailButton>
      <EmailDivider />
      <EmailBody>{`If you have any questions, reply to this email and our team will help.`}</EmailBody>
    </BaseEmailLayout>
  );
}
```

### 6.5 Usage Limit Reached Email

```tsx
interface UsageLimitReachedEmailProps {
  firstName: string;
  metric: string;             // "AI images"
  limit: number;
  resetDate: string;
  upgradeUrl: string;
  currentPlan: string;
  upgradePlan: string;
}

export function UsageLimitReachedEmail({ firstName, metric, limit, resetDate, upgradeUrl, currentPlan, upgradePlan }: UsageLimitReachedEmailProps) {
  return (
    <BaseEmailLayout preview={`You've used all your ${metric} for this month`}>
      <EmailHeading>{`You've reached your ${metric} limit.`}</EmailHeading>
      <EmailBody>{`Hi ${firstName}, you've used all ${limit} ${metric} on your ${currentPlan} plan this month. Your allowance resets on ${resetDate}.`}</EmailBody>
      <EmailBody>{`Upgrade to ${upgradePlan} to get more ${metric} immediately — without waiting for the reset.`}</EmailBody>
      <EmailButton href={upgradeUrl}>Upgrade my plan</EmailButton>
      <EmailBody>{`Or wait until ${resetDate} and your allowance will automatically reset.`}</EmailBody>
    </BaseEmailLayout>
  );
}
```

### 6.6 Weekly Digest Email

```tsx
interface WeeklyDigestEmailProps {
  firstName: string;
  businessName: string;
  weeklyViews: number | null;
  viewsChange: number | null;    // Percent change from previous week
  postsScheduledThisWeek: number;
  imagesUsed: number;
  imageLimit: number | null;
  dashboardUrl: string;
}

export function WeeklyDigestEmail({
  firstName, businessName, weeklyViews, viewsChange,
  postsScheduledThisWeek, imagesUsed, imageLimit, dashboardUrl,
}: WeeklyDigestEmailProps) {
  return (
    <BaseEmailLayout preview={`Your week at a glance — ${businessName}`}>
      <EmailHeading>{`Good morning, ${firstName}.`}</EmailHeading>
      <EmailBody>{`Here's a quick look at how ${businessName} performed this past week.`}</EmailBody>

      {weeklyViews !== null && (
        <>
          <EmailDivider />
          <Text style={{ color: "#666", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>Website</Text>
          <Text style={{ color: "#C9A84C", fontSize: "32px", fontWeight: 600, margin: "0 0 4px" }}>{weeklyViews.toLocaleString()}</Text>
          <Text style={{ color: "#666", fontSize: "13px", margin: "0 0 4px" }}>visitors this week</Text>
          {viewsChange !== null && (
            <Text style={{ color: viewsChange >= 0 ? "#4DA86E" : "#D94F4F", fontSize: "13px", margin: 0 }}>
              {viewsChange >= 0 ? "+" : ""}{viewsChange}% vs last week
            </Text>
          )}
        </>
      )}

      <EmailDivider />
      <Text style={{ color: "#666", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>This week</Text>
      <EmailHighlight label="Posts scheduled" value={`${postsScheduledThisWeek} posts`} />
      {imageLimit !== null && (
        <EmailHighlight label="Images used" value={`${imagesUsed} of ${imageLimit} this month`} />
      )}

      <EmailDivider />
      <EmailButton href={dashboardUrl}>Open my dashboard</EmailButton>
    </BaseEmailLayout>
  );
}
```

---

## 7. IN-APP NOTIFICATION SYSTEM

### 7.1 Supabase Realtime Subscription (Client)

```tsx
// src/hooks/use-notifications.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Notification } from "@/lib/notifications/types";

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    setNotifications(data ?? []);
    setUnreadCount((data ?? []).filter(n => !n.is_read).length);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchNotifications]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [userId]);

  const markRead = useCallback(async (notificationId: string) => {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const supabase = createClient();
    const target = notifications.find(n => n.id === notificationId);
    await supabase.from("notifications").delete().eq("id", notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (target && !target.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [notifications]);

  return { notifications, unreadCount, isLoading, markAllRead, markRead, deleteNotification };
}
```

### 7.2 Notification API Routes

```typescript
// src/app/api/notifications/route.ts

// GET — paginated notification list
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 20;

  const { data, count } = await supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  return NextResponse.json({
    notifications: data ?? [],
    total: count ?? 0,
    unread: (data ?? []).filter(n => !n.is_read).length,
  });
}

// PATCH — mark all as read
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return NextResponse.json({ success: true });
}
```

```typescript
// src/app/api/notifications/[id]/route.ts

// PATCH — mark single notification as read
// DELETE — delete single notification
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  // ... auth + ownership check + update is_read = true ...
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  // ... auth + ownership check + delete ...
}
```

---

## 8. NOTIFICATION PREFERENCES

### 8.1 Preferences Schema

```typescript
// User-controlled notification settings
// Billing and security emails are always sent — they cannot be opted out of.
// An opt-out flag of false on a billing email is silently ignored.

interface NotificationPreferences {
  user_id: string;
  email_weekly_digest: boolean;         // Default: true — opt-out allowed
  email_content_reminders: boolean;     // Default: true — opt-out allowed
  email_usage_alerts: boolean;          // Default: true — opt-out allowed
  email_marketing: boolean;             // Default: true — opt-out allowed
  in_app_all: boolean;                  // Default: true — opt-out allowed (disables all in-app)
  updated_at: string;
}

// Cannot opt out of (enforced in sendEmail — ignores preference):
const MANDATORY_EMAIL_TEMPLATES = new Set([
  "welcome",
  "password_reset",
  "payment_successful",
  "payment_failed",
  "grace_period_started",
  "grace_period_ending",
  "trial_ending",
  "trial_expired",
  "plan_downgraded",
  "subscription_cancelled",
  "website_suspended",
  "account_deleted",
]);
```

### 8.2 Preference API

```typescript
// src/app/api/notifications/preferences/route.ts

// GET — fetch preferences
// PATCH — update preferences

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Only allow these fields to be updated
  const allowedFields = [
    "email_weekly_digest",
    "email_content_reminders",
    "email_usage_alerts",
    "email_marketing",
    "in_app_all",
  ];

  const safeUpdates = Object.fromEntries(
    Object.entries(body)
      .filter(([key]) => allowedFields.includes(key))
      .filter(([, value]) => typeof value === "boolean")
  );

  await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    ...safeUpdates,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return NextResponse.json({ success: true });
}
```

---

## 9. SCHEDULED NOTIFICATIONS (CRON)

### 9.1 Weekly Digest Cron

```typescript
// src/app/api/cron/weekly-digest/route.ts
// Runs every Monday at 08:00 WAT (07:00 UTC)

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get all paid active users who have opted into weekly digest
  const { data: users } = await supabase
    .from("subscriptions")
    .select(`
      user_id,
      plan_id,
      profiles!inner(email, full_name),
      notification_preferences(email_weekly_digest)
    `)
    .in("plan_id", ["pro", "growth", "premium"])
    .eq("status", "active");

  let sent = 0;
  for (const userSub of users ?? []) {
    const prefs = (userSub as any).notification_preferences;
    if (prefs && prefs.email_weekly_digest === false) continue;

    try {
      await sendWeeklyDigest(supabase, userSub.user_id, (userSub as any).profiles);
      sent++;
    } catch (err) {
      console.error(`Weekly digest failed for ${userSub.user_id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent });
}

async function sendWeeklyDigest(
  supabase: SupabaseClient,
  userId: string,
  profile: { email: string; full_name: string }
): Promise<void> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch website data
  const { data: website } = await supabase
    .from("websites")
    .select("handle")
    .eq("user_id", userId)
    .eq("status", "published")
    .single();

  let weeklyViews: number | null = null;
  let viewsChange: number | null = null;

  if (website) {
    const { data: thisWeek } = await supabase
      .from("website_analytics_daily")
      .select("total_views")
      .eq("website_handle", website.handle)
      .gte("date", weekAgo.toISOString().split("T")[0]);

    weeklyViews = (thisWeek ?? []).reduce((a, d) => a + d.total_views, 0);

    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const { data: lastWeek } = await supabase
      .from("website_analytics_daily")
      .select("total_views")
      .eq("website_handle", website.handle)
      .gte("date", twoWeeksAgo.toISOString().split("T")[0])
      .lt("date", weekAgo.toISOString().split("T")[0]);

    const lastWeekViews = (lastWeek ?? []).reduce((a, d) => a + d.total_views, 0);
    if (lastWeekViews > 0) {
      viewsChange = Math.round(((weeklyViews - lastWeekViews) / lastWeekViews) * 100);
    }
  }

  // Posts scheduled this week
  const { count: postsThisWeek } = await supabase
    .from("content_calendar")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .gte("scheduled_date", now.toISOString().split("T")[0])
    .lte("scheduled_date", new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

  // Usage this month
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const { data: usage } = await supabase
    .from("usage_tracking")
    .select("images_generated")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .single();

  const { data: brand } = await supabase
    .from("business_profiles")
    .select("business_name")
    .eq("user_id", userId)
    .single();

  await sendEmail({
    to: profile.email,
    subject: `Your week at a glance — ${brand?.business_name ?? "your business"}`,
    template: "weekly_digest",
    templateProps: {
      firstName: profile.full_name?.split(" ")[0] ?? "there",
      businessName: brand?.business_name ?? "Your business",
      weeklyViews,
      viewsChange,
      postsScheduledThisWeek: postsThisWeek ?? 0,
      imagesUsed: usage?.images_generated ?? 0,
      imageLimit: PLAN_CONFIG[userId]?.limits.images_per_month ?? null,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    },
  });
}
```

### 9.2 Content Reminder Cron

```typescript
// src/app/api/cron/content-reminders/route.ts
// Runs every Monday at 09:00 WAT — in-app only, no email

export async function GET(req: Request) {
  // ... auth check ...
  const supabase = createServiceClient();

  const today = new Date();
  const oneWeekOut = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStr = today.toISOString().split("T")[0];
  const oneWeekStr = oneWeekOut.toISOString().split("T")[0];

  // Find all users with upcoming approved/draft slots this week
  const { data: upcomingSlots } = await supabase
    .from("content_calendar")
    .select("user_id, count")
    .gte("scheduled_date", todayStr)
    .lte("scheduled_date", oneWeekStr)
    .in("status", ["draft", "approved"]);

  // Group by user_id
  const userSlotCounts = groupBy(upcomingSlots ?? [], "user_id");

  for (const [userId, slots] of Object.entries(userSlotCounts)) {
    const count = slots.length;
    await createNotification({
      userId,
      type: "calendar_ready",
      title: `${count} post${count !== 1 ? "s" : ""} scheduled this week`,
      body: `You have ${count} upcoming post${count !== 1 ? "s" : ""} in your content calendar. Review and generate content before they're due.`,
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/content`,
      actionLabel: "View calendar",
    });
  }

  return NextResponse.json({ ok: true });
}
```

### 9.3 Cultural Moment Reminders

```typescript
// src/app/api/cron/cultural-reminders/route.ts
// Runs daily at 09:00 WAT — checks if any cultural moment is 3 days away

export async function GET(req: Request) {
  // ... auth check ...
  const supabase = createServiceClient();

  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const targetMonth = threeDaysFromNow.getMonth() + 1;
  const targetDay = threeDaysFromNow.getDate();

  // Find cultural moments 3 days from now
  const upcomingMoments = NIGERIAN_CULTURAL_CALENDAR.filter(
    m => m.month === targetMonth && m.day === targetDay && !m.is_floating
  );

  if (upcomingMoments.length === 0) return NextResponse.json({ ok: true, moments: 0 });

  // Find all users with calendar slots for those dates who have content scheduled
  for (const moment of upcomingMoments) {
    const momentDate = `${threeDaysFromNow.getFullYear()}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;

    const { data: usersWithSlots } = await supabase
      .from("content_calendar")
      .select("user_id")
      .eq("scheduled_date", momentDate)
      .eq("is_cultural_moment", true);

    for (const { user_id } of usersWithSlots ?? []) {
      await createNotification({
        userId: user_id,
        type: "calendar_ready",
        title: `${moment.name} is in 3 days`,
        body: `You have a post planned for ${moment.name}. Generate your content now so it's ready to go.`,
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/content`,
        actionLabel: "Prepare my post",
        metadata: { moment: moment.name, date: momentDate },
      });
    }
  }

  return NextResponse.json({ ok: true, moments: upcomingMoments.length });
}
```

---

## 10. EMAIL RATE LIMITING

Prevents the same email type from being sent too frequently to the same user.

```typescript
// src/lib/email/rate-limit.ts

const EMAIL_RATE_LIMITS: Record<string, { count: number; windowHours: number }> = {
  contact_form_received: { count: 5, windowHours: 1 },    // Max 5 contact form emails per hour
  usage_warning: { count: 1, windowHours: 720 },           // Max 1 usage warning per metric per 30 days
  usage_limit_reached: { count: 1, windowHours: 24 },      // Max 1 per metric per day
  domain_dns_delayed: { count: 1, windowHours: 24 },       // Max 1 per day
  meta_token_expired: { count: 1, windowHours: 24 },       // Max 1 per day
};

export async function isEmailRateLimited(
  supabase: SupabaseClient,
  userId: string,
  template: string
): Promise<boolean> {
  const limit = EMAIL_RATE_LIMITS[template];
  if (!limit) return false; // No limit for this template

  const windowStart = new Date(Date.now() - limit.windowHours * 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("email_send_log")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("template", template)
    .gte("sent_at", windowStart);

  return (count ?? 0) >= limit.count;
}

export async function logEmailSend(
  supabase: SupabaseClient,
  userId: string,
  template: string
): Promise<void> {
  await supabase.from("email_send_log").insert({
    user_id: userId,
    template,
    sent_at: new Date().toISOString(),
  });
}
```

---

## 11. DATABASE SCHEMA

```sql
-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  action_url text,
  action_label text,
  icon text NOT NULL DEFAULT 'Bell',
  icon_color text NOT NULL DEFAULT 'text-gold',
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications"
  ON notifications FOR ALL USING (auth.uid() = user_id);

-- Enable Supabase Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC);

-- Auto-delete notifications older than 90 days (keep DB clean)
CREATE OR REPLACE FUNCTION delete_old_notifications()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_weekly_digest boolean NOT NULL DEFAULT true,
  email_content_reminders boolean NOT NULL DEFAULT true,
  email_usage_alerts boolean NOT NULL DEFAULT true,
  email_marketing boolean NOT NULL DEFAULT true,
  in_app_all boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences"
  ON notification_preferences FOR ALL USING (auth.uid() = user_id);

-- Auto-create preferences row on signup
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_notification_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- ============================================================
-- EMAIL SEND LOG (for rate limiting)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_send_log_user_template
  ON email_send_log(user_id, template, sent_at DESC);

-- Auto-purge logs older than 30 days
```

---

## 12. ALL API ROUTES

| Method | Route | Description | Auth |
|---|---|---|---|
| GET | /api/notifications | Paginated notification list | Yes |
| PATCH | /api/notifications | Mark all as read | Yes |
| PATCH | /api/notifications/[id] | Mark single notification as read | Yes |
| DELETE | /api/notifications/[id] | Delete single notification | Yes |
| GET | /api/notifications/preferences | Get notification preferences | Yes |
| PATCH | /api/notifications/preferences | Update preferences | Yes |
| GET | /api/cron/weekly-digest | Send weekly digest emails | Cron |
| GET | /api/cron/content-reminders | Send content reminder in-app | Cron |
| GET | /api/cron/cultural-reminders | Send cultural moment reminders | Cron |

---

## 13. NOTIFICATION BELL UI

```
TopBar component:
  └── Bell icon (Lucide BellRing if unread, Bell if none)
      └── Badge: shows unread count (max "9+" display)
          └── Click → opens NotificationDrawer

NotificationDrawer:
  ├── Header: "Notifications" + "Mark all read" text button
  ├── Notification list (scrollable, last 20)
  │   ├── Grouped: "Today" | "Yesterday" | "Earlier"
  │   └── Each item:
  │       ├── Icon (from NOTIFICATION_DISPLAY map, colored)
  │       ├── Title (semibold, white if unread, muted if read)
  │       ├── Body (1-2 lines, truncated, muted text)
  │       ├── Time ago (e.g. "2 hours ago")
  │       ├── Action button (if action_url set, gold text link)
  │       └── X button (delete)
  └── Footer: "Notification settings" link → /settings/notifications
```

---

## 14. ENVIRONMENT VARIABLES REQUIRED

```env
RESEND_API_KEY=...
RESEND_FROM_DOMAIN=zuri.com    # Must be verified in Resend dashboard with DNS records
```

Resend DNS records to add to zuri.com:
- SPF record
- DKIM record (Resend provides these on dashboard)
- DMARC record (recommended)

---

## 15. ERROR HANDLING — COMPLETE MAP

| Scenario | System Action | User-Facing Impact |
|---|---|---|
| Email send fails (Resend error) | Log error, continue — never re-throw | User misses an email. Admin sees error in logs. |
| Invalid email address | Skip send, log warning | Same as above |
| Resend API rate limit hit | Queue for retry with 60s backoff | Slight email delay |
| In-app notification DB write fails | Log error, still attempt email | User misses in-app notification. Email may still send. |
| Supabase Realtime channel drops | Client auto-reconnects (Supabase built-in) | Brief delay in real-time notifications. Refresh restores. |
| User deletes account — notifications cascade | ON DELETE CASCADE removes all rows | Clean deletion |
| Weekly digest: user has no business profile | Skip that user | No digest sent |
| Weekly digest: Resend quota exceeded | Log and skip remaining users | Some users miss that week's digest |
| Rate limit: contact form email too frequent | Skip email send | User gets fewer duplicate contact emails |
| Rate limit: usage warning already sent this month | Skip email send | No duplicate warning emails |
| Mandatory email (billing) rate-limited | Rate limit check skipped for mandatory templates — always send | Billing emails always get through |
| Notification preferences not found | Use defaults (all true) | User receives all notifications |
| Template not found in TEMPLATE_MAP | Throw error, log, do not send | Email not sent, admin logs show the missing template |
| Weekly digest cron: analytics DB unavailable | Send digest with only content data (no view counts) | Digest sent without website traffic section |

---

## 16. IMPLEMENTATION ORDER

1. Database migration (notifications, notification_preferences, email_send_log tables)
2. Enable Supabase Realtime on notifications table
3. `src/lib/email/resend.ts` — core sender
4. `src/lib/email/rate-limit.ts`
5. `src/lib/notifications/create-notification.ts` — main utility
6. `src/lib/email/templates/BaseEmailLayout.tsx`
7. All email templates (create as stubs first, fill in content)
8. `src/app/api/notifications/route.ts` — list + mark all read
9. `src/app/api/notifications/[id]/route.ts` — single notification actions
10. `src/app/api/notifications/preferences/route.ts`
11. `src/hooks/use-notifications.ts` — Realtime hook
12. Notification bell + drawer component in TopBar
13. Wire `createNotification` calls into all existing API routes (website, payments, onboarding, etc.)
14. `src/app/api/cron/weekly-digest/route.ts`
15. `src/app/api/cron/content-reminders/route.ts`
16. `src/app/api/cron/cultural-reminders/route.ts`
17. Add new cron entries to `vercel.json`
18. Notification preferences settings page (`/settings/notifications`)
19. Add Resend DNS records to zuri.com domain
20. Test every email template end-to-end in Resend test mode before going live
