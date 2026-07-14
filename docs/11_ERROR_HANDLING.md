# ZURI — ERROR HANDLING SYSTEM
# Master error catalogue, handling patterns, recovery strategies, React error
# boundaries, user-facing message standards, and error logging

---

## 1. PHILOSOPHY

Errors are conversations with the user. Every error must do three things:

1. **Tell** them what happened in plain language — no codes, no jargon
2. **Show** them what to do next — a clear action path
3. **Recover** gracefully — the rest of the app must keep working

Three audiences, three layers:
- **User** — a warm, actionable message in the UI
- **Developer** — full details in server logs with a support reference
- **Admin** — aggregated error reports for systemic issues

The golden rule: **an error in one part of the app must never crash another part.**

---

## 2. ERROR CLASSIFICATION

### 2.1 HTTP Status Code Standards

| Code | Category | When to use in Zuri |
|---|---|---|
| 400 | Bad Request | Input fails format/type validation (wrong type, invalid enum) |
| 401 | Unauthorized | No valid session — user must log in |
| 403 | Forbidden | Logged in but not allowed — plan gate, feature lock, admin only |
| 404 | Not Found | Resource doesn't exist OR user can't see it (never distinguish these) |
| 409 | Conflict | Duplicate (handle taken, email exists, domain in use) |
| 413 | Payload Too Large | File upload exceeds limit |
| 422 | Unprocessable | Input is well-formed but fails business rules (placeholders in copy, etc.) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Error | Unexpected failure — always log with support reference |
| 502 | Bad Gateway | Upstream API (Gemini, Flutterwave) returned an error |
| 503 | Unavailable | Supabase down, maintenance mode, or quota exceeded |
| 504 | Gateway Timeout | Upstream API timed out (Gemini generation took too long) |

### 2.2 Internal Error Severity

```typescript
// src/lib/errors/types.ts

export type ErrorSeverity = "critical" | "error" | "warning" | "info";

// critical: System is broken — admin must act now (payment processing down, DB unavailable)
// error: Feature is broken — user sees an error, developer should fix soon
// warning: Degraded experience — feature partially works, log but don't alert
// info: Expected failure — user hit a limit, rate limit, or validation error

export interface ZuriError {
  code: string;              // Machine-readable: "GEMINI_TIMEOUT", "HANDLE_TAKEN"
  severity: ErrorSeverity;
  userMessage: string;       // What the user sees — friendly, actionable
  developerMessage: string;  // What goes in the log — full technical detail
  action?: string;           // What the user should do: "upgrade", "retry", "contact_support"
  supportRef?: string;       // Generated reference for 500 errors
}
```

---

## 3. USER-FACING ERROR MESSAGE STANDARDS

### 3.1 Tone Rules

- **Never** blame the user ("You entered an invalid value")
- **Always** use "we" for server-side failures ("We couldn't process this")
- **Always** include an action ("Try again", "Upgrade your plan", "Contact support")
- **Never** use HTTP status codes or technical terms in user messages
- **Never** say "Error" at the start of a message — say what happened

### 3.2 Message Templates by Category

