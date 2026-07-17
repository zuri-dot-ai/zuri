# ZURI — DEPLOYMENT SYSTEM
# Complete specification for subdomain routing, custom domains, Vercel configuration,
# handle system, PWA setup, Android/iOS app wrapping, and environment variables

---

## 1. ARCHITECTURE OVERVIEW

Zuri is a single Next.js 15 application deployed to Vercel. One codebase, one deployment, multiple domain surfaces.

```
zuri.com                     → Marketing site (public)
zuri.com/login               → Auth (public)
zuri.com/dashboard           → App dashboard (auth required)
zuri.com/onboarding          → Onboarding (auth required)
zuri.com/agencies            → Agency marketplace (public browse, auth to contact)
zuri.com/pricing             → Pricing page (public)

dansbakery.zuri.com          → Dan's Bakery generated website (public)
thestudio.zuri.com           → The Studio generated website (public)
*.zuri.com                   → Any published Zuri user website

dansbakery.com               → Dan's custom domain (Growth+ only)
                               Proxied via Vercel Domains API → same Next.js app
```

The Next.js middleware intercepts requests at the edge, detects whether the request is for the main app or a generated website subdomain, and rewrites accordingly — no separate deployment per user site.

---

## 2. VERCEL PROJECT SETUP

### 2.1 Project Configuration

```json
// vercel.json — COMPLETE FILE (consolidates all cron jobs from every MD file)
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["cdg1", "iad1"],
  // cdg1 = Paris (closest to West Africa for low latency)
  // iad1 = Washington DC (US East, for redundancy)

  "headers": [
    {
      "source": "/api/analytics/track",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "POST, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type" }
      ]
    },
    {
      "source": "/api/analytics/event",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "POST, OPTIONS" }
      ]
    }
  ],

  "crons": [
    // Subscription management (from MONETIZATION.md)
    { "path": "/api/cron/process-subscriptions", "schedule": "0 23 * * *" },

    // Analytics (from ANALYTICS.md)
    { "path": "/api/cron/aggregate-analytics",   "schedule": "0 1 * * *"  },
    { "path": "/api/cron/sync-meta-insights",    "schedule": "0 3 * * *"  },
    { "path": "/api/cron/sync-search-console",   "schedule": "0 4 * * *"  },
    { "path": "/api/cron/purge-analytics",       "schedule": "0 2 * * *"  },
    { "path": "/api/cron/generate-monthly-reports", "schedule": "0 6 1 * *" },

    // Notifications (from NOTIFICATIONS.md)
    { "path": "/api/cron/weekly-digest",         "schedule": "0 7 * * 1"  },
    // Monday 07:00 UTC = 08:00 WAT
    { "path": "/api/cron/content-reminders",     "schedule": "0 8 * * 1"  },
    // Monday 08:00 UTC = 09:00 WAT
    { "path": "/api/cron/cultural-reminders",    "schedule": "0 8 * * *"  },
    // Daily 08:00 UTC = 09:00 WAT

    // Domain verification (from this file)
    { "path": "/api/cron/verify-custom-domains", "schedule": "*/15 * * * *" }
    // Every 15 minutes — checks pending domain verifications
  ]
}
```

### 2.2 Domains to Add in Vercel Dashboard

Add these domains to the Vercel project under Settings → Domains:

| Domain | Type | Purpose |
|---|---|---|
| `zuri.com` | Primary | Main app and marketing |
| `www.zuri.com` | Redirect → `zuri.com` | WWW redirect |
| `*.zuri.com` | Wildcard | All generated user websites |

Do NOT add individual user subdomains — the wildcard handles all of them automatically.

---

## 3. DNS CONFIGURATION

All DNS records must be set in your domain registrar or DNS provider (e.g. Cloudflare, Route 53).

### 3.1 Required Records for zuri.com

```
# Main domain — Vercel nameservers (option A: use Vercel DNS entirely)
# OR CNAME/A records (option B: keep your current DNS provider)

# Option B records (if keeping external DNS):

Type    Name     Value                        TTL
-----   -------  ---------------------------  -----
A       @        76.76.21.21                  300
CNAME   www      cname.vercel-dns.com         300
CNAME   *        cname.vercel-dns.com         300   ← wildcard for user sites

# Resend email verification (for transactional email from @zuri.com)
TXT     @        "v=spf1 include:amazonses.com ~all"
TXT     resend._domainkey  [Resend provides this value]
TXT     _dmarc   "v=DMARC1; p=quarantine; rua=mailto:dmarc@zuri.com"

# Google Search Console verification (add after GSC setup)
TXT     @        "google-site-verification=..."
```

### 3.2 Wildcard Subdomain Behaviour

