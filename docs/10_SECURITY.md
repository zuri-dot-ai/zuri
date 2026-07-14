# ZURI — SECURITY SYSTEM
# Complete specification for Row Level Security, authentication hardening,
# input validation, rate limiting, NDPA/GDPR compliance, prompt injection
# prevention, file security, audit logging, and account data management

---

## 1. SECURITY PHILOSOPHY

Security is non-negotiable and applied in layers. The order of priority:

1. **Authentication**: Who is making this request?
2. **Authorization**: Are they allowed to do this?
3. **Input validation**: Is the data they're sending safe?
4. **Rate limiting**: Are they abusing the system?
5. **Output sanitization**: Are we leaking anything sensitive back?

Every API route must handle all five layers in order, before executing any business logic. No exceptions.

---

## 2. AUTHENTICATION HARDENING

### 2.1 Supabase Auth Configuration

Set these in Supabase Dashboard → Authentication → Settings:

```
Email confirmations:          ENABLED
                              Users must verify email before accessing the app

Minimum password length:      8 characters
Password strength:            At least one uppercase, one number (configure via custom hook)

Secure email change:          ENABLED
                              Changing email requires confirmation from the new address

Session expiry:               604800 seconds (7 days)
Refresh token rotation:       ENABLED
JWT expiry:                   3600 seconds (1 hour)
Refresh token reuse interval: 10 seconds (prevent refresh token theft)

Rate limits (Supabase built-in):
  Sign-ins per hour:          30
  Sign-ups per hour:          30
  OTP per hour:               30
  Token refresh per 5 min:    30
```

### 2.2 Auth Route Protection Pattern

Every API route that requires authentication must follow this exact pattern. No deviations.

```typescript
// src/lib/auth/require-auth.ts

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { User } from "@supabase/supabase-js";

export async function requireAuth(): Promise<
  { user: User; error: null } | { user: null; error: NextResponse }
> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }

  return { user, error: null };
}

// Usage in every API route:
export async function POST(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error; // Return 401 immediately

  // ... rest of the route
}
```

### 2.3 Admin Authorization Pattern

```typescript
// src/lib/auth/require-admin.ts

export async function requireAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  // CRITICAL: Always check server-side. Never trust client-provided admin claims.
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  return data?.is_admin === true;
}

// Usage:
export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const supabase = await createClient();
  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // ... admin logic
}
```

### 2.4 Session Security in Middleware

```typescript
// src/middleware.ts (additions to existing middleware)

import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // ... existing subdomain routing code ...

  // Refresh session on every request to protected routes
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => res.cookies.set({ name, value, ...options }),
        remove: (name, options) => res.cookies.set({ name, value: "", ...options }),
      },
    }
  );

  // This refreshes the session if it's expired
  const { data: { session } } = await supabase.auth.getSession();

  // Protect dashboard routes — redirect to login if no session
  const isDashboardRoute = req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/onboarding") ||
    req.nextUrl.pathname.startsWith("/settings");

  if (isDashboardRoute && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from auth pages
  if (session && (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}
```

---

## 3. ROW LEVEL SECURITY — COMPLETE POLICY CATALOGUE

Every table in the database must have RLS enabled. This section is the authoritative reference for all RLS policies.

### 3.1 RLS Enablement and Policy Audit

```sql
-- Run this query to verify ALL tables have RLS enabled before going live:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Every row must show rowsecurity = true

-- Master RLS enablement (run for any table missing it):
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
ALTER TABLE [table_name] FORCE ROW LEVEL SECURITY;  -- Applies to table owner too
```

### 3.2 Complete Policy Definitions

