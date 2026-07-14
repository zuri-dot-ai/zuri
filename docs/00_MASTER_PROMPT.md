# ZURI — MASTER PROMPT
# Paste this at the start of every Claude Code session.
# This document is the single source of truth for the entire Zuri platform.
# Read this first. Then read the specific MD file for the domain you are working on.

---

## 1. PROJECT IDENTITY

**Zuri** is an AI-powered business presence platform for African entrepreneurs. It generates professional websites, plans content strategies, creates social media content, and connects users with agencies — all powered by Google's Gemini API. It is being submitted to the **GeminiXprize competition** with a deadline of **August 17, 2026**.

**Target user**: Nigerian small business owner who needs a professional online presence but has no technical skills and limited time.

**Core value proposition**: Answer 7 questions about your business. Get a website, a content calendar, and an AI content engine — in under 3 minutes.

**Competition category**: Small Business Services

**Brand**: Dark mode only. Background `#0C0C0E`. Gold accent `#C9A84C`. Typography: Cormorant Garamond (headings) + Montserrat (body). Lucide React icons only — no emojis anywhere in the app UI.

---

## 2. TECH STACK

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript strict) |
| Styling | Tailwind CSS + shadcn/ui + Framer Motion |
| Database + Auth | Supabase (PostgreSQL + Row Level Security + Realtime) |
| Storage | Supabase Storage |
| AI — Text | Gemini API (gemini-1.5-flash, gemini-1.5-pro) |
| AI — Images | Imagen 3 via Gemini API |
| AI — Search | Gemini Flash with Google Search tool |
| Payments | Flutterwave (NGN, recurring subscriptions) |
| Email | Resend + React Email |
| Deployment | Vercel (single project, wildcard subdomain *.zuri.com) |
| Stock Images | Unsplash API (primary) + Pexels API (fallback) |
| PWA/Mobile | Bubblewrap CLI (Android TWA) + Capacitor (iOS, optional) |
| Error Monitoring | Vercel function logs (competition phase); Sentry (post-competition) |

---

## 3. REPOSITORY STRUCTURE

```
src/
├── app/
│   ├── (marketing)/        # Public marketing pages (/, /pricing, /agencies, /how-it-works)
│   ├── (auth)/             # Login, signup, onboarding
│   │   └── onboarding/
│   ├── (app)/              # Authenticated dashboard
│   │   ├── dashboard/
│   │   ├── website/
│   │   ├── content/
│   │   ├── analytics/
│   │   ├── agencies/
│   │   └── settings/
│   ├── sites/
│   │   ├── [handle]/       # Published generated websites
│   │   └── custom-domain/
│   │       └── [domain]/
│   ├── preview/
│   │   └── [handle]/       # Internal preview (auth required)
│   ├── admin/              # Admin panel (is_admin = true only)
│   ├── api/
│   │   ├── ai/             # AI generation endpoints
│   │   ├── analytics/      # Analytics collection + integrations
│   │   ├── agencies/       # Agency marketplace
│   │   ├── content/        # Content strategy + generation
│   │   ├── cron/           # All scheduled jobs
│   │   ├── handle/         # Handle availability + update
│   │   ├── notifications/  # In-app notifications
│   │   ├── onboarding/     # Onboarding completion
│   │   ├── payments/       # Flutterwave payment flow
│   │   ├── revalidate/     # On-demand cache revalidation
│   │   ├── subscriptions/  # Subscription management
│   │   └── website/        # Website CRUD + publish
│   ├── maintenance/        # Maintenance mode page
│   ├── offline/            # PWA offline fallback
│   ├── error.tsx           # Route error boundary
│   ├── global-error.tsx    # Root error boundary
│   └── not-found.tsx       # 404 page
│
├── components/
│   ├── app/                # Dashboard-specific components (Sidebar, TopBar)
│   ├── errors/             # ErrorBoundary
│   ├── marketing/          # Marketing page components
│   ├── onboarding/         # Onboarding step components
│   ├── ui/                 # Shared UI primitives (Button, Card, etc.)
│   └── website-blocks/     # Generated website block components
│       ├── BlockRenderer.tsx
│       └── blocks/         # Individual block components (HeroFullscreen, etc.)
│
├── hooks/                  # Custom React hooks
├── lib/
│   ├── auth/               # Authentication utilities
│   ├── content/            # Content strategy + generation utilities
│   ├── email/              # Resend email sender + templates
│   ├── errors/             # Error types, messages, classifiers
│   ├── handle/             # Handle validation utilities
│   ├── notifications/      # Notification creation utility
│   ├── payments/           # Plan config, feature gating, Flutterwave
│   ├── security/           # Rate limiting, audit logging, file validation
│   ├── supabase/           # Supabase client (client, server, service)
│   ├── utils/              # sanitize.ts, validate.ts
│   └── website/            # Archetypes, pipeline, validator, image resolver
│
public/
├── Zuri_Logo.png
├── Zuri_Favicon.png
├── manifest.json
├── sw.js
├── icons/                  # PWA icons (all sizes)
├── images/
│   └── fallbacks/          # 8 archetype fallback images
└── .well-known/
    └── assetlinks.json     # Android TWA verification
```