```typescript
// src/lib/errors/messages.ts

export const ERROR_MESSAGES = {
  // Auth
  AUTH_REQUIRED:          "You'll need to sign in to access this.",
  SESSION_EXPIRED:        "Your session has expired. Please sign in again.",
  ACCOUNT_NOT_FOUND:      "We couldn't find an account with that email.",
  INVALID_CREDENTIALS:    "The email or password you entered is incorrect.",
  EMAIL_NOT_VERIFIED:     "Please verify your email address before continuing. Check your inbox.",

  // Validation
  FIELD_REQUIRED:         (field: string) => `${field} is required.`,
  FIELD_TOO_SHORT:        (field: string, min: number) => `${field} must be at least ${min} characters.`,
  FIELD_TOO_LONG:         (field: string, max: number) => `${field} must be ${max} characters or fewer.`,
  FIELD_INVALID_FORMAT:   (field: string) => `${field} contains invalid characters.`,
  FIELD_EMOJI_ONLY:       (field: string) => `${field} must contain at least one letter or number.`,
  FIELD_PLACEHOLDER:      (field: string) => `${field} still has placeholder text. Please update it.`,

  // Handle
  HANDLE_TAKEN:           (suggestions: string[]) => `That handle is taken. Try: ${suggestions.join(", ")}`,
  HANDLE_RESERVED:        "That handle is reserved. Please choose a different one.",
  HANDLE_LOCKED:          "Your handle is permanent once your website is published. Unpublish to change it.",
  HANDLE_INVALID:         "Handles can only contain lowercase letters, numbers, and hyphens.",

  // Plans and Features
  UPGRADE_REQUIRED:       (feature: string, plan: string) => `${feature} is available on the ${plan} plan.`,
  PLAN_LIMIT_REACHED:     (resource: string, reset: string) => `You've used all your ${resource} this month. Your allowance resets on ${reset}.`,
  PLAN_LIMIT_WARNING:     (resource: string, used: number, limit: number) => `You've used ${used} of ${limit} ${resource} this month.`,
  TRIAL_ENDED:            "Your free trial has ended. Upgrade to continue.",
  GRACE_PERIOD:           (date: string) => `Your payment failed. Update your payment method by ${date} to keep your access.`,
  SUSPENDED:              "Your account has been suspended due to a payment issue. Resubscribe to restore access.",

  // Website Builder
  WEBSITE_NOT_FOUND:      "No website found. Generate your website from the dashboard.",
  WEBSITE_GENERATION_FAILED: "Website generation failed. Please try again — if this keeps happening, contact support.",
  WEBSITE_GENERATION_TIMEOUT: "Your website is taking longer than usual to generate. We'll notify you when it's ready.",
  PUBLISH_VALIDATION_FAILED: "Your website has some issues that need fixing before it can go live.",
  CUSTOM_DOMAIN_TAKEN:    "This domain is already connected to another Zuri site.",
  CUSTOM_DOMAIN_INVALID:  "Please enter a valid domain name (e.g. mybusiness.com).",
  CUSTOM_DOMAIN_ZURI:     "You can't use a zuri.com address as a custom domain.",
  DNS_PROPAGATING:        "Your domain DNS is still propagating. This can take up to 48 hours.",
  DNS_FAILED:             "DNS verification failed. Please check your DNS settings and try again.",

  // Content
  CALENDAR_GENERATION_FAILED: "We couldn't generate your calendar. Try again — your previous calendar is still intact.",
  CONTENT_GENERATION_FAILED:  "Content generation didn't complete. Please try again.",
  IMAGE_GENERATION_FAILED:    "Image generation is temporarily unavailable. You can upload or search for an image manually.",
  IMAGE_SAFETY_BLOCKED:       "We adjusted your image to meet content guidelines and tried again.",
  BLOG_GENERATION_FAILED:     "Blog post generation failed. Please try again.",
  NEWSLETTER_GENERATION_FAILED: "Newsletter generation failed. Please try again.",
  VIDEO_COMING_SOON:          "Video generation is coming soon. Your script is ready for when it launches.",

  // File Upload
  FILE_TOO_LARGE:         "The file must be smaller than 10MB.",
  FILE_WRONG_TYPE:        "Only JPEG, PNG, and WebP images are allowed.",
  FILE_CORRUPTED:         "This file appears to be corrupted. Please try a different image.",
  FILE_EMPTY:             "The file you selected is empty.",

  // Agency
  AGENCY_INQUIRY_RATE_LIMIT: "You've already sent 3 inquiries to this agency recently. Please wait for their response.",
  AGENCY_NOT_FOUND:       "This agency is no longer available on Zuri.",
  AGENCY_CONTACT_UPGRADE: "Connecting with agencies is available on the Growth plan.",

  // Payments
  PAYMENT_INITIATION_FAILED:  "We couldn't start the payment process. Please try again.",
  PAYMENT_VERIFICATION_FAILED: "We couldn't verify your payment. Contact support with reference:",
  PAYMENT_CANCELLED:          "Payment was not completed. Your plan hasn't changed.",

  // Analytics
  META_TOKEN_EXPIRED:     "Your Instagram & Facebook connection has expired. Reconnect to restore insights.",
  SEARCH_CONSOLE_EXPIRED: "Your Google Search Console connection has expired. Reconnect to restore search data.",
  META_CONNECT_FAILED:    "Connection to Meta didn't complete. Please try again.",
  SC_SITE_NOT_VERIFIED:   "Your website isn't verified in Google Search Console yet. Follow the setup guide.",

  // General
  RATE_LIMIT:             "You're doing that too quickly. Please wait a moment and try again.",
  NOT_FOUND:              "We couldn't find what you're looking for.",
  SERVER_ERROR:           "Something went wrong on our end. Please try again.",
  SERVER_ERROR_WITH_REF:  (ref: string) => `Something went wrong on our end. Please try again. If this continues, contact support with reference: ${ref}`,
  OFFLINE:                "You appear to be offline. Check your connection and try again.",
  UNKNOWN:                "An unexpected error occurred. Please refresh the page and try again.",
} as const;
```

---

## 4. SERVER-SIDE ERROR HANDLING PATTERN

Every API route must follow this exact structure. Copy this template for every new route.

```typescript
// Template for every API route in Zuri

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { checkFeatureAccess } from "@/lib/payments/feature-gate";
import { sanitizeText } from "@/lib/utils/sanitize";
import { createAuditLog } from "@/lib/security/audit";
import { generateSupportRef } from "@/lib/errors/support-ref";