```sql
-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No INSERT policy for profiles — created by trigger on auth.users
-- No DELETE policy — account deletion handled by admin/service role only

-- ============================================================
-- BUSINESS PROFILES
-- ============================================================
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY "business_profiles_all_own" ON business_profiles
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Writes only via service role (payments pipeline)
CREATE POLICY "subscriptions_service_all" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- USAGE TRACKING
-- ============================================================
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking FORCE ROW LEVEL SECURITY;

CREATE POLICY "usage_select_own" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usage_service_all" ON usage_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- PAYMENT HISTORY
-- ============================================================
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history FORCE ROW LEVEL SECURITY;

CREATE POLICY "payment_select_own" ON payment_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "payment_service_all" ON payment_history
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- WEBHOOK EVENTS (service role only — users cannot see raw webhooks)
-- ============================================================
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events FORCE ROW LEVEL SECURITY;

CREATE POLICY "webhook_service_only" ON webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- PLANS (public read — pricing is not secret)
-- ============================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read" ON plans
  FOR SELECT USING (true);

CREATE POLICY "plans_service_write" ON plans
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- WEBSITES
-- ============================================================
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites FORCE ROW LEVEL SECURITY;

-- Users manage their own website
CREATE POLICY "websites_all_own" ON websites
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Published websites are publicly readable (for rendering at handle.zuri.com)
-- IMPORTANT: This only exposes the composition_json — not user_id or other sensitive fields
-- Use a security definer function for this to control exposed columns
CREATE POLICY "websites_public_read_published" ON websites
  FOR SELECT USING (status = 'published');

-- Service role can do everything (for generation pipeline, cron jobs)
CREATE POLICY "websites_service_all" ON websites
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- WEBSITE GENERATION JOBS
-- ============================================================
ALTER TABLE website_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_generation_jobs FORCE ROW LEVEL SECURITY;

CREATE POLICY "gen_jobs_select_own" ON website_generation_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "gen_jobs_service_all" ON website_generation_jobs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- WEBSITE IMAGES
-- ============================================================
ALTER TABLE website_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_images FORCE ROW LEVEL SECURITY;

CREATE POLICY "website_images_all_own" ON website_images
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CONTACT SUBMISSIONS
-- ============================================================
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions FORCE ROW LEVEL SECURITY;

-- Website owners read their own submissions
CREATE POLICY "contact_select_owner" ON contact_submissions
  FOR SELECT USING (auth.uid() = website_owner_id);

-- Public insert (no auth required — website visitors submit forms)
CREATE POLICY "contact_public_insert" ON contact_submissions
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- CONTENT CALENDAR
-- ============================================================
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar FORCE ROW LEVEL SECURITY;

CREATE POLICY "calendar_all_own" ON content_calendar
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calendar_service_all" ON content_calendar
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- CONTENT PILLARS
-- ============================================================
ALTER TABLE content_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pillars FORCE ROW LEVEL SECURITY;

CREATE POLICY "pillars_all_own" ON content_pillars
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- GENERATED CONTENT
-- ============================================================
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content FORCE ROW LEVEL SECURITY;

CREATE POLICY "generated_all_own" ON generated_content
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CONTENT STRATEGY INSIGHTS
-- ============================================================
ALTER TABLE content_strategy_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_strategy_insights FORCE ROW LEVEL SECURITY;

CREATE POLICY "insights_select_own" ON content_strategy_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insights_service_all" ON content_strategy_insights
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- ANALYTICS TABLES (pageviews, events, daily aggregates)
-- ============================================================
ALTER TABLE website_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_pageviews FORCE ROW LEVEL SECURITY;
-- Public insert for tracking (no auth needed from websites)
CREATE POLICY "pageviews_public_insert" ON website_pageviews
  FOR INSERT WITH CHECK (true);
-- No direct user read — all analytics served via aggregated API routes (service role)
CREATE POLICY "pageviews_service_all" ON website_pageviews
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE website_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_events FORCE ROW LEVEL SECURITY;
CREATE POLICY "events_public_insert" ON website_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "events_service_all" ON website_events
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE website_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_analytics_daily FORCE ROW LEVEL SECURITY;
CREATE POLICY "analytics_daily_service_all" ON website_analytics_daily
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- META CONNECTIONS (encrypted tokens)
-- ============================================================
ALTER TABLE meta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_connections FORCE ROW LEVEL SECURITY;

-- Users can read their own connection STATUS but not the encrypted token
-- The encrypted token is never returned to the client — only service role
CREATE POLICY "meta_conn_select_own" ON meta_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "meta_conn_service_all" ON meta_connections
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- META INSIGHTS
-- ============================================================
ALTER TABLE meta_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_insights FORCE ROW LEVEL SECURITY;

CREATE POLICY "meta_insights_select_own" ON meta_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "meta_insights_service_all" ON meta_insights
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- SEARCH CONSOLE CONNECTIONS AND SNAPSHOTS
-- ============================================================
ALTER TABLE search_console_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_console_connections FORCE ROW LEVEL SECURITY;

CREATE POLICY "sc_conn_select_own" ON search_console_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sc_conn_service_all" ON search_console_connections
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE search_console_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_console_snapshots FORCE ROW LEVEL SECURITY;

CREATE POLICY "sc_snap_select_own" ON search_console_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sc_snap_service_all" ON search_console_snapshots
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- MONTHLY REPORTS
-- ============================================================
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports FORCE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own" ON monthly_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reports_service_all" ON monthly_reports
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- AGENCIES (public read — marketplace is public)
-- ============================================================
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies FORCE ROW LEVEL SECURITY;

CREATE POLICY "agencies_public_read" ON agencies
  FOR SELECT USING (is_active = true);

CREATE POLICY "agencies_admin_all" ON agencies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- AGENCY INQUIRIES
-- ============================================================
ALTER TABLE agency_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_inquiries FORCE ROW LEVEL SECURITY;

CREATE POLICY "inquiries_all_own" ON agency_inquiries
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "inquiries_admin_read" ON agency_inquiries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- AGENCY APPLICATIONS (admin only)
-- ============================================================
ALTER TABLE agency_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_applications FORCE ROW LEVEL SECURITY;

CREATE POLICY "applications_public_insert" ON agency_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "applications_admin_all" ON agency_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY "notifications_all_own" ON notifications
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_service_insert" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;

CREATE POLICY "notif_prefs_all_own" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- EMAIL SEND LOG (internal only)
-- ============================================================
ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_send_log FORCE ROW LEVEL SECURITY;

CREATE POLICY "email_log_service_only" ON email_send_log
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- TRENDING TOPICS CACHE (service role only)
-- ============================================================
ALTER TABLE trending_topics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics_cache FORCE ROW LEVEL SECURITY;

CREATE POLICY "trends_cache_service_only" ON trending_topics_cache
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- AUDIT LOGS (see Section 11)
-- ============================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- Users can read their own audit trail (good for transparency)
CREATE POLICY "audit_select_own" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role writes audit logs
CREATE POLICY "audit_service_insert" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "audit_admin_all" ON audit_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
```