Once `*.zuri.com` CNAME points to `cname.vercel-dns.com`:
- `dansbakery.zuri.com` → Vercel edge → Next.js middleware → `/sites/dansbakery`
- `anystringatall.zuri.com` → same flow
- SSL certificate issued automatically by Vercel for `*.zuri.com`

---

## 4. HANDLE SYSTEM — COMPLETE SPECIFICATION

The handle is the permanent unique identifier that powers subdomain deployment. Every concept and rule is consolidated here.

### 4.1 Handle Rules

```typescript
// src/lib/handle/rules.ts

export const HANDLE_RULES = {
  min_length: 3,
  max_length: 30,
  pattern: /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/,
  // Pattern means:
  // - Starts and ends with a letter or number
  // - Middle characters: letters, numbers, hyphens only
  // - No consecutive hyphens (enforced separately)
  // - Min 3 chars total, max 30 chars total
};

// Handles that are permanently reserved — cannot be registered by any user
export const RESERVED_HANDLES = new Set([
  // App routes
  "app", "api", "www", "admin", "dashboard", "onboarding", "preview",
  "login", "signup", "register", "logout", "auth", "oauth", "callback",
  "settings", "billing", "account", "profile", "pricing", "plans",
  "payment", "checkout", "verify", "callback", "webhook", "cron",
  "internal", "health", "status", "monitor",

  // Zuri brand
  "zuri", "team", "support", "help", "contact", "about", "press",
  "media", "legal", "terms", "privacy", "careers", "blog", "news",
  "updates", "changelog", "docs", "developers",

  // Marketplace
  "agencies", "agency", "marketplace",

  // Common squatting targets
  "google", "facebook", "instagram", "twitter", "x", "tiktok",
  "apple", "microsoft", "amazon", "netflix", "youtube",

  // Technical/harmful
  "null", "undefined", "test", "demo", "example", "localhost",
  "staging", "prod", "production", "dev", "development",
  "static", "assets", "images", "fonts", "icons", "public",
  "admin", "root", "system", "server",

  // Content policy
  "sex", "porn", "xxx", "nsfw", "adult",
]);

export function validateHandle(handle: string): { valid: boolean; error?: string } {
  const clean = handle.toLowerCase().trim();

  if (!clean) return { valid: false, error: "Handle is required." };
  if (clean.length < HANDLE_RULES.min_length) {
    return { valid: false, error: `Handle must be at least ${HANDLE_RULES.min_length} characters.` };
  }
  if (clean.length > HANDLE_RULES.max_length) {
    return { valid: false, error: `Handle must be ${HANDLE_RULES.max_length} characters or fewer.` };
  }
  if (!HANDLE_RULES.pattern.test(clean)) {
    return { valid: false, error: "Handle can only contain lowercase letters, numbers, and hyphens. It cannot start or end with a hyphen." };
  }
  if (/--/.test(clean)) {
    return { valid: false, error: "Handle cannot contain consecutive hyphens." };
  }
  if (RESERVED_HANDLES.has(clean)) {
    return { valid: false, error: "This handle is reserved. Please choose a different one." };
  }

  return { valid: true };
}

export function generateHandle(businessName: string): string {
  return businessName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")     // Strip diacritics/accents
    .replace(/[^a-z0-9\s-]/g, "")        // Keep letters, numbers, spaces, hyphens
    .trim()
    .replace(/\s+/g, "-")               // Spaces → hyphens
    .replace(/-{2,}/g, "-")             // Collapse multiple hyphens
    .replace(/^-+|-+$/g, "")           // Strip leading/trailing hyphens
    .slice(0, 30);                       // Enforce max length
}

export function generateHandleSuggestions(takenHandle: string): string[] {
  const base = takenHandle.replace(/-\d+$/, ""); // Strip trailing number
  return [
    `${base}-ng`,
    `${base}-hq`,
    `${base}1`,
    `${base}-official`,
  ]
    .filter(h => h.length >= 3 && h.length <= 30)
    .filter(h => !RESERVED_HANDLES.has(h))
    .slice(0, 3);
}
```

### 4.2 Handle Lifecycle

```
CREATED during onboarding (Step 2)
  └── Stored in profiles.handle
  └── profiles.handle_locked = false
  └── Website not yet published

CHANGEABLE while handle_locked = false
  └── User can update handle in Settings → Account → Handle
  └── Must pass full validation + uniqueness check
  └── Previous handle becomes available for others to claim

LOCKED on first website publish
  └── profiles.handle_locked = true
  └── websites.handle = profiles.handle (snapshot copied)
  └── Attempting to change handle via API returns 403

PERMANENT after lock
  └── Even account changes cannot alter a locked handle
  └── The only way to change it: delete the website + republish
      (which creates a new website record with a new handle)
```

### 4.3 Handle Change API