export async function POST(req: Request) {
  // ── 1. Authentication ────────────────────────────────────────────────────
  const { user, error: authError } = await requireAuth();
  if (authError) return authError; // Returns 401

  // ── 2. Rate Limiting ─────────────────────────────────────────────────────
  const supabase = await createClient();
  const rateLimit = await checkRateLimit(supabase, user.id, "api:general");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  // ── 3. Parse and Validate Input ──────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request format." },
      { status: 400 }
    );
  }

  const errors: string[] = [];
  // ... validate fields, collect errors ...
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed.", details: errors }, { status: 400 });
  }

  // ── 4. Feature Gate ──────────────────────────────────────────────────────
  const gate = await checkFeatureAccess(supabase, user.id, "some_feature");
  if (!gate.allowed) {
    return NextResponse.json({
      error: `This feature requires the ${gate.upgradeRequired} plan.`,
      upgradeRequired: gate.upgradeRequired,
    }, { status: 403 });
  }

  // ── 5. Business Logic ────────────────────────────────────────────────────
  try {
    // ... main logic ...
    return NextResponse.json({ success: true });

  } catch (err) {
    // ── 6. Error Handling ──────────────────────────────────────────────────
    const ref = generateSupportRef();
    console.error(`[${ref}] Route error:`, err);

    // Classify the error
    if (isUpstreamError(err)) {
      return NextResponse.json(
        { error: "An external service is temporarily unavailable. Please try again." },
        { status: 502 }
      );
    }

    if (isTimeoutError(err)) {
      return NextResponse.json(
        { error: "The request timed out. Please try again." },
        { status: 504 }
      );
    }

    // Default: internal server error
    return NextResponse.json(
      { error: "Something went wrong on our end.", support_ref: ref },
      { status: 500 }
    );
  }
}

function generateSupportRef(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}

function isUpstreamError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes("Gemini") ||
    err.message.includes("Flutterwave") ||
    err.message.includes("Unsplash") ||
    err.message.includes("Pexels") ||
    err.message.includes("fetch failed");
}

function isTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === "AbortError" || err.message.includes("timeout");
}
```

---

## 5. CLIENT-SIDE ERROR HANDLING PATTERNS

### 5.1 Global Error Boundary

```tsx
// src/components/errors/ErrorBoundary.tsx
"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  context?: string;  // e.g. "website-builder", "content-calendar"
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.context ?? "unknown"}]`, error, info);
    // In production: send to error monitoring (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <AlertTriangle className="size-8 text-amber-400 mb-4" />
          <h3 className="font-heading text-lg text-white mb-2">
            Something went wrong here
          </h3>
          <p className="text-white/50 text-sm mb-6 max-w-xs">
            This section ran into an unexpected problem. The rest of your dashboard is fine.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 text-sm text-gold"
          >
            <RefreshCw className="size-4" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrap all major dashboard sections:
// <ErrorBoundary context="website-builder">...</ErrorBoundary>
// <ErrorBoundary context="content-calendar">...</ErrorBoundary>
// <ErrorBoundary context="analytics">...</ErrorBoundary>
```

### 5.2 Next.js Error Pages

```tsx
// src/app/error.tsx — catches errors in any route segment
"use client";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="size-12 text-amber-400 mb-6" />
      <h1 className="font-heading text-3xl text-white mb-4">Something went wrong</h1>
      <p className="text-white/50 mb-8 max-w-md">
        An unexpected error occurred. This has been logged and we'll look into it.
      </p>
      <button onClick={reset} className="btn-gold px-8 py-3">
        Try again
      </button>
    </div>
  );
}
```

```tsx
// src/app/not-found.tsx
import Link from "next/link";
import { Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <Search className="size-12 text-white/20 mb-6" />
      <h1 className="font-heading text-4xl text-white mb-4">Page not found</h1>
      <p className="text-white/50 mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/dashboard" className="btn-gold px-8 py-3">
        Go to dashboard
      </Link>
    </div>
  );
}
```

```tsx
// src/app/global-error.tsx — catches errors in the root layout
"use client";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body style={{ backgroundColor: "#0C0C0E", color: "#F0EDE8", fontFamily: "sans-serif",
                     display: "flex", flexDirection: "column", alignItems: "center",
                     justifyContent: "center", minHeight: "100vh", textAlign: "center", padding: "2rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Zuri is temporarily unavailable</h1>
        <p style={{ opacity: 0.5, marginBottom: "2rem" }}>
          We're experiencing technical difficulties. Please try again in a moment.
        </p>
        <button onClick={reset} style={{ background: "#C9A84C", color: "#0C0C0E",
                                          padding: "12px 32px", borderRadius: "8px",
                                          fontWeight: 600, border: "none", cursor: "pointer" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
```

### 5.3 API Call Error Hook

```typescript
// src/hooks/use-api.ts
"use client";

import { useState } from "react";

interface ApiState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

export function useApiCall<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null, error: null, isLoading: false,
  });

  async function call(
    url: string,
    options?: RequestInit,
    onSuccess?: (data: T) => void
  ): Promise<T | null> {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });

      const data = await res.json();

      if (!res.ok) {
        // Extract user-friendly error from response
        const errorMessage = data.error ?? data.message ?? "Something went wrong. Please try again.";
        setState({ data: null, error: errorMessage, isLoading: false });
        return null;
      }

      setState({ data, error: null, isLoading: false });
      onSuccess?.(data);
      return data;

    } catch (err) {
      const isOffline = !navigator.onLine;
      const errorMessage = isOffline
        ? "You appear to be offline. Check your connection and try again."
        : "Something went wrong. Please try again.";

      setState({ data: null, error: errorMessage, isLoading: false });
      console.error("API call failed:", err);
      return null;
    }
  }

  function clearError() {
    setState(prev => ({ ...prev, error: null }));
  }

  return { ...state, call, clearError };
}
```