---

## 4. INPUT VALIDATION — COMPREHENSIVE RULES

### 4.1 Master Sanitization Functions

```typescript
// src/lib/utils/sanitize.ts — COMPLETE FILE

// Strip all HTML tags and dangerous characters from user text
export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .normalize("NFC")                           // Unicode normalization — prevents homograph attacks
    .trim()
    .replace(/<[^>]*>/g, "")                   // Strip HTML tags
    .replace(/javascript:/gi, "")              // Strip JS protocol
    .replace(/on\w+\s*=/gi, "")               // Strip event handlers
    .replace(/data:\s*text\/html/gi, "")       // Strip data URIs
    .replace(/\0/g, "")                        // Strip null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")  // Strip control characters
    .replace(/\s+/g, " ")                      // Normalize whitespace
    .trim();
}

// Sanitize for use in AI prompts — additional layer on top of sanitizeText
export function sanitizeForPrompt(input: unknown): string {
  const clean = sanitizeText(input);
  return clean
    .replace(/ignore\s+(previous|all|any)\s+instructions?/gi, "")
    .replace(/you\s+are\s+now\s+/gi, "you are ")
    .replace(/disregard\s+(all\s+)?(previous|prior|above)/gi, "")
    .replace(/new\s+system\s+(prompt|instructions?)/gi, "")
    .replace(/\bDAN\s*(?:mode|prompt)?\b/gi, "")
    .replace(/\bjailbreak\b/gi, "")
    .replace(/act\s+as\s+(?:if|though)\s+you/gi, "")
    .replace(/pretend\s+(?:you\s+are|to\s+be)/gi, "")
    .replace(/override\s+(?:your|all)\s+/gi, "")
    .trim()
    .slice(0, 2000);                           // Hard cap on user text in prompts
}

// Sanitize a URL — validates and normalizes
export function sanitizeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const clean = input.trim();
  try {
    const url = new URL(clean);
    // Only allow http and https — no javascript:, data:, ftp:, etc.
    if (!["http:", "https:"].includes(url.protocol)) return null;
    // Block localhost and private IPs (SSRF prevention)
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.startsWith("172.16.") ||
      host === "0.0.0.0" ||
      host.endsWith(".local")
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
}

// Sanitize a handle
export function sanitizeHandle(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

// Sanitize a phone number — digits, spaces, +, (, ) only
export function sanitizePhone(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().replace(/[^0-9\s+().-]/g, "").slice(0, 20);
}

// Sanitize a hex color
export function sanitizeColor(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const clean = input.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) return clean.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) return clean.toUpperCase();
  return null;
}

// Detect if input is only emojis (no real text content)
export function isOnlyEmoji(str: string): boolean {
  const withoutEmoji = str
    .replace(/\p{Emoji_Presentation}/gu, "")
    .replace(/\p{Emoji}\uFE0F/gu, "")
    .trim();
  return withoutEmoji.length === 0 && str.trim().length > 0;
}

// Validate email
export function isValidEmail(email: string): boolean {
  // RFC 5322 simplified — good enough for registration
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(email);
}

// Validate domain format
export function isValidDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(domain.toLowerCase());
}
```

### 4.2 Field-Level Validation Reference

Every user-facing field across the entire application with its validation rules.