```typescript
// src/app/api/handle/update/route.ts

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { handle: rawHandle } = await req.json();

  // Check if handle is locked
  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, handle_locked")
    .eq("id", user.id)
    .single();

  if (profile?.handle_locked) {
    return NextResponse.json({
      error: "Your handle is locked because your website is published. To change your handle, unpublish your website first.",
    }, { status: 403 });
  }

  const handle = sanitizeHandle(rawHandle);
  const validation = validateHandle(handle);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Check availability
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .neq("id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({
      error: "This handle is taken.",
      suggestions: generateHandleSuggestions(handle),
    }, { status: 409 });
  }

  await supabase.from("profiles").update({ handle }).eq("id", user.id);

  return NextResponse.json({ success: true, handle });
}
```

---

## 5. CUSTOM DOMAIN SYSTEM

### 5.1 Flow Overview

```
User enters domain → Validate format → Add to Vercel → Show DNS instructions
  → Polling checks DNS every 15 min for up to 48 hours
  → On propagation: update websites.custom_domain, notify user
  → Middleware now recognises this domain and serves their site
```

### 5.2 Add Custom Domain API

```typescript
// src/app/api/website/custom-domain/route.ts

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check plan — custom domain requires Growth+
  const gate = await checkFeatureAccess(supabase, user.id, "custom_domain");
  if (!gate.allowed) {
    return NextResponse.json({ error: "Growth plan required", upgradeRequired: "growth" }, { status: 403 });
  }

  const { domain: rawDomain } = await req.json();

  // ── Validate domain format ──────────────────────────────────────────────────
  const domain = rawDomain?.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (!domain) {
    return NextResponse.json({ error: "Domain is required." }, { status: 400 });
  }

  // Valid domain pattern: letters, numbers, hyphens, dots
  const domainPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/;
  if (!domainPattern.test(domain)) {
    return NextResponse.json({
      error: "Invalid domain format. Enter your domain as: example.com or www.example.com",
    }, { status: 400 });
  }

  // Block Zuri's own domains
  if (domain.endsWith(".zuri.com") || domain === "zuri.com") {
    return NextResponse.json({
      error: "You cannot use a zuri.com domain as a custom domain.",
    }, { status: 400 });
  }

  // ── Check if domain already taken ──────────────────────────────────────────
  const { data: existingWebsite } = await supabase
    .from("websites")
    .select("user_id")
    .eq("custom_domain", domain)
    .single();

  if (existingWebsite && existingWebsite.user_id !== user.id) {
    return NextResponse.json({
      error: "This domain is already connected to another Zuri site.",
    }, { status: 409 });
  }

  // ── Check website exists and is published (or in preview) ──────────────────
  const { data: website } = await supabase
    .from("websites")
    .select("id, status, handle")
    .eq("user_id", user.id)
    .single();

  if (!website) {
    return NextResponse.json({ error: "No website found. Generate your website first." }, { status: 404 });
  }

  // ── Add domain to Vercel project ────────────────────────────────────────────
  const vercelRes = await fetch(
    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        "Content-Type": "application/json",
        ...(process.env.VERCEL_TEAM_ID && { "x-vercel-team-id": process.env.VERCEL_TEAM_ID }),
      },
      body: JSON.stringify({ name: domain }),
    }
  );

  if (!vercelRes.ok) {
    const errData = await vercelRes.json();
    // Domain already added to Vercel (possibly from a previous attempt) — that's OK
    if (errData.error?.code !== "domain_already_in_use") {
      console.error("Vercel domain add error:", errData);
      return NextResponse.json({
        error: "Could not configure your domain. Please try again or contact support.",
      }, { status: 500 });
    }
  }

  // ── Fetch DNS instructions from Vercel ──────────────────────────────────────
  const configRes = await fetch(
    `https://api.vercel.com/v6/domains/${domain}/config`,
    {
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        ...(process.env.VERCEL_TEAM_ID && { "x-vercel-team-id": process.env.VERCEL_TEAM_ID }),
      },
    }
  );
  const configData = await configRes.json();

  // ── Save to DB ──────────────────────────────────────────────────────────────
  await supabase.from("websites").update({
    custom_domain: domain,
    custom_domain_status: "pending_verification",
    custom_domain_added_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id);

  // ── Return DNS instructions to user ────────────────────────────────────────
  const dnsInstructions = buildDnsInstructions(domain, configData);

  return NextResponse.json({
    success: true,
    domain,
    status: "pending_verification",
    dns_instructions: dnsInstructions,
    estimated_propagation: "Up to 48 hours, usually within a few minutes",
  });
}