### 5.4 Inline Error Component

```tsx
// src/components/ui/InlineError.tsx
import { AlertCircle } from "lucide-react";

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-2 text-red-400 text-sm mt-1.5"
    >
      <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

// Usage in forms:
// <InlineError message={errors.businessName} />
```

### 5.5 Toast Notifications for API Feedback

```tsx
// src/components/ui/Toast.tsx
// Use for non-blocking success and error feedback after API calls
// Recommended library: sonner (already compatible with Next.js App Router)

// Installation: npm install sonner
// In layout.tsx: <Toaster position="bottom-right" theme="dark" />

import { toast } from "sonner";

// Success
toast.success("Website published successfully.", {
  description: "Your site is now live.",
  action: { label: "View site", onClick: () => window.open(siteUrl) },
});

// Error
toast.error("Image generation failed.", {
  description: "Please try again or upload an image manually.",
});

// Warning (usage limits)
toast.warning("You're approaching your image limit.", {
  description: "8 of 15 images used this month.",
  action: { label: "Upgrade", onClick: () => router.push("/pricing") },
});

// Loading (for long operations)
const toastId = toast.loading("Generating your website...");
// Later:
toast.dismiss(toastId);
toast.success("Website ready!");
```

---

## 6. THIRD-PARTY API ERROR HANDLING

### 6.1 Gemini API Errors

```typescript
// src/lib/errors/gemini-errors.ts

export type GeminiErrorType =
  | "INVALID_ARGUMENT"     // Bad prompt or parameters
  | "PERMISSION_DENIED"    // API key issue
  | "RESOURCE_EXHAUSTED"   // Quota exceeded
  | "INTERNAL"             // Google server error
  | "UNAVAILABLE"          // Google service unavailable
  | "TIMEOUT"              // Request timed out
  | "SAFETY_BLOCK"         // Content blocked by safety filter
  | "JSON_PARSE_FAILURE";  // Response was not valid JSON

export async function handleGeminiError(
  err: unknown,
  context: string
): Promise<{ shouldRetry: boolean; fallback?: string }> {
  const errMessage = String(err);

  // Safety filter block — do NOT retry with same prompt
  if (errMessage.includes("SAFETY") || errMessage.includes("blocked")) {
    console.warn(`[Gemini] Safety block in ${context}`);
    return { shouldRetry: false };
  }

  // Quota exceeded — back off
  if (errMessage.includes("RESOURCE_EXHAUSTED") || errMessage.includes("429")) {
    console.warn(`[Gemini] Quota exceeded in ${context} — waiting 60s`);
    await new Promise(r => setTimeout(r, 60000));
    return { shouldRetry: true };
  }

  // Timeout — retry once with same prompt
  if (errMessage.includes("AbortError") || errMessage.includes("timeout")) {
    console.warn(`[Gemini] Timeout in ${context} — retrying once`);
    return { shouldRetry: true };
  }

  // JSON parse failure — retry with stricter prompt instruction
  if (errMessage.includes("JSON") || errMessage.includes("parse")) {
    console.warn(`[Gemini] JSON parse failure in ${context} — retrying with stricter prompt`);
    return { shouldRetry: true };
  }

  // Server error — retry with backoff
  if (errMessage.includes("INTERNAL") || errMessage.includes("500")) {
    await new Promise(r => setTimeout(r, 5000));
    return { shouldRetry: true };
  }

  // Unknown — do not retry
  console.error(`[Gemini] Unknown error in ${context}:`, err);
  return { shouldRetry: false };
}
```

### 6.2 Gemini JSON Retry Pattern

```typescript
// src/lib/gemini.ts — enhanced with retry logic

export async function geminiJSON<T>(
  prompt: string,
  model: "flash" | "pro",
  maxRetries: number = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await geminiGenerate(
        attempt > 1
          ? prompt + "\n\nCRITICAL: Your previous response was not valid JSON. Output ONLY valid JSON. No markdown. No explanation. Start with { and end with }."
          : prompt,
        model === "pro" ? "gemini-1.5-pro" : "gemini-1.5-flash"
      );

      const cleaned = response
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      return JSON.parse(cleaned) as T;

    } catch (err) {
      lastError = err;
      const { shouldRetry } = await handleGeminiError(err, `geminiJSON attempt ${attempt}`);
      if (!shouldRetry || attempt === maxRetries) break;
      await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
    }
  }

  throw new Error(`geminiJSON failed after ${maxRetries} attempts: ${String(lastError)}`);
}
```

### 6.3 Flutterwave Errors