| Field | Min | Max | Allowed | Blocked |
|---|---|---|---|---|
| First name (profile) | 2 chars | 50 chars | Letters, accented chars | Numbers, special chars, emojis only, HTML |
| Business name | 2 chars | 80 chars | Letters, numbers, spaces, `'`, `-`, `&`, `.` | HTML, scripts, emoji-only, numbers-only |
| Handle | 3 chars | 30 chars | `a-z`, `0-9`, `-` | Uppercase (auto-lowered), special chars, consecutive hyphens, reserved words |
| Service tag | 2 chars | 50 chars | Letters, numbers, spaces, `-`, `&`, `/` | HTML, scripts |
| Tagline | 4 words | 10 words | Free text | HTML, scripts, placeholder patterns |
| Location city | 2 chars | 40 chars | Letters, spaces, `-` | Numbers, special chars |
| Brand description | 20 chars | 500 chars | Free text | HTML, scripts, SQL keywords as sole content |
| Website section text | 1 char | Per block schema max | Free text | HTML (stripped), scripts |
| CTA text | 2 chars | 40 chars (8 words max) | Free text | HTML |
| SEO title | 10 chars | 60 chars | Free text | HTML |
| SEO description | 50 chars | 155 chars | Free text | HTML |
| Calendar topic | 5 chars | 200 chars | Free text | HTML, emoji-only |
| Blog/newsletter content | 50 chars | Unlimited (Gemini-generated) | Free text | Placeholder patterns |
| Hashtag | `#` + 2 chars | 30 chars | Letters, numbers (after `#`) | Spaces, special chars |
| Domain name | — | 253 chars | `a-z0-9`, `-`, `.` | Protocols, paths, IP addresses, private IPs |
| URL (portfolio, social) | — | 2000 chars | Valid HTTP/HTTPS URLs | JS protocol, data URIs, private IPs |
| Phone number | 7 chars | 20 chars | Digits, `+`, `(`, `)`, spaces, `.`, `-` | Letters, special chars |
| Color (hex) | 4 chars (`#xxx`) | 7 chars (`#xxxxxx`) | `#` + hex chars | Non-hex characters |
| Agency inquiry message | 10 chars | 1000 chars | Free text | HTML, emoji-only, >2 URLs (spam signal) |
| Password | 8 chars | 128 chars | Any printable | No restrictions (let users use strong passwords) |
| File name | — | — | Never use original — always UUID | — |

### 4.3 Server-Side Validation Pattern

```typescript
// src/lib/utils/validate.ts

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateRequired(
  value: unknown,
  fieldName: string
): ValidationResult {
  const str = sanitizeText(value);
  if (!str) return { valid: false, error: `${fieldName} is required.` };
  return { valid: true };
}

export function validateLength(
  value: string,
  fieldName: string,
  min: number,
  max: number
): ValidationResult {
  if (value.length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters.` };
  }
  if (value.length > max) {
    return { valid: false, error: `${fieldName} must be ${max} characters or fewer.` };
  }
  return { valid: true };
}

export function validateNoPlaceholder(
  value: string,
  fieldName: string
): ValidationResult {
  const patterns = [/lorem ipsum/i, /\[.*?\]/, /placeholder/i, /example\.com/i];
  for (const pattern of patterns) {
    if (pattern.test(value)) {
      return { valid: false, error: `${fieldName} contains placeholder text.` };
    }
  }
  return { valid: true };
}

// Collect all validation errors before returning (better UX than stopping at first error)
export function collectErrors(
  checks: Array<() => ValidationResult>
): string[] {
  return checks
    .map(check => check())
    .filter(r => !r.valid)
    .map(r => (r as { valid: false; error: string }).error);
}
```

---

## 5. RATE LIMITING

### 5.1 Rate Limit Implementation

```typescript
// src/lib/security/rate-limit.ts

interface RateLimitConfig {
  limit: number;         // Max requests
  windowSeconds: number; // Time window
}

// Rate limit definitions per endpoint category
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth (supplements Supabase built-in limits)
  "auth:signup":               { limit: 5,   windowSeconds: 3600  },
  "auth:login":                { limit: 10,  windowSeconds: 900   },
  "auth:reset_password":       { limit: 3,   windowSeconds: 3600  },

  // Onboarding
  "onboarding:complete":       { limit: 3,   windowSeconds: 3600  },
  "handle:check":              { limit: 60,  windowSeconds: 60    },

  // AI Generation (expensive — rate limit tightly)
  "generation:website":        { limit: 3,   windowSeconds: 3600  },
  "generation:content":        { limit: 10,  windowSeconds: 60    },
  "generation:image":          { limit: 20,  windowSeconds: 3600  },
  "generation:blog":           { limit: 5,   windowSeconds: 3600  },

  // Website operations
  "website:publish":           { limit: 10,  windowSeconds: 3600  },
  "website:custom_domain_add": { limit: 5,   windowSeconds: 3600  },

  // Analytics tracking (per IP, per handle)
  "analytics:track":           { limit: 30,  windowSeconds: 60    },

  // Forms
  "contact_form:submit":       { limit: 5,   windowSeconds: 3600  },
  "agency:inquire":            { limit: 10,  windowSeconds: 86400 },
  "agency:apply":              { limit: 1,   windowSeconds: 86400 },

  // General API
  "api:general":               { limit: 120, windowSeconds: 60    },
  "api:ai":                    { limit: 20,  windowSeconds: 60    },

  // Admin
  "admin:general":             { limit: 200, windowSeconds: 60    },
};