function buildDnsInstructions(
  domain: string,
  vercelConfig: any
): DnsInstruction[] {
  // Vercel recommends either CNAME (for subdomains like www) or A record (for apex domains)
  const isApex = !domain.includes("www.") && domain.split(".").length === 2;

  if (isApex) {
    return [
      {
        type: "A",
        name: "@",
        value: "76.76.21.21",
        description: "Points your root domain to Zuri",
      },
      {
        type: "CNAME",
        name: "www",
        value: "cname.vercel-dns.com",
        description: "Points www to Zuri (recommended)",
      },
    ];
  } else {
    return [
      {
        type: "CNAME",
        name: domain.split(".")[0], // e.g. "www"
        value: "cname.vercel-dns.com",
        description: "Points your subdomain to Zuri",
      },
    ];
  }
}
```

### 5.3 Custom Domain Verification Cron

```typescript
// src/app/api/cron/verify-custom-domains/route.ts
// Runs every 15 minutes — checks all pending custom domain verifications

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find all websites with pending domain verification
  // Stop checking after 48 hours (give up)
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: pendingDomains } = await supabase
    .from("websites")
    .select("id, user_id, custom_domain, custom_domain_added_at, handle")
    .eq("custom_domain_status", "pending_verification")
    .not("custom_domain", "is", null)
    .gte("custom_domain_added_at", fortyEightHoursAgo);

  let verified = 0;
  let expired = 0;

  for (const website of pendingDomains ?? []) {
    // Check if it's been more than 48 hours
    const addedAt = new Date(website.custom_domain_added_at);
    if (Date.now() - addedAt.getTime() > 48 * 60 * 60 * 1000) {
      await supabase.from("websites").update({
        custom_domain_status: "verification_failed",
      }).eq("id", website.id);
      expired++;
      continue;
    }

    // Check Vercel's domain verification status
    const isVerified = await checkDomainVerifiedOnVercel(website.custom_domain!);

    if (isVerified) {
      await supabase.from("websites").update({
        custom_domain_status: "verified",
        updated_at: new Date().toISOString(),
      }).eq("id", website.id);

      // Notify user
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", website.user_id)
        .single();

      await createNotification({
        userId: website.user_id,
        type: "domain_connected",
        title: "Custom domain connected",
        body: `Your domain ${website.custom_domain} is now live and serving your website.`,
        actionUrl: `https://${website.custom_domain}`,
        actionLabel: "Visit my site",
        email: profile?.email ? {
          to: profile.email,
          subject: `${website.custom_domain} is now live`,
          template: "domain_connected",
          templateProps: {
            firstName: profile.full_name?.split(" ")[0],
            domain: website.custom_domain,
            siteUrl: `https://${website.custom_domain}`,
          },
        } : undefined,
      });

      verified++;
    }
  }

  return NextResponse.json({ ok: true, verified, expired });
}

async function checkDomainVerifiedOnVercel(domain: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.vercel.com/v6/domains/${domain}/config`,
      {
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
          ...(process.env.VERCEL_TEAM_ID && { "x-vercel-team-id": process.env.VERCEL_TEAM_ID }),
        },
        signal: AbortSignal.timeout(10000),
      }
    );
    const data = await res.json();
    // Vercel marks a domain as configured when misconfigured is false
    return data.misconfigured === false;
  } catch {
    return false;
  }
}
```

### 5.4 Custom Domain Status API

```typescript
// GET /api/website/custom-domain/status
// Returns current verification status — polled by the frontend

export async function GET(req: Request) {
  // ... auth check ...
  const { data: website } = await supabase
    .from("websites")
    .select("custom_domain, custom_domain_status, custom_domain_added_at")
    .eq("user_id", user.id)
    .single();

  if (!website?.custom_domain) {
    return NextResponse.json({ has_custom_domain: false });
  }

  return NextResponse.json({
    has_custom_domain: true,
    domain: website.custom_domain,
    status: website.custom_domain_status,
    // status: pending_verification | verified | verification_failed
    added_at: website.custom_domain_added_at,
  });
}
```

### 5.5 Remove Custom Domain

```typescript
// DELETE /api/website/custom-domain

export async function DELETE(req: Request) {
  // ... auth check ...
  const { data: website } = await supabase
    .from("websites")
    .select("custom_domain")
    .eq("user_id", user.id)
    .single();

  if (!website?.custom_domain) {
    return NextResponse.json({ error: "No custom domain to remove" }, { status: 404 });
  }

  // Remove from Vercel
  await fetch(
    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${website.custom_domain}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        ...(process.env.VERCEL_TEAM_ID && { "x-vercel-team-id": process.env.VERCEL_TEAM_ID }),
      },
    }
  );

  // Clear from DB
  await supabase.from("websites").update({
    custom_domain: null,
    custom_domain_status: null,
    custom_domain_added_at: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
```

---

## 6. DATABASE SCHEMA ADDITIONS

```sql
-- Additions to websites table (run as migration)
ALTER TABLE websites ADD COLUMN IF NOT EXISTS custom_domain text UNIQUE;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS custom_domain_status text;
-- custom_domain_status: pending_verification | verified | verification_failed
ALTER TABLE websites ADD COLUMN IF NOT EXISTS custom_domain_added_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_websites_custom_domain_status
  ON websites(custom_domain_status) WHERE custom_domain IS NOT NULL;

-- Additions to handle system
-- (already defined in ONBOARDING.md — listed here for reference)
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS handle text UNIQUE;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS handle_locked boolean DEFAULT false;
```

---

## 7. SITE CACHING AND REVALIDATION

Generated websites are server-side rendered but should be edge-cached aggressively since they don't change frequently.

### 7.1 Cache Headers for Generated Sites

```typescript
// src/app/sites/[handle]/page.tsx

export const dynamic = "force-dynamic";  // Don't pre-generate at build time
export const revalidate = 3600;          // Revalidate cached response every hour

// When user publishes or edits their website, trigger on-demand revalidation:
// This is called from the /api/website/publish and /api/website/section routes
```

### 7.2 On-Demand Revalidation

```typescript
// src/lib/website/revalidate.ts

export async function revalidateWebsite(handle: string, customDomain?: string | null): Promise<void> {
  const paths = [`/sites/${handle}`];

  // Also revalidate the custom domain path if it exists
  if (customDomain) {
    paths.push(`/sites/custom-domain/${customDomain}`);
  }

  // Vercel on-demand revalidation
  await Promise.all(
    paths.map(path =>
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate?path=${encodeURIComponent(path)}&secret=${process.env.REVALIDATION_SECRET}`)
        .catch(err => console.error("Revalidation failed for", path, err))
    )
  );
}