---

## 4. SUPABASE CLIENT SETUP

These are the three client patterns. Use the correct one for each context. Never mix them.

```typescript
// src/lib/supabase/client.ts — Browser/React components only
import { createBrowserClient } from "@supabase/ssr";
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// src/lib/supabase/server.ts — API routes + server components (respects user auth)
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export const createClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(),
                 setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );
};

// src/lib/supabase/service.ts — Cron jobs, internal triggers, admin only
// NEVER import this in client components or pages
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
export const createServiceClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
```

---

## 5. GEMINI API UTILITY

```typescript
// src/lib/gemini.ts

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export async function geminiGenerate(prompt: string, modelId: string): Promise<string> {
  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${modelId}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
      signal: AbortSignal.timeout(90000), // 90s timeout for Pro model
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function geminiJSON<T>(
  prompt: string,
  model: "flash" | "pro",
  maxRetries: number = 3
): Promise<T> {
  const modelId = model === "pro" ? "gemini-1.5-pro" : "gemini-1.5-flash";
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const raw = await geminiGenerate(
        attempt > 1
          ? prompt + "\n\nIMPORTANT: Output ONLY valid JSON. No markdown fences. Start with { end with }."
          : prompt,
        modelId
      );
      const cleaned = raw.trim()
        .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      return JSON.parse(cleaned) as T;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error(`geminiJSON failed after ${maxRetries} attempts: ${String(lastError)}`);
}
```

---

## 6. PRICING TIERS

| Plan | Price | Key Limits |
|---|---|---|
| Free | ₦0 | Build website (preview only), 5 content ideas/month, no analytics |
| Pro | ₦23,000/month | 1 site on handle.zuri.com, 15 images/mo, 12 posts/mo (2 platforms), 30-day analytics |
| Growth | ₦51,000/month | 1 site + custom domain, 50 images/mo, 30 posts/mo (4 platforms), Meta + Search Console |
| Premium | ₦73,000/month | 3 sites, 200 images/mo, unlimited posts (all platforms), full analytics, dedicated AM |

Annual = 2 months free. Payment processor: Flutterwave. Plan IDs in DB: `free`, `pro`, `growth`, `premium`.

---

## 7. SUPPORTED WEBSITE BRANCHES

Zuri auto-generates websites for these business types:
- Branch 1: Business / Service (consultant, agency, local services)
- Branch 3: Portfolio / Personal Brand (photographer, designer, artist)
- Branch 5: Restaurant / Hospitality (café, bakery, catering)
- Branch 6: Events / Booking (venue, instructor, appointment services)
- Branch 8: Landing Page (product launch, waitlist, campaign)

**Unsupported** (redirect to custom build team): Branch 2 (E-commerce), Branch 4 (Blog/CMS), Branch 7 (Nonprofit with membership). These require backend complexity beyond Zuri's AI generation scope. Always use the `<CustomSiteCTA />` component, never say "we can't do this."

---

## 8. DESIGN ARCHETYPES

8 archetypes control all design decisions. The resolver is deterministic (no AI):

| Archetype | Business Types | Fonts | Motion |
|---|---|---|---|
| warm-sensory | food, restaurant, bakery | Playfair Display + Lato | bold_energetic |
| authority-minimal | consultant, lawyer, coach | Cormorant Garamond + Montserrat | slow_elegant |
| luxury-aspirational | beauty, spa, salon, fashion | Cormorant Garamond + Raleway | slow_elegant |
| editorial-bold | retail, streetwear, creative agency | Bebas Neue + DM Sans | bold_energetic |
| clean-modern | tech, SaaS, fintech, startup | Inter + Inter | crisp_modern |
| portfolio-dramatic | photography, videography, art | Fraunces + Work Sans | slow_elegant |
| community-vibrant | fitness, gym, yoga, wellness | Nunito + Nunito | bold_energetic |
| trust-professional | medical, dental, pharmacy, real estate | Source Serif 4 + Source Sans 3 | crisp_modern |