export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,        // e.g. user_id or ip_address
  category: string
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const config = RATE_LIMITS[category] ?? RATE_LIMITS["api:general"];
  const windowStart = new Date(Date.now() - config.windowSeconds * 1000).toISOString();

  const { count } = await supabase
    .from("rate_limit_log")
    .select("id", { count: "exact" })
    .eq("key", `${category}:${key}`)
    .gte("created_at", windowStart);

  const used = count ?? 0;
  const allowed = used < config.limit;

  if (allowed) {
    // Log this request
    await supabase.from("rate_limit_log").insert({
      key: `${category}:${key}`,
      category,
    });
  }

  return {
    allowed,
    remaining: Math.max(0, config.limit - used - 1),
    resetIn: config.windowSeconds,
  };
}

// Helper: standardized rate limit response
export function rateLimitExceededResponse(resetIn: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please wait and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(resetIn),
        "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + resetIn),
      },
    }
  );
}
```

### 5.2 Rate Limit Database Table

```sql
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,          -- category:identifier (e.g. "api:general:user_id_123")
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rate_limit_key_time ON rate_limit_log(key, created_at DESC);

-- Auto-purge old rate limit records every hour (keep table small)
CREATE OR REPLACE FUNCTION purge_old_rate_limits()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM rate_limit_log WHERE created_at < now() - interval '2 hours';
END;
$$;
```

---

## 6. SECURITY HEADERS

### 6.1 Next.js Config Headers

```typescript
// next.config.ts

const securityHeaders = [
  // HSTS — force HTTPS for 2 years, include subdomains
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Prevent MIME type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Control referrer information
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Disable browser features we don't use
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  // DNS prefetch for performance
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Scripts: self + Flutterwave payment SDK
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.flutterwave.com https://api.flutterwave.com",
      // Note: 'unsafe-inline' required for Next.js inline scripts; 'unsafe-eval' for Next.js dev
      // In production, replace with nonces when Next.js supports it fully

      // Styles: self + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

      // Fonts: self + Google Fonts CDN
      "font-src 'self' https://fonts.gstatic.com",

      // Images: self + data URIs + stock photo CDNs + Supabase storage + Google AI (Imagen)
      "img-src 'self' data: blob: https://images.unsplash.com https://images.pexels.com https://*.supabase.co https://*.supabase.in https://generativelanguage.googleapis.com",

      // Connections: self + all external APIs
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.flutterwave.com https://checkout.flutterwave.com https://api.unsplash.com https://api.pexels.com https://generativelanguage.googleapis.com https://api.resend.com https://graph.facebook.com https://searchconsole.googleapis.com https://api.vercel.com",

      // Frames: Flutterwave checkout + Meta OAuth
      "frame-src https://checkout.flutterwave.com https://www.facebook.com",

      // Media: self + blob
      "media-src 'self' blob: https://*.supabase.co",

      // Objects: none
      "object-src 'none'",

      // Base URI: self only
      "base-uri 'self'",

      // Form actions: self only
      "form-action 'self'",

      // Upgrade insecure requests
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Analytics tracking endpoint — allow cross-origin POST from user websites
        source: "/api/analytics/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
      {
        // Contact form endpoint — allow cross-origin POST from user websites
        source: "/api/contact-form",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};
```

---

## 7. FILE UPLOAD SECURITY

```typescript
// src/lib/security/file-validation.ts

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Magic byte signatures for image validation
const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xFF, 0xD8, 0xFF],
  "image/png":  [0x89, 0x50, 0x4E, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],  // "RIFF"
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}

export async function validateUploadedFile(file: File): Promise<FileValidationResult> {
  // 1. Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "File must be smaller than 10MB." };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty." };
  }

  // 2. Check declared MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: "Only JPEG, PNG, and WebP images are allowed." };
  }

  // 3. Verify magic bytes (prevent MIME type spoofing)
  const headerBytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const expectedBytes = MAGIC_BYTES[file.type];

  if (expectedBytes && !expectedBytes.every((byte, i) => headerBytes[i] === byte)) {
    return {
      valid: false,
      error: "File does not match the declared image type. Please upload a valid image.",
    };
  }

  // 4. Generate safe filename (UUID-based — never use original filename)
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const sanitizedName = `${crypto.randomUUID()}.${extension}`;

  return { valid: true, sanitizedName };
}