| Error Scenario | Detection | Action |
|---|---|---|
| Initiation API error | `response.status !== 200` | Log + return 502 to client |
| Payment cancelled by user | `status=cancelled` in callback | No state change, redirect to /pricing?payment=cancelled |
| Verification mismatch | Amounts/metadata don't match | Log fraud attempt, return 403 |
| Webhook signature invalid | `verif-hash` doesn't match | Return 401, log security event |
| Duplicate transaction | `transaction_id` already in payment_history | Return 200, skip processing |
| Webhook processing error | Any throw in webhook handler | Return 200 (prevent Flutterwave retries), log for manual fix |
| Currency mismatch | Amount in wrong currency | Log, reject, email support |
| Network timeout to Flutterwave | AbortError | Return 502 "Payment service temporarily unavailable" |

### 6.4 Resend Email Errors

```typescript
// src/lib/email/resend.ts — error handling additions

export async function sendEmail(params: SendEmailParams): Promise<void> {
  try {
    if (!isValidEmail(params.to)) {
      console.warn(`[Resend] Skipping invalid email: ${params.to.slice(0, 3)}***`);
      return; // Don't throw — silently skip
    }

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      // Classify Resend errors
      if (error.name === "validation_error") {
        console.error(`[Resend] Validation error for ${params.template}:`, error.message);
        // Email address issue — don't retry
        return;
      }

      if (error.name === "rate_limit_exceeded") {
        console.warn(`[Resend] Rate limited — will retry in 60s`);
        await new Promise(r => setTimeout(r, 60000));
        await resend.emails.send({ from: FROM_ADDRESS, to: params.to, subject: params.subject, html: params.html, text: params.text });
        return;
      }

      // Other errors — log but don't crash
      console.error(`[Resend] Send failed for template ${params.template}:`, error);
    }
  } catch (err) {
    // Email failures MUST NOT propagate — log and continue
    console.error(`[Resend] Unexpected error:`, err);
  }
}
```

### 6.5 Unsplash / Pexels Errors

| Scenario | Detection | Fallback |
|---|---|---|
| API key invalid | `401` status | Log critical error (bad config), return archetype fallback |
| Rate limit hit | `403` status or `x-ratelimit-remaining: 0` | Fall through to Pexels immediately |
| No results for query | `results.length === 0` | Try simplified query (first 2 words only), then fallback |
| Network timeout | `AbortError` | Fall through to next source |
| Pexels also fails | Both sources return null | Use archetype fallback image (never return null) |

### 6.6 Meta Business API Errors

| Scenario | HTTP Status | Action |
|---|---|---|
| Token expired | `190` error code | Mark connection as expired, notify user |
| Insufficient permissions | `200` (different error) | Show "permissions missing" in UI, guide reconnection |
| Rate limit | `4` error code | Skip this sync cycle, retry next cron run |
| Account deactivated | `368` error code | Mark connection as disconnected, notify user |
| Page not found | `803` error code | User disconnected the page, prompt reconnect |
| General API error | Any 5xx | Log, skip, retry next cycle |

### 6.7 Google Search Console Errors

| Scenario | Action |
|---|---|
| OAuth token expired | Refresh using stored refresh token; if refresh fails, mark as expired |
| Refresh token invalid | Mark connection as expired, notify user to reconnect |
| Site not verified | Update status to `site_not_verified`, show setup guide |
| Quota exceeded | Skip this sync cycle |
| Site returns no data (new site) | Store empty snapshot, show "No data yet" in UI |

### 6.8 Vercel API Errors

| Scenario | Action |
|---|---|
| Domain already in project | Return success (idempotent — already configured) |
| Invalid domain format | Return 400 with validation error |
| Team plan required | Return 403 "Contact support to enable custom domains" |
| API token invalid | Log critical error — admin must fix |
| Rate limited | Retry after 60s |

---

## 7. GENERATION PIPELINE ERRORS

### 7.1 Website Generation — Complete Error Matrix

| Stage | Failure | Recovery Strategy | User Experience |
|---|---|---|---|
| Pass 1 (Structure) | Gemini returns invalid JSON | Retry up to 3x with stricter prompt | Silent |
| Pass 1 | All 3 retries fail | Mark job as failed | Dashboard shows "Generation failed" + retry button |
| Pass 2 (Copy) | Gemini timeout | Retry once | Silent |
| Pass 2 | Placeholder text detected | Retry once with explicit "no placeholders" instruction | Silent |
| Pass 2 | All retries fail | Use archetype default copy template (static, pre-written) | Dashboard shows "Needs review" badge |
| Pass 3 (Critique) | Gemini fails | Skip critique, save composition as-is with `needs_review = true` | Silent |
| Patch application | Gemini fails | Save composition without patches, `needs_review = true` | Silent |
| Validation | Errors found | Save with `needs_review = true`, don't block | Dashboard shows "Needs review" badge |
| Image resolver | All sources fail | Use archetype fallback image | Image shows fallback |
| DB save | Supabase error | Retry once; if fails, throw — job marked as failed | "Generation failed" card |
| Job timeout (>90s) | Job still "processing" | Cron marks as timed out after 5 min | "Taking longer than usual" notification |

### 7.2 Stuck Job Detection Cron