// src/app/api/revalidate/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const path = searchParams.get("path");

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  if (!path) {
    return NextResponse.json({ error: "Path required" }, { status: 400 });
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath(path);

  return NextResponse.json({ revalidated: true, path });
}
```

---

## 8. PWA CONFIGURATION

The Zuri web app is a full Progressive Web App — installable on Android and iOS home screens, with offline support.

### 8.1 Web App Manifest

```json
// public/manifest.json — COMPLETE FILE

{
  "name": "Zuri — Your Business, Online",
  "short_name": "Zuri",
  "description": "AI-powered business presence for African entrepreneurs. Build your website, plan your content, and grow your brand.",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone"],
  "background_color": "#0C0C0E",
  "theme_color": "#0C0C0E",
  "orientation": "portrait-primary",
  "lang": "en-NG",
  "categories": ["business", "productivity"],
  "icons": [
    {
      "src": "/icons/icon-72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Zuri Dashboard"
    },
    {
      "src": "/screenshots/website-builder.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Website Builder"
    }
  ],
  "shortcuts": [
    {
      "name": "My Website",
      "url": "/dashboard/website",
      "icons": [{ "src": "/icons/shortcut-website.png", "sizes": "96x96" }]
    },
    {
      "name": "Content Calendar",
      "url": "/dashboard/content",
      "icons": [{ "src": "/icons/shortcut-content.png", "sizes": "96x96" }]
    }
  ]
}
```

### 8.2 Service Worker

```javascript
// public/sw.js — COMPLETE FILE

const CACHE_NAME = "zuri-v2";
const STATIC_ASSETS = [
  "/",
  "/offline",
  "/Zuri_Logo.png",
  "/Zuri_Favicon.png",
  "/manifest.json",
];

// Install: cache static assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Always network-first for API calls — never serve stale API responses
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: "You are offline." }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Cache-first for static assets (images, fonts, JS, CSS)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".woff2")
  ) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) => cached ?? fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Network-first for pages, fallback to offline page
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match("/offline") ??
      new Response("You are offline. Please reconnect to use Zuri.", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    )
  );
});
```

### 8.3 Offline Page

```tsx
// src/app/offline/page.tsx

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
      <img src="/Zuri_Logo.png" alt="Zuri" width={100} height={30} className="mb-8 opacity-60" />
      <h1 className="font-heading text-3xl text-white mb-4">You're offline</h1>
      <p className="text-white/50 text-sm max-w-xs">
        Reconnect to the internet to continue using Zuri. Your work is saved.
      </p>
    </div>
  );
}
```

### 8.4 Service Worker Registration (in layout.tsx)

```tsx
// Add to src/app/layout.tsx <body> at the end:
<script dangerouslySetInnerHTML={{ __html: `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .catch(function(err) { console.log('SW registration failed:', err); });
    });
  }
`}} />
```

### 8.5 PWA Icon Generation

Generate all required icon sizes from `/public/Zuri_Favicon.png`:

```bash
# Install sharp CLI
npm install -g sharp-cli