// Safe upload path generator — prevents path traversal
export function generateStoragePath(userId: string, context: string, filename: string): string {
  // Sanitize each component
  const safeUserId = userId.replace(/[^a-z0-9-]/gi, "");
  const safeContext = context.replace(/[^a-z0-9-_]/g, "").slice(0, 30);
  const safeFilename = filename.replace(/[^a-z0-9.-]/g, "").slice(0, 50);

  // Never allow .. or / in any component
  if ([safeUserId, safeContext, safeFilename].some(s => s.includes("..") || s.includes("/"))) {
    throw new Error("Invalid storage path component");
  }

  return `${safeUserId}/${safeContext}/${safeFilename}`;
}
```

---

## 8. WEBHOOK SECURITY

```typescript
// src/lib/security/webhook-verify.ts

// Flutterwave webhook verification
export function verifyFlutterwaveWebhook(
  req: Request,
  payload: unknown
): boolean {
  const signature = req.headers.get("verif-hash");
  if (!signature || !process.env.FLUTTERWAVE_WEBHOOK_HASH) return false;

  // Flutterwave uses a simple secret hash comparison (not HMAC)
  return signature === process.env.FLUTTERWAVE_WEBHOOK_HASH;
}

// Generic HMAC webhook verification (for future integrations)
export async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = "SHA-256"
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"]
  );

  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  const expectedSig = Buffer.from(sigBuffer).toString("hex");
  const receivedSig = signature.replace(/^sha256=/, "");

  // Timing-safe comparison
  return timingSafeEqual(Buffer.from(expectedSig), Buffer.from(receivedSig));
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}
```

---

## 9. AUDIT LOGGING

```typescript
// src/lib/security/audit.ts

export type AuditAction =
  | "auth.signup"
  | "auth.login"
  | "auth.logout"
  | "auth.password_reset"
  | "account.delete_requested"
  | "account.delete_confirmed"
  | "handle.changed"
  | "website.published"
  | "website.unpublished"
  | "website.deleted"
  | "custom_domain.added"
  | "custom_domain.removed"
  | "subscription.upgraded"
  | "subscription.downgraded"
  | "subscription.cancelled"
  | "payment.successful"
  | "payment.failed"
  | "admin.agency_approved"
  | "admin.agency_rejected"
  | "security.rate_limit_exceeded"
  | "security.invalid_webhook_signature"
  | "security.unauthorized_admin_attempt";

export async function createAuditLog(
  supabase: SupabaseClient,
  userId: string | null,
  action: AuditAction,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  req?: Request
): Promise<void> {
  try {
    const ip = req
      ? (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null)
      : null;

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      resource_type: resourceType ?? null,
      resource_id: resourceId ?? null,
      details: details ?? null,
      ip_address: ip ? anonymizeIp(ip) : null,
    });
  } catch (err) {
    // Audit logging failure must never crash the app
    console.error("Audit log creation failed:", err);
  }
}
```

```sql
-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb,
  ip_address text,    -- Already anonymized before insert
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- Keep audit logs for 2 years (legal requirement)
-- No auto-purge — manual review only
```

---

## 10. NDPA COMPLIANCE (Nigeria Data Protection Act 2023)

### 10.1 What Zuri Must Have

| Requirement | Implementation |
|---|---|
| Privacy Policy | `/privacy` page — explains all data collected, third parties, retention, rights |
| Terms of Service | `/terms` page — usage rules, prohibited conduct, liability |
| Lawful basis | Legitimate interest (providing the service), contract performance |
| Consent at signup | Checkbox: "I agree to the [Terms of Service] and [Privacy Policy]" |
| Right to access | User can view all their data from Settings → Account → My Data |
| Right to erasure | Account deletion flow (Section 11 below) |
| Right to portability | Data export feature (Section 12 below) |
| Data minimization | Only collect what's needed for the service (no tracking beyond analytics) |
| Third-party disclosure | Privacy policy lists: Supabase, Vercel, Resend, Flutterwave, Google, Meta |
| Breach notification | Internal procedure: detect, contain, notify NITDA within 72h |
| Data retention | Per-plan limits for analytics; account data retained until deletion |

### 10.2 Consent at Signup

```tsx
// src/app/(auth)/signup/page.tsx — add this to the signup form