```typescript
// src/app/api/cron/detect-stuck-jobs/route.ts
// Runs every 10 minutes

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // Find jobs stuck in "processing" state for more than 5 minutes
  const { data: stuckJobs } = await supabase
    .from("website_generation_jobs")
    .select("id, user_id, retry_count")
    .eq("status", "processing")
    .lt("updated_at", fiveMinutesAgo);

  for (const job of stuckJobs ?? []) {
    if ((job.retry_count ?? 0) < 2) {
      // Re-queue for retry
      await supabase.from("website_generation_jobs").update({
        status: "queued",
        retry_count: (job.retry_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);

      // Re-trigger generation
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/compose-website`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET!,
        },
        body: JSON.stringify({ userId: job.user_id, jobId: job.id }),
      }).catch(() => {});
    } else {
      // Max retries reached — mark as failed
      await supabase.from("website_generation_jobs").update({
        status: "failed",
        error_message: "Job timed out after maximum retries",
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);

      await createNotification({
        userId: job.user_id,
        type: "website_generation_failed",
        title: "Website generation failed",
        body: "We couldn't generate your website after multiple attempts. Please try again from your dashboard.",
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        actionLabel: "Retry",
      });
    }
  }

  return NextResponse.json({ processed: stuckJobs?.length ?? 0 });
}
```

Add to vercel.json crons:
```json
{ "path": "/api/cron/detect-stuck-jobs", "schedule": "*/10 * * * *" }
```

### 7.3 Content Generation — Error Handling

| Error | Gemini Flash fails | Gemini Pro fails |
|---|---|---|
| Caption | Retry once; if fails, return empty caption with user message | N/A |
| Image prompt | Retry once; if fails, use generic archetype image prompt | N/A |
| Imagen | Retry with simplified prompt; if blocked, skip image | N/A |
| Blog post | Retry once; if fails, return error | Retry with Flash as fallback |
| Newsletter | Retry once; if fails, return error | Retry with Flash as fallback |
| Video script | Retry once; if fails, return partial script | N/A |

---

## 8. AUTHENTICATION AND SESSION ERRORS

### 8.1 Session Expiry During Active Use

```typescript
// src/lib/auth/session-monitor.ts
"use client";

// Detects session expiry while user is actively using the app
export function useSessionMonitor() {
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED" && !session) {
          // Session expired while user was active
          // Don't hard redirect — show a modal
          showSessionExpiredModal();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);
}

// Session expired modal — user can re-authenticate without losing their place
function showSessionExpiredModal() {
  // Show a modal with: "Your session has expired. Sign in again to continue."
  // Two options: [Sign in] (opens auth modal) [Dismiss] (continues in read-only mode)
}
```

### 8.2 Multi-Tab Sign-Out

When the user signs out in one tab, all other tabs should detect this and show the session expired modal rather than making API calls that will fail.

```typescript
// Handled by the onAuthStateChange listener above
// The SIGNED_OUT event fires across all tabs in the same browser
```

---

## 9. PAYMENT AND SUBSCRIPTION ERRORS

### 9.1 Mid-Session Plan Downgrade Detection

When a user's plan changes (e.g. payment fails → grace period → downgrade), the app must detect this without requiring a page refresh.

```typescript
// src/hooks/use-subscription-monitor.ts
"use client";