# Generate all icon sizes
npx sharp -i public/Zuri_Favicon.png -o public/icons/icon-72.png  resize 72
npx sharp -i public/Zuri_Favicon.png -o public/icons/icon-96.png  resize 96
npx sharp -i public/Zuri_Favicon.png -o public/icons/icon-128.png resize 128
npx sharp -i public/Zuri_Favicon.png -o public/icons/icon-144.png resize 144
npx sharp -i public/Zuri_Favicon.png -o public/icons/icon-192.png resize 192
npx sharp -i public/Zuri_Favicon.png -o public/icons/icon-512.png resize 512

# Maskable versions (add 20% padding for safe zone)
# Use https://maskable.app to generate maskable icons interactively
```

---

## 9. ANDROID APP (GOOGLE PLAY)

Wraps the Zuri PWA into a native Android APK using Trusted Web Activity (TWA) via Bubblewrap. No separate React Native or Flutter codebase needed.

### 9.1 Requirements Checklist (must be true before building)

- [ ] `manifest.json` accessible at `https://zuri.com/manifest.json`
- [ ] Service worker registered and functional
- [ ] All icons generated (including 512x512 maskable)
- [ ] HTTPS on production (Vercel handles this)
- [ ] Lighthouse PWA score ≥ 80 on https://zuri.com
- [ ] `start_url` returns 200 (not redirect)
- [ ] App works offline (offline page shows)

### 9.2 Build Steps

```bash
# Step 1: Install Bubblewrap
npm install -g @bubblewrap/cli

# Step 2: Initialise the TWA project
# (Run this in a separate directory, NOT inside the Next.js project)
mkdir zuri-android && cd zuri-android
bubblewrap init --manifest https://zuri.com/manifest.json

# Bubblewrap will prompt for:
# - Application ID: com.zuri.app
# - App name: Zuri
# - Short name: Zuri
# - Start URL: https://zuri.com/dashboard
# - Signing key (generate new or use existing)

# Step 3: Build the APK
bubblewrap build
# Output: app-release-signed.apk

# Step 4: Test on Android device
adb install app-release-signed.apk
```

### 9.3 Google Play Submission

1. Create a Google Play Developer account at play.google.com/console ($25 one-time fee)
2. Create a new app: "Zuri — Business Presence AI"
3. Upload `app-release-signed.apk` as an internal test release first
4. Test on at least one physical Android device
5. Fill in the store listing:
   - Title: "Zuri — AI Business Presence"
   - Short description (80 chars): "Build your website and content plan with AI. Made for African entrepreneurs."
   - Full description: Include key features, mention Nigeria/Africa, mention Gemini AI
   - Screenshots: at least 2 phone screenshots (dashboard + website preview)
   - Feature graphic: 1024×500px banner
   - Category: Business
   - Content rating: complete the questionnaire (Everyone)
6. Submit for review (typically 1–3 business days)

### 9.4 Digital Asset Links (required for TWA)

For the TWA to work, Google must verify you own the domain. Add this file:

```json
// public/.well-known/assetlinks.json

[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.zuri.app",
    "sha256_cert_fingerprints": ["YOUR_SIGNING_KEY_SHA256_FINGERPRINT"]
  }
}]
```

Get the fingerprint from the signing keystore:
```bash
keytool -printcert -jarfile app-release-signed.apk
# Copy the SHA-256 fingerprint
```

---

## 10. IOS APP (OPTIONAL — POST-COMPETITION)

iOS requires a native app shell for App Store submission. Use Capacitor — it wraps the web app with minimal additional code.

### 10.1 Basic Capacitor Setup

```bash
# In the Next.js project root
npm install @capacitor/core @capacitor/ios @capacitor/cli

# Initialise
npx cap init "Zuri" "com.zuri.app" --web-dir=out

# Export Next.js as static (required for Capacitor)
# Add to next.config.js: output: 'export'
npm run build

# Add iOS platform
npx cap add ios

# Sync web assets to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### 10.2 iOS Submission Notes

- Requires Apple Developer Program ($99/year)
- App Store review takes 1–7 days
- iOS is less permissive about PWA capabilities — some features may need native bridging
- For the competition deadline: submit to TestFlight only (internal testing) — App Store review can run in parallel
- TestFlight does NOT require App Store review to distribute to testers

---

## 11. COMPLETE ENVIRONMENT VARIABLES

Every environment variable needed across the entire Zuri platform, consolidated.

### 11.1 Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Server-only, never expose to client
SUPABASE_JWT_SECRET=...             # Found in Supabase dashboard → Settings → API
```

### 11.2 Google / Gemini