---

## 9. HOW GEMINI IS USED (Competition Evidence)

This is the most important section for the GeminiXprize submission. Every use of Gemini must be demonstrable.

| # | Feature | Model | Where |
|---|---|---|---|
| 1 | Brand extraction from onboarding answers | Flash | `/api/onboarding/complete` |
| 2 | Website structure generation (Pass 1) | Flash | `composition-pipeline.ts` |
| 3 | Website copy generation (Pass 2) | Pro | `composition-pipeline.ts` |
| 4 | Website quality critique (Pass 3) | Flash | `composition-pipeline.ts` |
| 5 | Section copy regeneration (editor) | Flash | `/api/website/section` |
| 6 | AI image prompt generation | Flash | `image-prompt-generator.ts` |
| 7 | **Imagen 3 image generation** | Imagen 3 | `imagen.ts` |
| 8 | Content calendar generation | Flash | `calendar-generator.ts` |
| 9 | Trending topics with web search | Flash + Search tool | `trending-topics.ts` |
| 10 | Social media caption generation | Flash | `caption-generator.ts` |
| 11 | Blog post generation | Pro | `blog-generator.ts` |
| 12 | Email newsletter generation | Pro | `newsletter-generator.ts` |
| 13 | Video script generation | Flash | `video-script-generator.ts` |
| 14 | Content repurposing across platforms | Flash | `repurpose-engine.ts` |
| 15 | Content series generation | Flash | `series-generator.ts` |
| 16 | Monthly performance report | Pro | `monthly-report-generator.ts` |

**16 distinct Gemini API integrations across the platform.** Every AI call in Zuri uses a Google model — no OpenAI, no Anthropic, no Stability AI. This is by design for the competition.

---

## 10. DOMAIN STRUCTURE

```
zuri.com                     → Main app + marketing (single Next.js deployment)
handle.zuri.com              → Generated user websites (wildcard DNS → middleware)
customdomain.com             → User's custom domain (Vercel Domains API)
```

Middleware at project root detects subdomain and rewrites to `/sites/[handle]` internally. One deployment, all surfaces.

---

## 11. KEY ENVIRONMENT VARIABLES

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google / Gemini (text + Imagen 3 — same key)
GEMINI_API_KEY=

# Google OAuth (Search Console)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Flutterwave
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_ENCRYPTION_KEY=
FLUTTERWAVE_WEBHOOK_HASH=

# Resend
RESEND_API_KEY=

# Stock images
UNSPLASH_ACCESS_KEY=
PEXELS_API_KEY=

# Meta (Facebook + Instagram)
META_APP_ID=
META_APP_SECRET=

# Vercel (custom domain management)
VERCEL_API_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=                # Leave blank if personal account

# Internal security
INTERNAL_API_SECRET=           # Protects server-to-server internal routes
TOKEN_ENCRYPTION_KEY=          # 32-byte hex: openssl rand -hex 32
CRON_SECRET=                   # Protects all /api/cron/* routes
REVALIDATION_SECRET=           # For on-demand ISR revalidation