export function useSubscriptionMonitor() {
  const [planChanged, setPlanChanged] = useState(false);
  const { planId, isLoading } = useSubscription();

  useEffect(() => {
    // Check subscription status every 5 minutes while the app is open
    const interval = setInterval(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("subscriptions")
        .select("plan_id, status")
        .single();

      if (data && data.plan_id !== planId) {
        setPlanChanged(true);
        // Show a non-blocking banner: "Your plan has changed. Refresh to see updated features."
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [planId]);

  return { planChanged };
}
```

### 9.2 Feature Access During Grace Period

During a 3-day grace period after payment failure:
- **Keep access**: All existing features continue to work
- **Block new upgrades**: Cannot start new payment flows (would create confusion)
- **Show banner**: Persistent warning banner across all dashboard pages
- **Never hard-block**: User can still access and edit their work

```tsx
// src/components/app/GracePeriodBanner.tsx
export function GracePeriodBanner({ gracePeriodEnd }: { gracePeriodEnd: string }) {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-sm text-amber-400 flex items-center justify-between">
      <span>Your payment failed. Update your payment method by {gracePeriodEnd} to keep your access.</span>
      <Link href="/settings/billing" className="text-amber-300 underline ml-4 whitespace-nowrap">
        Update payment
      </Link>
    </div>
  );
}
```

---

## 10. FEATURE GATE ERRORS

### 10.1 Standard Upgrade Prompt Component

Used everywhere a feature is gated by plan. Never show a raw error — always show the upgrade prompt.

```tsx
// src/components/ui/UpgradePrompt.tsx
import { Lock, ArrowUpCircle } from "lucide-react";
import Link from "next/link";
import { PLAN_CONFIG } from "@/lib/payments/plans";

interface Props {
  feature: string;           // "Content calendar" — human-readable feature name
  requiredPlan: string;      // "growth"
  compact?: boolean;         // Show mini version inline vs full card
}

export function UpgradePrompt({ feature, requiredPlan, compact = false }: Props) {
  const plan = PLAN_CONFIG[requiredPlan as keyof typeof PLAN_CONFIG];

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-white/40">
        <Lock className="size-3" />
        {plan?.name ?? requiredPlan} plan
        <Link href="/pricing" className="text-gold underline ml-1">Upgrade</Link>
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center">
      <ArrowUpCircle className="size-8 text-gold mx-auto mb-3" />
      <h3 className="font-heading text-lg text-white mb-2">{feature}</h3>
      <p className="text-white/50 text-sm mb-4">
        This feature is available on the {plan?.name ?? requiredPlan} plan.
      </p>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 bg-gold text-background px-6 py-2.5 rounded-lg text-sm font-medium"
      >
        Upgrade to {plan?.name ?? requiredPlan}
      </Link>
    </div>
  );
}
```

---

## 11. FILE UPLOAD ERRORS

### 11.1 Drag-and-Drop Error Handling

```typescript
// All file upload components must handle these cases:

const FILE_ERRORS: Record<string, string> = {
  FILE_TOO_LARGE:    "File must be smaller than 10MB. Try compressing it first.",
  WRONG_TYPE:        "Only JPEG, PNG, and WebP images are supported.",
  MULTIPLE_FILES:    "Please upload one image at a time.",
  CORRUPTED:         "This file appears to be damaged. Try a different image.",
  UPLOAD_FAILED:     "Upload failed. Check your connection and try again.",
  STORAGE_FULL:      "You've reached your storage limit. Delete some files or upgrade your plan.",
};

// Validate before upload (client-side — fast feedback)
function validateFileClient(file: File): string | null {
  if (file.size > 10 * 1024 * 1024) return FILE_ERRORS.FILE_TOO_LARGE;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return FILE_ERRORS.WRONG_TYPE;
  if (file.size === 0) return FILE_ERRORS.CORRUPTED;
  return null; // Valid
}
```

---

## 12. REAL-TIME AND CONNECTIVITY ERRORS

### 12.1 Supabase Realtime Disconnection

```typescript
// src/hooks/use-notifications.ts — resilience additions

useEffect(() => {
  const supabase = createClient();

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on("postgres_changes", { /* ... */ }, handleNewNotification)
    .on("system", { event: "disconnect" }, () => {
      // Supabase Realtime disconnected — show a subtle indicator
      setIsRealtimeConnected(false);
    })
    .on("system", { event: "connected" }, () => {
      setIsRealtimeConnected(true);
      // Re-fetch notifications to catch any we missed during disconnect
      fetchNotifications();
    })
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.warn("Notification channel error — will auto-reconnect");
      }
    });

  // Supabase Realtime auto-reconnects — no manual intervention needed
  return () => { supabase.removeChannel(channel); };
}, [userId]);
```

### 12.2 Offline Detection

```tsx
// src/components/ui/OfflineBanner.tsx
"use client";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
                    bg-red-500/10 border border-red-500/20 text-red-400 text-sm
                    px-4 py-2 rounded-full backdrop-blur">
      <WifiOff className="size-4" />
      You're offline — changes won't save until you reconnect
    </div>
  );
}
```

---

## 13. DATABASE ERROR HANDLING

### 13.1 Supabase Error Classification

```typescript
// src/lib/errors/supabase-errors.ts

export function classifySupabaseError(error: { code?: string; message?: string }) {
  switch (error.code) {
    case "23505": // Unique constraint violation
      return { status: 409, message: "This value already exists. Please choose a different one." };
    case "23503": // Foreign key violation
      return { status: 400, message: "Referenced record not found." };
    case "23502": // Not null constraint
      return { status: 400, message: "A required field is missing." };
    case "23514": // Check constraint
      return { status: 400, message: "The value provided doesn't meet the requirements." };
    case "42P01": // Undefined table (migration not run)
      return { status: 500, message: "Database configuration error. Contact support." };
    case "PGRST301": // JWT expired
      return { status: 401, message: "Your session has expired. Please sign in again." };
    case "PGRST116": // Row not found (single() with no results)
      return { status: 404, message: "Not found." };
    default:
      return { status: 500, message: "A database error occurred." };
  }
}