```env
GEMINI_API_KEY=AIzaSy...            # Used for Gemini text AND Imagen 3
GOOGLE_CLIENT_ID=...                # For Search Console OAuth
GOOGLE_CLIENT_SECRET=...            # For Search Console OAuth
```

### 11.3 Payment

```env
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-...
FLUTTERWAVE_SECRET_KEY=FLWSECK-...
FLUTTERWAVE_ENCRYPTION_KEY=...
FLUTTERWAVE_WEBHOOK_HASH=...        # Secret hash for webhook verification
```

### 11.4 Email

```env
RESEND_API_KEY=re_...
# No RESEND_FROM_DOMAIN needed — set from address directly in code as: hello@zuri.com
```

### 11.5 Image Sources

Images are served from the curated `category_images` library (Supabase Storage).
Unsplash/Pexels live API keys are not used in v2.

### 11.6 Meta / Facebook

```env
META_APP_ID=...                     # From developers.facebook.com
META_APP_SECRET=...
```

### 11.7 Vercel / Deployment

```env
VERCEL_API_TOKEN=...                # From vercel.com → Settings → Tokens
VERCEL_PROJECT_ID=prj_...           # From vercel.com → Project → Settings → General
VERCEL_TEAM_ID=team_...             # If using a Vercel team (leave blank for personal)
REVALIDATION_SECRET=...             # Random string for on-demand revalidation
```

### 11.8 Internal / Security

```env
INTERNAL_API_SECRET=...             # Long random string — for server-to-server calls
TOKEN_ENCRYPTION_KEY=...            # 32-byte hex string: openssl rand -hex 32
CRON_SECRET=...                     # Random string — protects cron endpoints
```

### 11.9 App Configuration

```env
NEXT_PUBLIC_ROOT_DOMAIN=zuri.com
NEXT_PUBLIC_APP_URL=https://zuri.com
NODE_ENV=production
```

### 11.10 Setting Variables in Vercel

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add each variable
3. Select environments: Production + Preview + Development (or subset as appropriate)
4. Variables prefixed with `NEXT_PUBLIC_` are safe to expose to the browser. All others are server-only.
5. After adding variables: redeploy the project for changes to take effect

---

## 12. DEPLOYMENT CHECKLIST

Run through this before the GeminiXprize submission.

### Infrastructure
- [ ] `zuri.com` A record → `76.76.21.21` (Vercel IP)
- [ ] `www.zuri.com` CNAME → `cname.vercel-dns.com`
- [ ] `*.zuri.com` CNAME → `cname.vercel-dns.com` (wildcard for user sites)
- [ ] All domains added in Vercel dashboard (zuri.com, www.zuri.com, *.zuri.com)
- [ ] SSL certificates issued for all three (Vercel does this automatically)
- [ ] All environment variables set in Vercel (use checklist above)
- [ ] Supabase project is on a paid plan (free tier has row limits that will block production)

### App Functionality
- [ ] Supabase Row Level Security enabled on ALL tables
- [ ] All database triggers created (subscription auto-create, handle lock, etc.)
- [ ] Cron jobs listed in vercel.json and tested
- [ ] `CRON_SECRET` set and verified — all cron routes return 401 without it
- [ ] `INTERNAL_API_SECRET` set — all internal routes reject without it
- [ ] Webhook signature verification working for Flutterwave
- [ ] `TOKEN_ENCRYPTION_KEY` is 32 bytes — verify with: `echo -n "your-key" | wc -c`
- [ ] Resend domain verified (SPF, DKIM, DMARC records added to DNS)
- [ ] Test email sending end-to-end in production
- [ ] Flutterwave switched to LIVE mode (not test mode) for real revenue
- [ ] Gemini API key has sufficient quota (check Google AI Studio usage limits)
- [ ] Unsplash app approved for production (check rate limits — demo keys have lower limits)