<div className="flex items-start gap-3 mt-4">
  <input
    type="checkbox"
    id="terms_consent"
    required
    className="mt-0.5 accent-gold"
  />
  <label htmlFor="terms_consent" className="text-sm text-white/60">
    I agree to Zuri's{" "}
    <Link href="/terms" className="text-gold underline">Terms of Service</Link>
    {" "}and{" "}
    <Link href="/privacy" className="text-gold underline">Privacy Policy</Link>.
    I understand that my data will be processed as described.
  </label>
</div>
```

Store consent in the database:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_version text DEFAULT '1.0';
```

### 10.3 Data Subject Rights API

```typescript
// src/app/api/account/my-data/route.ts
// GET — returns a downloadable JSON of all the user's data

export async function GET(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const supabase = await createClient();

  // Collect all user data
  const [profile, brand, website, calendar, content, payments, inquiries] =
    await Promise.all([
      supabase.from("profiles").select("full_name, handle, agency_discoverable, created_at").eq("id", user.id).single(),
      supabase.from("business_profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("websites").select("handle, status, archetype, published_at, custom_domain").eq("user_id", user.id).single(),
      supabase.from("content_calendar").select("platform, topic, scheduled_date, status").eq("user_id", user.id),
      supabase.from("generated_content").select("platform, format_type, created_at").eq("user_id", user.id),
      supabase.from("payment_history").select("plan_id, amount, status, billing_cycle, created_at").eq("user_id", user.id),
      supabase.from("agency_inquiries").select("agency_id, service_needed, status, created_at").eq("user_id", user.id),
    ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    export_version: "1.0",
    notice: "This is all personal data Zuri holds about you. Amounts are in Nigerian Naira (NGN).",
    account: { email: user.email, ...profile.data },
    business_profile: brand.data,
    website: website.data,
    content_calendar: calendar.data ?? [],
    generated_content_count: content.data?.length ?? 0,
    payment_history: payments.data ?? [],
    agency_inquiries: inquiries.data ?? [],
  };

  const json = JSON.stringify(exportData, null, 2);

  await createAuditLog(supabase, user.id, "auth.login"); // Reuse for data export — or add a specific action

  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="zuri-my-data-${Date.now()}.json"`,
    },
  });
}
```

---

## 11. ACCOUNT DELETION

### 11.1 Full Account Deletion Flow

```typescript
// src/app/api/account/delete/route.ts

export async function DELETE(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const supabase = await createClient();
  const { confirm, immediate } = await req.json();

  if (confirm !== "DELETE MY ACCOUNT") {
    return NextResponse.json({
      error: "Please type 'DELETE MY ACCOUNT' to confirm.",
    }, { status: 400 });
  }

  // 1. Cancel active subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("user_id", user.id)
    .single();

  if (sub?.status === "active" && sub.plan_id !== "free") {
    // Cancel in Flutterwave (if subscription ID stored)
    // ... cancellation logic ...
    await supabase.from("subscriptions").update({
      status: "cancelled",
      cancel_at_period_end: true,
    }).eq("user_id", user.id);
  }

  // 2. Unpublish all websites
  await supabase.from("websites").update({
    status: "deleted",
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id);

  // 3. Remove from Vercel (custom domains)
  const { data: website } = await supabase
    .from("websites")
    .select("custom_domain")
    .eq("user_id", user.id)
    .single();

  if (website?.custom_domain) {
    await fetch(
      `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${website.custom_domain}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` } }
    ).catch(() => {}); // Don't fail deletion if Vercel call fails
  }

  // 4. Audit log (before deletion — user_id will become null after)
  await createAuditLog(
    createServiceClient(),
    user.id,
    "account.delete_confirmed",
    "user",
    user.id,
    { immediate }
  );

  // 5. Send confirmation email before deleting
  const { data: profile } = await supabase
    .from("profiles")
    .select("email: auth.users.email")
    .eq("id", user.id)
    .single();

  // 6. Delete auth user (cascades to all tables via foreign keys)
  // Using service role to delete from auth.users
  const adminSupabase = createServiceClient();
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("Account deletion failed:", deleteError);
    return NextResponse.json({
      error: "Account deletion failed. Please contact support at support@zuri.com.",
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Your account and all associated data have been permanently deleted.",
  });
}
```

---

## 12. RESPONSE SANITIZATION

Never return sensitive fields in API responses. Use explicit field selection.

```typescript
// src/lib/security/sanitize-response.ts

// Fields that must NEVER appear in any API response to the client
const BLOCKED_RESPONSE_FIELDS = new Set([
  "access_token_encrypted",
  "refresh_token_encrypted",
  "password",
  "password_hash",
  "is_admin",           // Never expose admin status to the client
  "anonymized_ip",
  "webhook_payload",
  "reviewer_notes",     // Admin-only
  "contact_email",      // Agency private email (use inquiry system instead)
  "token_expires_at",   // Internal
]);