// Usage in API routes:
const { data, error } = await supabase.from("profiles").select("*").single();
if (error) {
  const { status, message } = classifySupabaseError(error);
  console.error(`[DB Error ${error.code}]:`, error.message);
  return NextResponse.json({ error: message }, { status });
}
```

---

## 14. CRON JOB ERROR HANDLING

All cron jobs must:
1. Never throw uncaught errors
2. Process items in individual try/catch (one failure doesn't stop others)
3. Log all failures with the item's identifier
4. Return a summary of successes and failures

```typescript
// Standard cron job pattern:
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { processed: 0, failed: 0, errors: [] as string[] };

  // Fetch items to process
  const { data: items } = await supabase.from("...").select("*");

  for (const item of items ?? []) {
    try {
      await processItem(item);
      results.processed++;
    } catch (err) {
      results.failed++;
      results.errors.push(`${item.id}: ${String(err).slice(0, 100)}`);
      console.error(`[Cron] Failed to process ${item.id}:`, err);
      // Continue to next item — never break the loop on error
    }
  }

  // Log summary (visible in Vercel function logs)
  if (results.failed > 0) {
    console.error(`[Cron] Completed with ${results.failed} failures:`, results.errors);
  }

  return NextResponse.json(results);
}
```

---

## 15. ERROR LOGGING AND MONITORING

### 15.1 Structured Log Format

Every `console.error` in a production API route must follow this format:

```typescript
console.error(`[CONTEXT] [SEVERITY] Message`, {
  userId: user?.id,
  supportRef: ref,        // For user-facing 500 errors
  route: "/api/...",
  error: String(err),
  details: { /* relevant context */ },
});
```

### 15.2 Error Monitoring Setup (Production)

For the competition, use Vercel's built-in function logging (available in the Vercel dashboard under Logs).

For post-competition, add Sentry:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### 15.3 Admin Error Dashboard

A simple admin page at `/admin/errors` that shows:
- Recent 500 errors from audit_logs
- Failed generation jobs from website_generation_jobs
- Failed webhook events from webhook_events
- Expired OAuth connections (Meta, Search Console)

---

## 16. MAINTENANCE MODE

### 16.1 Maintenance Page

```tsx
// src/app/maintenance/page.tsx
// Serve this during planned maintenance by setting an env variable

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
      <img src="/Zuri_Logo.png" alt="Zuri" width={100} height={30} className="mb-8" />
      <h1 className="font-heading text-3xl text-white mb-4">Back shortly</h1>
      <p className="text-white/50 max-w-sm">
        We're making improvements to Zuri. We'll be back up in a few minutes.
        Follow <a href="https://twitter.com/ZuriHQ" className="text-gold">@ZuriHQ</a> for updates.
      </p>
    </div>
  );
}
```

```typescript
// In middleware.ts — check for maintenance mode
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";

if (MAINTENANCE_MODE) {
  // Allow admin access during maintenance
  const isAdminPath = req.nextUrl.pathname.startsWith("/admin");
  if (!isAdminPath) {
    return NextResponse.rewrite(new URL("/maintenance", req.url));
  }
}
```

---

## 17. COMPLETE VERCEL.JSON (WITH STUCK JOB CRON)

```json
{
  "crons": [
    { "path": "/api/cron/process-subscriptions",    "schedule": "0 23 * * *"    },
    { "path": "/api/cron/aggregate-analytics",       "schedule": "0 1 * * *"     },
    { "path": "/api/cron/sync-meta-insights",        "schedule": "0 3 * * *"     },
    { "path": "/api/cron/sync-search-console",       "schedule": "0 4 * * *"     },
    { "path": "/api/cron/purge-analytics",           "schedule": "0 2 * * *"     },
    { "path": "/api/cron/generate-monthly-reports",  "schedule": "0 6 1 * *"     },
    { "path": "/api/cron/weekly-digest",             "schedule": "0 7 * * 1"     },
    { "path": "/api/cron/content-reminders",         "schedule": "0 8 * * 1"     },
    { "path": "/api/cron/cultural-reminders",        "schedule": "0 8 * * *"     },
    { "path": "/api/cron/verify-custom-domains",     "schedule": "*/15 * * * *"  },
    { "path": "/api/cron/detect-stuck-jobs",         "schedule": "*/10 * * * *"  },
    { "path": "/api/cron/purge-rate-limits",         "schedule": "0 * * * *"     }
  ]
}
```

---

## 18. IMPLEMENTATION ORDER

1. `src/lib/errors/types.ts` — error type definitions
2. `src/lib/errors/messages.ts` — all user-facing messages
3. `src/lib/errors/supabase-errors.ts` — DB error classifier
4. `src/lib/errors/gemini-errors.ts` — Gemini error handler
5. `generateSupportRef()` helper function (add to existing utils)
6. `src/components/errors/ErrorBoundary.tsx`
7. `src/components/ui/InlineError.tsx`
8. `src/components/ui/UpgradePrompt.tsx`
9. `src/components/ui/OfflineBanner.tsx`
10. `src/components/app/GracePeriodBanner.tsx`
11. `src/app/error.tsx` — route segment error page
12. `src/app/not-found.tsx` — 404 page
13. `src/app/global-error.tsx` — root error page
14. `src/app/maintenance/page.tsx`
15. `src/hooks/use-api.ts` — API call hook
16. `src/hooks/use-session-monitor.ts`
17. `src/hooks/use-subscription-monitor.ts`
18. `src/app/api/cron/detect-stuck-jobs/route.ts`
19. `src/app/api/cron/purge-rate-limits/route.ts`
20. Add `MAINTENANCE_MODE` check to middleware
21. Wrap all major dashboard sections with `<ErrorBoundary>`
22. Add `<OfflineBanner />` to root layout
23. Add `<GracePeriodBanner />` to dashboard layout (conditional)
24. Install and configure `sonner` for toast notifications
25. Audit all existing API routes — ensure they follow the standard error handling template
26. Update `vercel.json` with stuck job and rate limit purge crons