### PWA / Mobile
- [ ] `manifest.json` accessible at `https://zuri.com/manifest.json`
- [ ] Service worker registered (check Chrome DevTools → Application → Service Workers)
- [ ] All icon sizes generated and accessible
- [ ] `assetlinks.json` deployed at `https://zuri.com/.well-known/assetlinks.json`
- [ ] Android APK built and signed
- [ ] Android APK tested on physical device
- [ ] Google Play store listing submitted (even if in review)
- [ ] Lighthouse PWA score ≥ 80 (run at https://pagespeed.web.dev)

### Competition-Specific
- [ ] Flutterwave is in LIVE mode with at least 1 successful real payment
- [ ] At least 3 different business types have been tested through the full pipeline
- [ ] Gemini API is demonstrably central (website generation, content, image prompts, brand extraction, trends)
- [ ] "Built with Gemini" attribution visible somewhere in the app (footer or about page)
- [ ] Revenue tracking query working: at least some payment_history rows with status = 'successful'
- [ ] Agency marketplace has at least 8 real agency listings seeded
- [ ] All 8 archetype fallback images present at `/public/images/fallbacks/`

---

## 13. ERROR HANDLING — COMPLETE MAP

| Scenario | System Action | User-Facing Message |
|---|---|---|
| Wildcard subdomain not configured in Vercel | Vercel returns 404 | "Site not found" (Vercel default) — fix by adding *.zuri.com domain |
| User visits unpublished handle.zuri.com | Middleware routes to /sites/[handle] → returns notFound() | Standard Next.js 404 page |
| Custom domain DNS not propagated | Status remains pending_verification | "DNS is propagating. This can take up to 48 hours." |
| Custom domain DNS failed after 48h | Status set to verification_failed | "DNS verification failed. Check your DNS settings and try again." [View DNS guide] |
| Custom domain already taken by another user | Return 409 | "This domain is already connected to a Zuri site." |
| User enters domain with http:// prefix | Strip the prefix, validate remainder | No error — handled transparently |
| Vercel API returns error on domain add | Log error, return 500 to user | "Could not configure your domain. Please try again or contact support." |
| Vercel API rate limited | Retry after 60s backoff | Same as above — handled transparently |
| Revalidation fails (cached stale site) | Log warning, cache will expire naturally via revalidate setting | No user-facing error — site updates within 1 hour maximum |
| Android TWA asset links mismatch | App fails to open, falls back to browser | Not a user-facing error — developer fix required |
| Service worker fails to register | App works without SW (graceful degradation) | No error — app functions normally, just without offline support |
| Cron endpoint hit without CRON_SECRET | Return 401, log attempt | None — server only |
| Handle validation fails (server-side) | Return 400 with specific error | Specific message per rule (see handle rules section) |
| Handle change on locked profile | Return 403 | "Your handle is locked because your website is published. Unpublish your website to change your handle." |
| Environment variable missing at runtime | App crashes or specific feature fails | Depends on which variable — most critical ones should be validated at startup |

---

## 14. ENVIRONMENT VARIABLE STARTUP VALIDATION

```typescript
// src/lib/config/validate-env.ts
// Called at app startup (in middleware.ts or layout.tsx server component)

const REQUIRED_SERVER_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY",
  "FLUTTERWAVE_SECRET_KEY",
  "FLUTTERWAVE_WEBHOOK_HASH",
  "RESEND_API_KEY",
  "INTERNAL_API_SECRET",
  "TOKEN_ENCRYPTION_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_ROOT_DOMAIN",
  "NEXT_PUBLIC_APP_URL",
  "VERCEL_API_TOKEN",
  "VERCEL_PROJECT_ID",
];

export function validateRequiredEnvVars(): void {
  if (process.env.NODE_ENV !== "production") return; // Skip in dev

  const missing = REQUIRED_SERVER_VARS.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
      `Check Vercel dashboard → Settings → Environment Variables.`
    );
  }

  // Validate TOKEN_ENCRYPTION_KEY is exactly 32 bytes
  const key = process.env.TOKEN_ENCRYPTION_KEY!;
  if (Buffer.from(key, "hex").length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 32-byte hex string (64 hex characters).");
  }
}
```

---

## 15. IMPLEMENTATION ORDER

1. Generate all PWA icon sizes (prerequisite for manifest)
2. `public/manifest.json` — complete file
3. `public/sw.js` — service worker
4. `src/app/offline/page.tsx` — offline fallback
5. Add service worker registration to `layout.tsx`
6. `src/lib/handle/rules.ts` — handle validation utilities
7. `GET /api/handle/check` — already defined in ONBOARDING.md, ensure it uses rules.ts
8. `PATCH /api/handle/update` — handle change endpoint
9. Database migration (custom domain columns on websites table)
10. `POST /api/website/custom-domain` — add custom domain
11. `GET /api/website/custom-domain/status` — check status
12. `DELETE /api/website/custom-domain` — remove domain
13. `GET /api/cron/verify-custom-domains` — domain verification cron
14. `GET /api/revalidate` — on-demand cache revalidation
15. `src/lib/website/revalidate.ts` — revalidation helper (call from publish + section edit routes)
16. `src/lib/config/validate-env.ts` — startup validation
17. `vercel.json` — complete file with all crons
18. DNS configuration (add all records to your DNS provider)
19. Add domains in Vercel dashboard (zuri.com, www.zuri.com, *.zuri.com)
20. Set all environment variables in Vercel
21. `public/.well-known/assetlinks.json` — for TWA
22. Build Android APK with Bubblewrap
23. Submit to Google Play (internal testing track first)
24. Run deployment checklist end-to-end