export function sanitizeApiResponse<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!BLOCKED_RESPONSE_FIELDS.has(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized as Partial<T>;
}

// Standard error response — never leak internal details
export function errorResponse(
  status: number,
  publicMessage: string,
  internalDetails?: string
): NextResponse {
  if (internalDetails) {
    console.error(`[${status}] ${internalDetails}`);
  }
  return NextResponse.json({ error: publicMessage }, { status });
}
```

---

## 13. ERROR RESPONSE SECURITY STANDARDS

| Status | When to use | Message format | Never include |
|---|---|---|---|
| 400 | Invalid input | Specific field-level errors | Stack traces, SQL errors |
| 401 | No auth | "Authentication required." | Whether account exists |
| 403 | Auth but not allowed | "You don't have permission to do this." OR "Upgrade required." | User IDs, internal role names |
| 404 | Not found | "Not found." | Whether record exists for another user |
| 409 | Conflict | Context-specific safe message | Full DB constraint details |
| 422 | Validation failed | Field-level errors | Internal schema details |
| 429 | Rate limited | "Too many requests. Please wait and try again." | Rate limit internals |
| 500 | Internal error | "Something went wrong. Please try again." + support reference | Stack trace, env vars, DB errors |

```typescript
// Generate a safe support reference for 500 errors (helps debugging without leaking)
function generateSupportRef(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// Usage:
} catch (err) {
  const ref = generateSupportRef();
  console.error(`[${ref}]`, err);
  return NextResponse.json(
    { error: "Something went wrong. Please try again.", support_ref: ref },
    { status: 500 }
  );
}
```

---

## 14. DATABASE SECURITY

### 14.1 Connection Security

```typescript
// NEVER use the service role key on the client side
// These are the ONLY acceptable patterns:

// Client-side (browser/React): Use anon key
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// Server-side (API routes): Use auth.getUser() with anon key
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
export const createClient = async () => { /* ... cookie-based client ... */ };

// Service role (cron jobs, internal triggers, admin): ONLY in server contexts
// src/lib/supabase/service.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
export const createServiceClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
// NEVER import createServiceClient in any client component or page
```

### 14.2 SQL Injection Prevention

Supabase's client library uses parameterized queries — direct SQL injection via the Supabase client is not possible. However:

```typescript
// SAFE — Supabase parameterizes automatically:
supabase.from("profiles").select("*").eq("handle", userInput);

// DANGEROUS — Never do this:
supabase.rpc("raw_query", { sql: `SELECT * FROM profiles WHERE handle = '${userInput}'` });

// DANGEROUS — Never use Supabase .filter() with raw user input:
supabase.from("table").filter(userInput, "eq", value); // userInput could be a column name!

// SAFE — Use validated column names only:
const ALLOWED_SORT_COLUMNS = new Set(["created_at", "name", "price_range"]);
if (!ALLOWED_SORT_COLUMNS.has(sortColumn)) {
  return errorResponse(400, "Invalid sort column.");
}
supabase.from("agencies").select("*").order(sortColumn);
```

---

## 15. IMPLEMENTATION ORDER

1. `src/lib/utils/sanitize.ts` — comprehensive sanitization functions (no dependencies)
2. `src/lib/utils/validate.ts` — validation helpers
3. `src/lib/security/file-validation.ts`
4. `src/lib/security/rate-limit.ts` + database table migration
5. `src/lib/security/webhook-verify.ts`
6. `src/lib/security/audit.ts` + database table migration
7. `src/lib/security/sanitize-response.ts`
8. `src/lib/auth/require-auth.ts`
9. `src/lib/auth/require-admin.ts`
10. Run ALL RLS migrations from Section 3 — verify with the audit query
11. Update `next.config.ts` with security headers
12. Update `src/middleware.ts` with session refresh and route protection
13. Add consent checkbox and `terms_accepted_at` column to signup flow
14. `src/app/api/account/my-data/route.ts` — data export
15. `src/app/api/account/delete/route.ts` — account deletion
16. `src/app/api/handle/update/route.ts` — ensure it checks handle_locked
17. Audit all existing API routes: add `requireAuth()`, rate limit checks, and sanitized inputs
18. Add `validateRequiredEnvVars()` call in production startup
19. Create `/privacy` and `/terms` pages
20. Run Supabase RLS audit query — confirm every table shows `rowsecurity = true`
21. Test: attempt to access another user's data — should return 404 or 401
22. Test: attempt SQL injection in a text field — should sanitize silently
23. Test: send malformed Flutterwave webhook without correct hash — should return 401