# App
NEXT_PUBLIC_ROOT_DOMAIN=zuri.com
NEXT_PUBLIC_APP_URL=https://zuri.com
MAINTENANCE_MODE=false
```

---

## 12. MD FILE REFERENCE MAP

Before working on any domain, read the corresponding MD file first. This is mandatory.

| What you're working on | Read this file first |
|---|---|
| Pricing, plans, Flutterwave, subscription lifecycle | `06_MONETIZATION.md` |
| Onboarding screens, handle system, brand extraction | `01_ONBOARDING.md` |
| Website generation, archetypes, blocks, editor, publish | `02_WEBSITE_BUILDER.md` |
| Content calendar, pillars, cultural calendar, trending topics | `03_CONTENT_STRATEGY.md` |
| Image generation (Imagen), captions, blogs, newsletters | `04_CONTENT_GENERATION.md` |
| Analytics tracking, Meta API, Search Console, reports | `05_ANALYTICS.md` |
| Agency listings, inquiries, applications | `07_AGENCY_MARKETPLACE.md` |
| Email templates (Resend), in-app notifications, digests | `08_NOTIFICATIONS.md` |
| Subdomains, custom domains, PWA, Android APK, env vars | `09_DEPLOYMENT.md` |
| RLS policies, input validation, rate limiting, NDPA | `10_SECURITY.md` |
| Error boundaries, error messages, recovery strategies | `11_ERROR_HANDLING.md` |

---

## 13. NON-NEGOTIABLE RULES FOR EVERY SESSION

1. **Read the MD file first.** Before writing a single line of code in any domain, read its MD file. The spec is the source of truth — not your training data.

2. **Auth on every API route.** Every `src/app/api/*` route must start with `requireAuth()`. No exceptions. Routes that need to be public (tracking, contact forms, agency listings) must have explicit public access documented in a comment.

3. **Sanitize all inputs.** Every string from a request body must pass through `sanitizeText()` or the appropriate specialized sanitizer before any DB write or AI call.

4. **Never use service role on the client.** `createServiceClient()` is server-only. If you find it imported in a component or page, that is a critical security bug — fix it immediately.

5. **Run TypeScript.** Before ending any session, run `npx tsc --noEmit`. Zero type errors is the standard.

6. **Mobile-first.** After any UI change, test at 375px viewport. If it breaks, fix it before moving on.

7. **Error handling pattern.** Every API route must follow the template in `11_ERROR_HANDLING.md` Section 4. User-facing errors must use messages from `ERROR_MESSAGES` — never raw error strings.

8. **Never break existing functionality.** If something was working before the session started, it must be working when the session ends.

9. **Commit working code.** After each working feature, commit to GitHub. Message format: `feat(domain): description` or `fix(domain): description`.

10. **Rate limit AI calls.** Gemini calls are expensive. Every generation endpoint must check the relevant usage limit before calling Gemini. If the limit is reached, return 403 — never call the API.

---

## 14. DATABASE MIGRATION ORDER

Run these migrations in order. Each depends on the previous.

```sql
-- Phase 1: Core account tables
-- 1. profiles (additions: handle, handle_locked, onboarding_completed, agency_discoverable, is_admin, terms_accepted_at)
-- 2. plans (seed all 4 plans)
-- 3. subscriptions (with auto-create trigger)
-- 4. notification_preferences (with auto-create trigger)
-- 5. audit_logs
-- 6. rate_limit_log

-- Phase 2: Monetization
-- 7. usage_tracking (with increment_usage function)
-- 8. payment_history
-- 9. webhook_events

-- Phase 3: Business content
-- 10. business_profiles
-- 11. website_generation_jobs
-- 12. websites (with custom domain columns)
-- 13. website_images

-- Phase 4: Content
-- 14. content_pillars
-- 15. content_calendar
-- 16. generated_content

-- Phase 5: Analytics
-- 17. website_pageviews
-- 18. website_events
-- 19. website_analytics_daily
-- 20. meta_connections
-- 21. meta_insights
-- 22. search_console_connections
-- 23. search_console_snapshots
-- 24. monthly_reports
-- 25. trending_topics_cache
-- 26. content_strategy_insights

-- Phase 6: Agency marketplace
-- 27. agencies (with increment_agency_inquiries function)
-- 28. agency_inquiries
-- 29. agency_applications

-- Phase 7: Notifications
-- 30. notifications (enable Realtime)
-- 31. email_send_log

-- Phase 8: Misc
-- 32. contact_submissions
-- 33. website_analytics_daily
```

After ALL migrations: run the RLS audit query from `10_SECURITY.md` Section 3.1. Every table must show `rowsecurity = true`.

---

## 15. COMPETITION FRAMING

### 15.1 Pre-existing Work Disclosure

The Zuri codebase has some pre-existing infrastructure (Next.js setup, basic Supabase integration, frontend components). The work created for this competition submission includes:

- Complete Gemini API integration (16 use cases as listed in Section 9)
- Full website generation pipeline (3-pass AI system)
- Content strategy algorithm with Nigerian cultural calendar
- AI image generation via Imagen 3
- Flutterwave subscription billing system
- Analytics integrations (Meta API, Google Search Console)
- Agency marketplace
- PWA/Android app packaging

### 15.2 Competition Judging Criteria → Zuri's Evidence

**Business Viability**
- Real Flutterwave payments in LIVE mode
- 4 pricing tiers (₦0 – ₦73,000/month)
- Real Nigerian businesses as users
- Revenue visible in `payment_history` table
- Agency marketplace creates B2B revenue opportunity

**AI-Native Operations**
- 16 Gemini API integrations (see Section 9)
- Imagen 3 for visual content generation
- Gemini with web search for trending Nigerian topics
- Gemini Pro for long-form content (blogs, newsletters, performance reports)
- Every core user flow touches the Gemini API

**Category Impact**
- Built specifically for Nigerian/African entrepreneurs
- Nigerian cultural calendar (Independence Day, Sallah, Detty December)
- Location-aware image search (Lagos, Nigeria, African context)
- Flutterwave payment (African-native payment processor)
- Content tone tuned for Nigerian audience
- Archetype system understands African business types

### 15.3 Demo Script (for judges)

1. Sign up → complete 7-question onboarding → see website generated in ~30 seconds
2. Show the live website at [handle].zuri.com
3. Open content calendar → show AI-generated posts with Nigerian cultural context
4. Generate an AI image for a content post (Imagen 3)
5. Show analytics dashboard
6. Browse agency marketplace
7. Show Flutterwave payment flow (switch to test mode for live demo)
8. Install as PWA / show Android app

---

## 16. IMPLEMENTATION ROADMAP (41 days to deadline)

### Week 1 (July 7–13): Foundation
Priority: Get the database, auth, and payments working end-to-end.

- [ ] All database migrations (Phase 1–2 from Section 14)
- [ ] Auth flow (signup → email verify → login → session management)
- [ ] Plan config + feature gating system
- [ ] Flutterwave payment initiation + verification + webhook
- [ ] Subscription lifecycle (activate, grace period, downgrade)
- [ ] Security: RLS on all tables, rate limiting, security headers
- [ ] Environment variables configured in Vercel

### Week 2 (July 14–20): Onboarding + Website Builder
Priority: The core product experience — a user must go from zero to live website.

- [ ] Onboarding flow (all 8 steps)
- [ ] Handle system + availability check
- [ ] Brand extraction (Gemini Flash)
- [ ] Website generation pipeline (3-pass + image resolver)
- [ ] Block renderer + all block components
- [ ] Website editor (section edit, image swap)
- [ ] Publish + subdomain deployment (middleware + Vercel wildcard)
- [ ] Custom domain flow (Vercel API)

### Week 3 (July 21–27): Content Systems
Priority: AI content generation is the main competition differentiator.

- [ ] Content pillars seeding
- [ ] Monthly calendar generation (Gemini Flash)
- [ ] Nigerian cultural calendar injection
- [ ] Trending topics (Gemini + web search)
- [ ] Caption generation per platform
- [ ] Imagen 3 image generation + storage
- [ ] Blog post generation (Gemini Pro)
- [ ] Email newsletter generation
- [ ] Video script generation (Higgsfield placeholder)
- [ ] Repurpose engine

### Week 4 (July 28–August 3): Analytics + Marketplace
Priority: Analytics for competition evidence, marketplace for B2B story.

- [ ] Website analytics (tracking script + collection API)
- [ ] Daily aggregation cron
- [ ] Analytics dashboard (Pro: website only)
- [ ] Meta Business API OAuth + sync (Growth)
- [ ] Google Search Console OAuth + sync (Growth)
- [ ] Agency marketplace (seed 8–10 real agencies)
- [ ] Agency inquiry system
- [ ] Agency application form
- [ ] Notifications (in-app + Resend email templates)

### Week 5 (August 4–10): Polish + Mobile + Competition Prep
Priority: Production readiness and mobile app for judge impressions.

- [ ] All error boundaries + error pages
- [ ] Offline banner + session expiry handling
- [ ] PWA manifest + service worker
- [ ] All PWA icons generated
- [ ] Android APK built with Bubblewrap
- [ ] `assetlinks.json` deployed
- [ ] Google Play internal testing submission
- [ ] Performance audit (Lighthouse ≥ 80)
- [ ] Mobile responsiveness audit (375px)
- [ ] Privacy policy + Terms of service pages
- [ ] Weekly digest cron
- [ ] All cron jobs tested

### Week 6 (August 11–17): Submission
Priority: Real users, real revenue, polished demo.

- [ ] Switch Flutterwave to LIVE mode
- [ ] Acquire at least 5 paying users (real Nigerian businesses)
- [ ] At least 3 different archetypes tested end-to-end
- [ ] Record demo video (3–5 minutes)
- [ ] Write competition description (what problem, how Gemini solves it, impact)
- [ ] Verify all 16 Gemini integrations work in production
- [ ] Revenue in payment_history table (real NGN transactions)
- [ ] Final submission by August 17, 2026

---

## 17. WHAT EXISTS VS WHAT NEEDS BUILDING

### Already Exists (pre-competition)
- Next.js 15 project structure
- Basic Supabase integration
- Some frontend components
- Basic routing

### Needs Building (competition work)
- Complete database schema (all 33 tables)
- Gemini integration utility
- All 16 AI use cases
- Flutterwave payment system
- Complete onboarding flow
- Website generation pipeline + all 23 block components
- Content strategy system
- Content generation system (captions, images, blogs, newsletters)
- Analytics system
- Agency marketplace
- Notification system
- Deployment infrastructure (wildcard subdomain, custom domains)
- PWA + Android app
- All error handling
- All email templates (26 templates)

---

## 18. GLOBAL TYPES

These TypeScript types are used across multiple systems. Define them in `src/types/`.

```typescript
// src/types/brand.ts
export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  industry: string;
  business_type: string;
  services: string[];
  target_audience: string;
  location: string;
  location_city: string | null;
  brand_tone: string;
  unique_value: string;
  tagline: string;
  brand_vibe: string;
  color_primary: string;
  color_accent: string;
  platforms: string[];
}

// src/types/website.ts
export type WebsiteStatus = "generating" | "preview" | "published" | "suspended" | "failed" | "deleted";

export interface WebsiteComposition {
  archetype: string;
  sections: string[];
  palette: {
    bg: string; surface: string; text: string; accent: string; muted: string;
  };
  typography: {
    heading: string; body: string; heading_weight: number; body_weight: number;
  };
  motion_style: "slow_elegant" | "crisp_modern" | "bold_energetic";
  content: Record<string, Record<string, unknown>>;
  resolved_images: ResolvedImage[];
  section_image_map: Record<string, ResolvedImage>;
  tagline: string;
  seo_title: string;
  seo_description: string;
  og_title: string;
  image_queries: string[];
}

export interface ResolvedImage {
  url: string;
  blur_url: string;
  alt: string;
  credit: string;
  credit_url: string | null;
  source: "unsplash" | "pexels" | "user-upload" | "fallback";
  width: number;
  height: number;
}

// src/types/subscription.ts
export type PlanId = "free" | "pro" | "growth" | "premium";
export type SubscriptionStatus = "active" | "grace_period" | "trialing" | "cancelled" | "expired";
```

---

## 19. COMMON PITFALLS TO AVOID

1. **Using `supabase.auth.getSession()` in API routes.** Always use `supabase.auth.getUser()` — it verifies the JWT server-side. `getSession()` trusts the cookie without verification and is not secure for API routes.

2. **Calling Gemini without sanitizing user input first.** Always run user-provided text through `sanitizeForPrompt()` before including it in any Gemini prompt.

3. **Forgetting to increment usage counters.** Every image generation, blog post, or newsletter must call `supabase.rpc("increment_usage", {...})` after success. If this is missing, usage limits are bypassed.

4. **Using `single()` without checking for null.** `supabase.from("table").select("*").single()` throws if no row is found (code `PGRST116`). Always handle the error case.

5. **Forgetting to call `revalidateWebsite()`** after any website publish or section edit. Without this, the cached site at `handle.zuri.com` will show stale content for up to 1 hour.

6. **Not checking `handle_locked` before updating a handle.** The handle update endpoint must verify `profiles.handle_locked = false` before applying any change.

7. **Returning the raw Supabase error to the client.** Always classify errors with `classifySupabaseError()` and return the user-facing message — never `error.message` from Supabase directly.

8. **Forgetting `FORCE ROW LEVEL SECURITY` on tables.** `ENABLE ROW LEVEL SECURITY` alone doesn't apply RLS to the table owner. Always run both statements.

9. **Using the service role client in a React component.** It will expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. This is a critical security vulnerability.

10. **Creating notification rows without using `createNotification()`.** Never insert directly into the `notifications` table from API routes — always use the utility function which handles both in-app and email in one call.
