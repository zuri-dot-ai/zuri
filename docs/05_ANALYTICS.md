# ZURI — ANALYTICS SYSTEM
# Complete specification for website analytics, Meta Business API integration,
# Google Search Console, data collection, aggregation, retention, and the
# AI monthly performance report

---

## 1. SYSTEM OVERVIEW

Analytics in Zuri answers: **is my online presence working?** Every data source, metric, and report feeds this one question. The system is deliberately zero-setup for users — no tag installation, no third-party accounts required for basic analytics. Advanced integrations (Meta, Search Console) are single-click OAuth flows.

### Data Sources by Plan

| Source | Free | Pro | Growth | Premium |
|---|---|---|---|---|
| Zuri website analytics | No | Yes | Yes | Yes |
| Contact form submission tracking | No | Yes | Yes | Yes |
| Meta Business API (IG + FB insights) | No | No | Yes | Yes |
| Google Search Console | No | No | Yes | Yes |
| Content calendar activity tracking | No | Yes | Yes | Yes |
| AI monthly performance report | No | No | No | Yes |

### What Data Applies to Which Business

Not every metric is equally relevant to every archetype. The dashboard automatically weights and surfaces the most relevant data per business type.

| Archetype | Priority Metrics |
|---|---|
| warm-sensory | Form submissions, mobile traffic, social reach |
| authority-minimal | Search Console (queries + position), referrer sources |
| luxury-aspirational | Social engagement, Instagram impressions, referrers |
| editorial-bold | Social reach, Instagram story views, referrers |
| clean-modern | Search Console, session duration, top pages |
| portfolio-dramatic | Referrer sources (where clients find you), total unique visitors |
| community-vibrant | Form submissions, social follower growth, engagement rate |
| trust-professional | Search Console, form submissions, session duration |

---

## 2. WEBSITE ANALYTICS — DATA COLLECTION

### 2.1 Tracking Script

A lightweight inline script is injected into the `<head>` of every published Zuri website. It fires on page load and on route changes (for SPA-style navigation). Zero external dependencies — no analytics SDK, no cookies.

```typescript
// src/lib/analytics/tracking-script.ts
// This function returns the script string that gets embedded in generated sites

export function getTrackingScript(handle: string): string {
  return `
<script>
(function(){
  var _zh = '${handle}';
  function _zt() {
    fetch('https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        h: _zh,
        p: window.location.pathname,
        r: document.referrer ? document.referrer.split('?')[0] : '',
        w: window.innerWidth,
      }),
      keepalive: true
    }).catch(function(){});
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _zt);
  } else {
    _zt();
  }
  // Track subsequent route changes (for any SPA navigation)
  var _zp = location.pathname;
  setInterval(function() {
    if (location.pathname !== _zp) { _zp = location.pathname; _zt(); }
  }, 500);
})();
</script>`.trim();
}
```

The script sends only: handle, path, referrer (domain only, no query params), and viewport width (for device type inference). No IP address is sent from the client — the IP is captured server-side and immediately anonymized.

### 2.2 Tracking API Endpoint

```typescript
// src/app/api/analytics/track/route.ts

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { h: handle, p: path, r: referrer, w: viewportWidth } = body;

    // Basic validation — fail silently if invalid (tracking errors must not break sites)
    if (!handle || typeof handle !== "string") return new Response(null, { status: 204 });
    if (!path || typeof path !== "string") return new Response(null, { status: 204 });

    // Sanitize inputs
    const cleanHandle = handle.replace(/[^a-z0-9-]/g, "").slice(0, 30);
    const cleanPath = path.replace(/[<>"']/g, "").slice(0, 200);
    const cleanReferrer = typeof referrer === "string"
      ? extractDomain(referrer).slice(0, 200)
      : null;

    // IP anonymization — store only first 3 octets (IPv4) or first 3 groups (IPv6)
    const rawIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "0.0.0.0";
    const anonymizedIp = anonymizeIp(rawIp);

    // User agent (for device detection only)
    const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? "";

    // Country from Cloudflare/Vercel geo header (no IP geolocation needed)
    const country = req.headers.get("x-vercel-ip-country")
      ?? req.headers.get("cf-ipcountry")
      ?? null;

    // Device type from viewport width (simple, reliable)
    const deviceType = getDeviceType(Number(viewportWidth) || 0);

    // Rate limit: max 30 pageviews per handle per IP per minute (bot protection)
    // Using a simple in-memory check or Vercel KV if available
    const isRateLimited = await checkTrackingRateLimit(cleanHandle, anonymizedIp);
    if (isRateLimited) return new Response(null, { status: 204 }); // silent drop

    const supabase = createServiceClient();

    // Verify this is a published website (don't track preview sites)
    const { data: website } = await supabase
      .from("websites")
      .select("user_id, status")
      .eq("handle", cleanHandle)
      .single();

    if (!website || website.status !== "published") {
      return new Response(null, { status: 204 }); // silent drop
    }

    // Insert pageview
    await supabase.from("website_pageviews").insert({
      website_handle: cleanHandle,
      website_owner_id: website.user_id,
      page_path: cleanPath,
      referrer_domain: cleanReferrer,
      device_type: deviceType,
      country: country?.toUpperCase().slice(0, 2) ?? null,
      anonymized_ip: anonymizedIp,
    });

    return new Response(null, { status: 204 }); // No content — tracking pixels return nothing
  } catch (err) {
    // Tracking errors must never surface to the user
    console.error("Tracking error:", err);
    return new Response(null, { status: 204 });
  }
}

function anonymizeIp(ip: string): string {
  if (ip.includes(":")) {
    // IPv6 — keep first 3 groups
    const groups = ip.split(":");
    return groups.slice(0, 3).join(":") + ":0:0:0:0:0";
  }
  // IPv4 — keep first 3 octets
  const octets = ip.split(".");
  if (octets.length !== 4) return "0.0.0.0";
  return `${octets[0]}.${octets[1]}.${octets[2]}.0`;
}

function getDeviceType(viewportWidth: number): "mobile" | "tablet" | "desktop" {
  if (viewportWidth === 0) return "desktop"; // fallback
  if (viewportWidth < 768) return "mobile";
  if (viewportWidth < 1024) return "tablet";
  return "desktop";
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.replace(/^https?:\/\//i, "").split("/")[0].replace("www.", "");
  }
}
```

### 2.3 CTA Click Tracking

Contact form submissions are tracked separately (they already hit our API — see Website Builder MD). For CTA button clicks, we add a small event alongside the tracking script.

```typescript
// Additional event type: cta_click
// The tracking script can also accept events:
// fetch('.../api/analytics/event', { body: { h: handle, type: 'cta_click', label: 'hero_cta' }})
// This is embedded as a second function in the tracking script
// Events are stored in website_events table
```

---

## 3. DAILY AGGREGATION (CRON JOB)

Raw pageviews are aggregated into daily summaries every night at 01:00 WAT. Dashboard queries hit the aggregated table — never the raw data — for performance.

```typescript
// src/app/api/cron/aggregate-analytics/route.ts

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  // Get all handles that had activity yesterday
  const { data: activeHandles } = await supabase
    .from("website_pageviews")
    .select("website_handle")
    .eq("website_handle", yesterday.toISOString().split("T")[0])
    .gte("created_at", `${dateStr}T00:00:00Z`)
    .lte("created_at", `${dateStr}T23:59:59Z`);

  const handles = [...new Set((activeHandles ?? []).map(r => r.website_handle))];

  for (const handle of handles) {
    await aggregateDayForHandle(supabase, handle, dateStr);
  }

  return NextResponse.json({ ok: true, handles_processed: handles.length });
}

async function aggregateDayForHandle(
  supabase: SupabaseClient,
  handle: string,
  date: string
): Promise<void> {
  const { data: views } = await supabase
    .from("website_pageviews")
    .select("*")
    .eq("website_handle", handle)
    .gte("created_at", `${date}T00:00:00Z`)
    .lte("created_at", `${date}T23:59:59Z`);

  if (!views?.length) return;

  const totalViews = views.length;
  const uniqueVisitors = new Set(views.map(v => v.anonymized_ip)).size;
  const mobileViews = views.filter(v => v.device_type === "mobile").length;
  const desktopViews = views.filter(v => v.device_type === "desktop").length;
  const tabletViews = views.filter(v => v.device_type === "tablet").length;

  // Top referrers
  const referrerCounts: Record<string, number> = {};
  views.forEach(v => {
    if (v.referrer_domain) {
      referrerCounts[v.referrer_domain] = (referrerCounts[v.referrer_domain] ?? 0) + 1;
    }
  });
  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  // Country breakdown
  const countryCounts: Record<string, number> = {};
  views.forEach(v => {
    if (v.country) {
      countryCounts[v.country] = (countryCounts[v.country] ?? 0) + 1;
    }
  });

  await supabase.from("website_analytics_daily").upsert({
    website_handle: handle,
    date,
    total_views: totalViews,
    unique_visitors: uniqueVisitors,
    mobile_views: mobileViews,
    desktop_views: desktopViews,
    tablet_views: tabletViews,
    top_referrers: topReferrers,
    country_breakdown: countryCounts,
  }, { onConflict: "website_handle,date" });
}
```

---

## 4. META BUSINESS API INTEGRATION

### 4.1 OAuth Connection Flow

```typescript
// src/app/api/analytics/meta/connect/route.ts
// Step 1: Redirect user to Meta OAuth

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check plan — Meta API requires Growth+
  const gate = await checkFeatureAccess(supabase, user.id, "meta_analytics");
  if (!gate.allowed) {
    return NextResponse.json({ error: "Growth plan required", upgradeRequired: "growth" }, { status: 403 });
  }

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/analytics/meta/callback`,
    scope: [
      "pages_read_engagement",
      "pages_show_list",
      "instagram_basic",
      "instagram_manage_insights",
      "read_insights",
    ].join(","),
    state: user.id,  // Pass user_id as state for verification in callback
    response_type: "code",
  });

  return NextResponse.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${params}`);
}
```

```typescript
// src/app/api/analytics/meta/callback/route.ts
// Step 2: Exchange code for token, store, fetch initial data

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // user_id
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/analytics?meta_connect=failed`
    );
  }

  // Exchange code for short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?` +
    new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/analytics/meta/callback`,
      code,
    })
  );
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/analytics?meta_connect=failed`
    );
  }

  // Exchange for long-lived token (60-day expiry)
  const longTokenRes = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?` +
    new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      fb_exchange_token: tokenData.access_token,
    })
  );
  const longToken = await longTokenRes.json();

  const supabase = createServiceClient();

  // Encrypt token before storing
  const encryptedToken = encryptToken(longToken.access_token);
  const expiresAt = new Date(Date.now() + (longToken.expires_in * 1000));

  // Fetch user's pages and Instagram accounts
  const { pages, instagramAccount } = await fetchMetaAccounts(longToken.access_token);

  // Store connection
  await supabase.from("meta_connections").upsert({
    user_id: state,
    access_token_encrypted: encryptedToken,
    token_expires_at: expiresAt.toISOString(),
    facebook_page_id: pages[0]?.id ?? null,
    facebook_page_name: pages[0]?.name ?? null,
    instagram_account_id: instagramAccount?.id ?? null,
    instagram_username: instagramAccount?.username ?? null,
    connected_at: new Date().toISOString(),
    status: "active",
  }, { onConflict: "user_id" });

  // Trigger initial data fetch
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/analytics/meta/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET!,
    },
    body: JSON.stringify({ userId: state }),
  }).catch(() => {});

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/analytics?meta_connect=success`
  );
}
```

### 4.2 Meta Data Sync (runs daily via cron + on initial connect)

```typescript
// src/lib/analytics/meta-sync.ts

export async function syncMetaInsights(userId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: connection } = await supabase
    .from("meta_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!connection) return;

  // Check token expiry — refresh if within 7 days of expiry
  const expiresAt = new Date(connection.token_expires_at);
  const daysUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysUntilExpiry < 0) {
    // Token expired — mark connection as expired, notify user
    await supabase.from("meta_connections").update({
      status: "expired",
    }).eq("user_id", userId);
    await sendMetaTokenExpiredEmail(userId);
    return;
  }

  const token = decryptToken(connection.access_token_encrypted);
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const insights: MetaInsight[] = [];

  // Fetch Facebook Page insights
  if (connection.facebook_page_id) {
    try {
      const pageInsights = await fetchFacebookPageInsights(
        connection.facebook_page_id,
        token,
        startDate,
        endDate
      );
      insights.push(...pageInsights);
    } catch (err) {
      console.error("Facebook page insights fetch failed:", err);
    }
  }

  // Fetch Instagram insights
  if (connection.instagram_account_id) {
    try {
      const igInsights = await fetchInstagramInsights(
        connection.instagram_account_id,
        token,
        startDate,
        endDate
      );
      insights.push(...igInsights);
    } catch (err) {
      console.error("Instagram insights fetch failed:", err);
    }
  }

  // Store insights
  if (insights.length > 0) {
    await supabase.from("meta_insights").upsert(
      insights.map(i => ({ ...i, user_id: userId })),
      { onConflict: "user_id,platform,metric_name,period_date" }
    );
  }

  // Update last synced timestamp
  await supabase.from("meta_connections").update({
    last_synced_at: new Date().toISOString(),
  }).eq("user_id", userId);
}

async function fetchFacebookPageInsights(
  pageId: string,
  token: string,
  since: string,
  until: string
): Promise<MetaInsight[]> {
  const metrics = [
    "page_impressions",
    "page_reach",
    "page_fans",            // Total page likes/followers
    "page_views_total",
    "page_post_engagements",
  ];

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/insights?` +
    new URLSearchParams({
      metric: metrics.join(","),
      period: "day",
      since,
      until,
      access_token: token,
    }),
    { signal: AbortSignal.timeout(15000) }
  );

  if (!res.ok) throw new Error(`Facebook API error: ${res.status}`);
  const data = await res.json();

  return (data.data ?? []).flatMap((metric: any) =>
    (metric.values ?? []).map((v: any) => ({
      platform: "facebook",
      metric_name: metric.name,
      metric_value: Number(v.value) || 0,
      period_date: v.end_time?.split("T")[0] ?? new Date().toISOString().split("T")[0],
    }))
  );
}

async function fetchInstagramInsights(
  igUserId: string,
  token: string,
  since: string,
  until: string
): Promise<MetaInsight[]> {
  const metrics = [
    "impressions",
    "reach",
    "follower_count",
    "profile_views",
    "website_clicks",
  ];

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${igUserId}/insights?` +
    new URLSearchParams({
      metric: metrics.join(","),
      period: "day",
      since,
      until,
      access_token: token,
    }),
    { signal: AbortSignal.timeout(15000) }
  );

  if (!res.ok) throw new Error(`Instagram API error: ${res.status}`);
  const data = await res.json();

  return (data.data ?? []).flatMap((metric: any) =>
    (metric.values ?? []).map((v: any) => ({
      platform: "instagram",
      metric_name: metric.name,
      metric_value: Number(v.value) || 0,
      period_date: v.end_time?.split("T")[0] ?? new Date().toISOString().split("T")[0],
    }))
  );
}
```

### 4.3 Token Encryption

Never store Meta access tokens in plain text.

```typescript
// src/lib/analytics/token-encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, "hex"); // 32-byte hex string

export function encryptToken(token: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(encryptedToken: string): string {
  const [ivHex, tagHex, encryptedHex] = encryptedToken.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
```

---

## 5. GOOGLE SEARCH CONSOLE INTEGRATION

### 5.1 OAuth Connection

```typescript
// src/app/api/analytics/search-console/connect/route.ts

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gate = await checkFeatureAccess(supabase, user.id, "search_console");
  if (!gate.allowed) {
    return NextResponse.json({ error: "Growth plan required" }, { status: 403 });
  }

  const oauth2Url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  oauth2Url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  oauth2Url.searchParams.set("redirect_uri", `${process.env.NEXT_PUBLIC_APP_URL}/api/analytics/search-console/callback`);
  oauth2Url.searchParams.set("response_type", "code");
  oauth2Url.searchParams.set("scope", "https://www.googleapis.com/auth/webmasters.readonly");
  oauth2Url.searchParams.set("access_type", "offline");  // Get refresh token
  oauth2Url.searchParams.set("prompt", "consent");
  oauth2Url.searchParams.set("state", user.id);

  return NextResponse.redirect(oauth2Url.toString());
}
```

### 5.2 Search Console Data Fetch

```typescript
// src/lib/analytics/search-console-sync.ts

export async function syncSearchConsoleData(userId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: connection } = await supabase
    .from("search_console_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!connection) return;

  // Refresh access token using stored refresh token
  const accessToken = await refreshGoogleToken(decryptToken(connection.refresh_token_encrypted));

  // Get the site URL (handle.zuri.com or custom domain)
  const { data: website } = await supabase
    .from("websites")
    .select("handle, custom_domain")
    .eq("user_id", userId)
    .single();

  const siteUrl = website?.custom_domain
    ? `https://${website.custom_domain}/`
    : `https://${website?.handle}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/`;

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Fetch top queries
  const queriesRes = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 20,
        dataState: "final",
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (queriesRes.status === 403) {
    // Site not verified in Search Console — update status
    await supabase.from("search_console_connections").update({
      status: "site_not_verified",
    }).eq("user_id", userId);
    return;
  }

  const queriesData = await queriesRes.json();

  // Fetch top pages
  const pagesRes = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: 10,
        dataState: "final",
      }),
    }
  );
  const pagesData = await pagesRes.json();

  // Store
  await supabase.from("search_console_snapshots").upsert({
    user_id: userId,
    site_url: siteUrl,
    snapshot_date: new Date().toISOString().split("T")[0],
    top_queries: queriesData.rows ?? [],
    top_pages: pagesData.rows ?? [],
    total_clicks: (queriesData.rows ?? []).reduce((acc: number, r: any) => acc + (r.clicks ?? 0), 0),
    total_impressions: (queriesData.rows ?? []).reduce((acc: number, r: any) => acc + (r.impressions ?? 0), 0),
    avg_position: calculateAvgPosition(queriesData.rows ?? []),
  }, { onConflict: "user_id,snapshot_date" });

  await supabase.from("search_console_connections").update({
    last_synced_at: new Date().toISOString(),
  }).eq("user_id", userId);
}

function calculateAvgPosition(rows: any[]): number {
  if (!rows.length) return 0;
  const totalImpressions = rows.reduce((acc, r) => acc + (r.impressions ?? 0), 0);
  if (totalImpressions === 0) return 0;
  const weightedSum = rows.reduce((acc, r) => acc + ((r.position ?? 0) * (r.impressions ?? 0)), 0);
  return Math.round((weightedSum / totalImpressions) * 10) / 10;
}
```

---

## 6. ANALYTICS DATA API ROUTES

```typescript
// src/app/api/analytics/website/route.ts
// GET — returns website analytics for the dashboard

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gate = await checkFeatureAccess(supabase, user.id, "analytics_enabled");
  if (!gate.allowed) {
    return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "30d"; // 30d | 90d | 365d
  const { data: sub } = await supabase.from("subscriptions").select("plan_id").eq("user_id", user.id).single();
  const planId = sub?.plan_id ?? "free";

  // Enforce retention limits per plan
  const retentionDays = PLAN_CONFIG[planId]?.limits.analytics_retention_days ?? 30;
  const requestedDays = range === "365d" ? 365 : range === "90d" ? 90 : 30;
  const actualDays = Math.min(requestedDays, retentionDays);

  const { data: website } = await supabase
    .from("websites")
    .select("handle")
    .eq("user_id", user.id)
    .single();

  if (!website) return NextResponse.json({ error: "No website found" }, { status: 404 });

  const sinceDate = new Date(Date.now() - actualDays * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];

  // Fetch daily aggregates
  const { data: dailyData } = await supabase
    .from("website_analytics_daily")
    .select("*")
    .eq("website_handle", website.handle)
    .gte("date", sinceDate)
    .order("date", { ascending: true });

  // Fetch contact form submissions
  const { data: formSubmissions, count: formCount } = await supabase
    .from("contact_submissions")
    .select("created_at, service_interest", { count: "exact" })
    .eq("website_owner_id", user.id)
    .gte("created_at", `${sinceDate}T00:00:00Z`);

  // Calculate summary metrics
  const totalViews = (dailyData ?? []).reduce((a, d) => a + d.total_views, 0);
  const totalUniqueVisitors = (dailyData ?? []).reduce((a, d) => a + d.unique_visitors, 0);
  const avgDailyViews = dailyData?.length ? Math.round(totalViews / dailyData.length) : 0;

  // Device breakdown (sum across all days)
  const deviceBreakdown = {
    mobile: (dailyData ?? []).reduce((a, d) => a + d.mobile_views, 0),
    desktop: (dailyData ?? []).reduce((a, d) => a + d.desktop_views, 0),
    tablet: (dailyData ?? []).reduce((a, d) => a + d.tablet_views, 0),
  };

  // Top referrers (aggregate across all days)
  const referrerMap: Record<string, number> = {};
  (dailyData ?? []).forEach(d => {
    (d.top_referrers ?? []).forEach((r: { domain: string; count: number }) => {
      referrerMap[r.domain] = (referrerMap[r.domain] ?? 0) + r.count;
    });
  });
  const topReferrers = Object.entries(referrerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  // Previous period for comparison (same number of days, before sinceDate)
  const prevSinceDate = new Date(Date.now() - actualDays * 2 * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];
  const { data: prevData } = await supabase
    .from("website_analytics_daily")
    .select("total_views, unique_visitors")
    .eq("website_handle", website.handle)
    .gte("date", prevSinceDate)
    .lt("date", sinceDate);

  const prevTotalViews = (prevData ?? []).reduce((a, d) => a + d.total_views, 0);
  const viewsChange = prevTotalViews > 0
    ? Math.round(((totalViews - prevTotalViews) / prevTotalViews) * 100)
    : null;

  return NextResponse.json({
    range: `${actualDays}d`,
    summary: {
      total_views: totalViews,
      total_unique_visitors: totalUniqueVisitors,
      avg_daily_views: avgDailyViews,
      views_change_percent: viewsChange,
      form_submissions: formCount ?? 0,
    },
    daily_chart: (dailyData ?? []).map(d => ({
      date: d.date,
      views: d.total_views,
      unique_visitors: d.unique_visitors,
    })),
    device_breakdown: deviceBreakdown,
    top_referrers: topReferrers,
    form_submissions_by_service: aggregateFormsByService(formSubmissions ?? []),
  });
}

function aggregateFormsByService(submissions: any[]): { service: string; count: number }[] {
  const map: Record<string, number> = {};
  submissions.forEach(s => {
    const key = s.service_interest ?? "General inquiry";
    map[key] = (map[key] ?? 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([service, count]) => ({ service, count }));
}
```

---

## 7. AI MONTHLY PERFORMANCE REPORT (Premium)

Generated at the start of each month for the previous month. Stored and accessible in the dashboard.

```typescript
// src/lib/analytics/monthly-report-generator.ts

export async function generateMonthlyReport(userId: string): Promise<MonthlyReport> {
  const supabase = createServiceClient();

  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const monthName = prevMonth.toLocaleString("en-NG", { month: "long", year: "numeric" });
  const monthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1).toISOString().split("T")[0];
  const monthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).toISOString().split("T")[0];

  // Gather all analytics data for the month
  const [websiteData, metaData, searchData, contentData, formData] = await Promise.all([
    getWebsiteAnalyticsForPeriod(supabase, userId, monthStart, monthEnd),
    getMetaInsightsForPeriod(supabase, userId, monthStart, monthEnd),
    getSearchConsoleForPeriod(supabase, userId),
    getContentActivityForPeriod(supabase, userId, monthStart, monthEnd),
    getFormSubmissionsForPeriod(supabase, userId, monthStart, monthEnd),
  ]);

  const prompt = `
You are a digital marketing analyst writing a monthly performance report for a Nigerian small business.
Write a clear, encouraging, actionable report for ${monthName}.

WEBSITE ANALYTICS:
- Total page views: ${websiteData.total_views}
- Unique visitors: ${websiteData.unique_visitors}
- Change from previous month: ${websiteData.change_percent}%
- Top traffic source: ${websiteData.top_referrer ?? "direct"}
- Mobile traffic: ${websiteData.mobile_percent}%

SOCIAL MEDIA (Meta):
${metaData ? `
- Instagram reach: ${metaData.ig_reach}
- Instagram impressions: ${metaData.ig_impressions}
- Follower change: ${metaData.follower_change}
- Facebook reach: ${metaData.fb_reach}
` : "Not connected"}

SEARCH VISIBILITY:
${searchData ? `
- Total search impressions: ${searchData.impressions}
- Total clicks from search: ${searchData.clicks}
- Average position: ${searchData.avg_position}
- Top search query: ${searchData.top_query}
` : "Not connected"}

CONTENT ACTIVITY:
- Posts created: ${contentData.posts_created}
- Blog posts: ${contentData.blog_posts}
- Newsletters: ${contentData.newsletters}

CONTACT FORM ENQUIRIES:
- Total enquiries: ${formData.total}
- Most requested service: ${formData.top_service ?? "General"}

Write a structured report with these sections:
1. Executive Summary (2-3 sentences, encouraging and specific)
2. Website Performance (what happened, why it matters)
3. Social Media Performance (if data available)
4. Visibility on Search (if data available)
5. Top Win This Month (single most positive highlight)
6. One Area to Improve (honest, specific, actionable)
7. 3 Recommendations for Next Month (concrete, specific to this business)

Tone: professional but warm. Like a trusted advisor, not a corporate report.
Write for a Nigerian entrepreneur — reference local context where relevant.

Output ONLY valid JSON:
{
  "executive_summary": "2-3 sentence summary",
  "sections": [
    { "title": "Website Performance", "content": "section text" },
    { "title": "Social Media", "content": "..." },
    { "title": "Search Visibility", "content": "..." }
  ],
  "top_win": "single highlight",
  "improvement_area": "one specific area",
  "recommendations": ["rec 1", "rec 2", "rec 3"]
}
`;

  const report = await geminiJSON<MonthlyReport>(prompt, "pro");

  // Save to DB
  await supabase.from("monthly_reports").upsert({
    user_id: userId,
    report_month: monthStart,
    report_data: report,
    generated_at: new Date().toISOString(),
  }, { onConflict: "user_id,report_month" });

  return report;
}
```

### 7.1 Monthly Report Cron

```typescript
// src/app/api/cron/generate-monthly-reports/route.ts
// Runs on the 1st of every month at 06:00 WAT

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get all Premium users with published websites
  const { data: premiumUsers } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("plan_id", "premium")
    .eq("status", "active");

  if (!premiumUsers?.length) return NextResponse.json({ ok: true, generated: 0 });

  let generated = 0;
  for (const { user_id } of premiumUsers) {
    try {
      await generateMonthlyReport(user_id);
      generated++;
    } catch (err) {
      console.error(`Monthly report failed for ${user_id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, generated });
}
```

---

## 8. DATA RETENTION AND PURGING

```typescript
// src/app/api/cron/purge-analytics/route.ts
// Runs daily — removes raw pageviews beyond plan retention limit

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get all users and their retention limits
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("user_id, plan_id, status");

  for (const sub of subscriptions ?? []) {
    const planId = sub.status === "active" ? sub.plan_id : "free";
    const retentionDays = PLAN_CONFIG[planId]?.limits.analytics_retention_days;

    if (!retentionDays) continue; // Free plan — no analytics, nothing to purge

    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0];

    // Delete raw pageviews beyond retention
    await supabase
      .from("website_pageviews")
      .delete()
      .eq("website_owner_id", sub.user_id)
      .lt("created_at", `${cutoffDate}T00:00:00Z`);

    // Delete daily aggregates beyond retention
    await supabase
      .from("website_analytics_daily")
      .delete()
      .in(
        "website_handle",
        supabase.from("websites").select("handle").eq("user_id", sub.user_id)
      )
      .lt("date", cutoffDate);

    // Delete Meta insights beyond retention
    await supabase
      .from("meta_insights")
      .delete()
      .eq("user_id", sub.user_id)
      .lt("period_date", cutoffDate);
  }

  return NextResponse.json({ ok: true });
}
```

---

## 9. DATABASE SCHEMA

```sql
-- ============================================================
-- WEBSITE PAGEVIEWS (raw — purged per retention policy)
-- ============================================================
CREATE TABLE IF NOT EXISTS website_pageviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_handle text NOT NULL,
  website_owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  page_path text NOT NULL DEFAULT '/',
  referrer_domain text,
  device_type text,  -- mobile | tablet | desktop
  country char(2),
  anonymized_ip text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pageviews_handle_created ON website_pageviews(website_handle, created_at);
CREATE INDEX idx_pageviews_owner ON website_pageviews(website_owner_id, created_at);

-- ============================================================
-- WEBSITE EVENTS (CTA clicks, form opens, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS website_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_handle text NOT NULL,
  website_owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,  -- cta_click | form_open | section_view
  event_label text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_events_handle ON website_events(website_handle, created_at);

-- ============================================================
-- WEBSITE ANALYTICS DAILY (pre-aggregated — used for dashboard)
-- ============================================================
CREATE TABLE IF NOT EXISTS website_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_handle text NOT NULL,
  date date NOT NULL,
  total_views integer NOT NULL DEFAULT 0,
  unique_visitors integer NOT NULL DEFAULT 0,
  mobile_views integer NOT NULL DEFAULT 0,
  desktop_views integer NOT NULL DEFAULT 0,
  tablet_views integer NOT NULL DEFAULT 0,
  top_referrers jsonb NOT NULL DEFAULT '[]',
  country_breakdown jsonb NOT NULL DEFAULT '{}',
  UNIQUE(website_handle, date)
);

CREATE INDEX idx_analytics_daily_handle_date ON website_analytics_daily(website_handle, date);

-- ============================================================
-- META CONNECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS meta_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token_encrypted text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  facebook_page_id text,
  facebook_page_name text,
  instagram_account_id text,
  instagram_username text,
  status text NOT NULL DEFAULT 'active',  -- active | expired | disconnected
  connected_at timestamptz DEFAULT now(),
  last_synced_at timestamptz
);

ALTER TABLE meta_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own meta connection"
  ON meta_connections FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- META INSIGHTS (raw daily metrics from Meta API)
-- ============================================================
CREATE TABLE IF NOT EXISTS meta_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,  -- facebook | instagram
  metric_name text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  period_date date NOT NULL,
  UNIQUE(user_id, platform, metric_name, period_date)
);

ALTER TABLE meta_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own meta insights"
  ON meta_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages meta insights"
  ON meta_insights FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_meta_insights_user_date ON meta_insights(user_id, period_date);

-- ============================================================
-- SEARCH CONSOLE CONNECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS search_console_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  refresh_token_encrypted text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  -- status: active | site_not_verified | expired | disconnected
  connected_at timestamptz DEFAULT now(),
  last_synced_at timestamptz
);

ALTER TABLE search_console_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own search console connection"
  ON search_console_connections FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- SEARCH CONSOLE SNAPSHOTS (28-day rolling data)
-- ============================================================
CREATE TABLE IF NOT EXISTS search_console_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  site_url text NOT NULL,
  snapshot_date date NOT NULL,
  top_queries jsonb NOT NULL DEFAULT '[]',
  top_pages jsonb NOT NULL DEFAULT '[]',
  total_clicks integer DEFAULT 0,
  total_impressions integer DEFAULT 0,
  avg_position numeric DEFAULT 0,
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE search_console_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own search console data"
  ON search_console_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages search console data"
  ON search_console_snapshots FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- MONTHLY REPORTS (Premium AI reports)
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_month date NOT NULL,  -- First day of the month
  report_data jsonb NOT NULL,
  generated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, report_month)
);

ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own monthly reports"
  ON monthly_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages monthly reports"
  ON monthly_reports FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- TRENDING TOPICS CACHE (from Content Strategy MD — referenced here for completeness)
-- ============================================================
-- Already defined in 03_CONTENT_STRATEGY.md schema
```

---

## 10. ALL API ROUTES

| Method | Route | Description | Auth | Plan Gate |
|---|---|---|---|---|
| GET | /api/analytics/website | Website analytics summary + chart | Yes | Pro+ |
| POST | /api/analytics/track | Receive pageview from published site | Public | — |
| POST | /api/analytics/event | Receive CTA click event from published site | Public | — |
| GET | /api/analytics/meta/connect | Start Meta OAuth flow | Yes | Growth+ |
| GET | /api/analytics/meta/callback | Meta OAuth callback | Yes | Growth+ |
| GET | /api/analytics/meta/status | Check Meta connection status | Yes | Growth+ |
| DELETE | /api/analytics/meta/disconnect | Disconnect Meta | Yes | Growth+ |
| POST | /api/analytics/meta/sync | Manual sync trigger | Yes | Growth+ |
| GET | /api/analytics/meta/insights | Get Meta insights for dashboard | Yes | Growth+ |
| GET | /api/analytics/search-console/connect | Start Google OAuth flow | Yes | Growth+ |
| GET | /api/analytics/search-console/callback | Google OAuth callback | Yes | Growth+ |
| GET | /api/analytics/search-console/data | Get Search Console data | Yes | Growth+ |
| GET | /api/analytics/reports | Get list of monthly reports | Yes | Premium |
| GET | /api/analytics/reports/[month] | Get specific monthly report | Yes | Premium |

---

## 11. PRIVACY COMPLIANCE (NDPA + GDPR)

### What We Collect

| Data Point | Stored? | PII? | Retention |
|---|---|---|---|
| Full IP address | Never — anonymized immediately | No | — |
| Anonymized IP (first 3 octets) | Yes | No | Per plan limit |
| Page path | Yes | No | Per plan limit |
| Referrer domain only (no path/query) | Yes | No | Per plan limit |
| Viewport width | Yes (device type inferred, raw not stored) | No | — |
| Country code | Yes | No | Per plan limit |
| User agent | Yes (for device detection) | No | Per plan limit |

### Privacy Requirements

1. **Cookie-free tracking**: Zero cookies set by the tracking script. Compliant with NDPA and GDPR without a consent banner for analytics alone.
2. **No cross-site tracking**: The tracking script only fires on Zuri-generated sites and only reports to Zuri. No third-party analytics SDK.
3. **IP anonymization**: IP is anonymized server-side before any DB write. Raw IP is never persisted.
4. **Data deletion**: When a user deletes their Zuri account, ALL analytics data (pageviews, events, Meta insights, Search Console snapshots, monthly reports) is deleted via CASCADE on the auth.users foreign key.
5. **Opt-out toggle**: Users can disable analytics tracking for their website in Settings → Website → "Disable visitor analytics." When disabled: the tracking script is removed from their published site and no pageviews are recorded.
6. **Privacy policy disclosure**: The Zuri privacy policy must state: "When you visit a website built with Zuri, we collect anonymised usage data including page views, approximate location (country only), and device type. No personally identifiable information is collected."
7. **Visitor transparency**: A "Privacy" link in every generated website footer links to a page explaining that the site uses Zuri analytics (cookie-free, anonymous).

```sql
-- Analytics opt-out flag on websites table (add this column)
ALTER TABLE websites ADD COLUMN IF NOT EXISTS analytics_enabled boolean DEFAULT true;
```

---

## 12. DASHBOARD UI REQUIREMENTS

### Analytics Page Layout (`/dashboard/analytics`)

**Header:**
- "Analytics" title with date range selector: Last 30 days | Last 90 days | Last year
- Range selector disabled / grayed out options that exceed plan's retention (e.g. Pro users see "Last year" grayed with "Growth plan required" tooltip)
- Integration status chips: "Website Connected ✓" | "Meta: Connect" | "Search Console: Connect"

**Pro Plan Dashboard:**
- Row 1: 4 stat cards — Total Views, Unique Visitors, Form Enquiries, Top Traffic Source
- Each card shows: value + % change from previous period (up/down arrow, green/red)
- Row 2: Line chart — daily views over selected range
- Row 3: Two columns — Device Breakdown (donut chart) + Top Referrers (bar list)
- Row 4: Form Enquiries by Service (horizontal bar chart)

**Growth Plan Dashboard (everything above, plus):**
- Row 5: Meta Overview — Instagram Followers, IG Reach (28 days), FB Page Reach (28 days)
- Row 6: Top Posts (from Meta — 3 best performing posts with metrics)
- Row 7: Search Console — Total Impressions, Total Clicks, Avg Position, Top Queries (table)
- Integration setup CTAs shown when not connected (full-width prompt cards)

**Premium Plan Dashboard (everything above, plus):**
- Monthly Report card at top of page: "Your [Month] report is ready" → expands inline or links to full report page
- AI insights panel alongside the stat cards: 2-3 AI-generated observations about the data

### Empty States

- No website published: "Publish your website to start tracking visitors."
- Website published but no views yet: "Your analytics will appear here once visitors start arriving. Share your site to get started."
- Meta not connected: "Connect Instagram & Facebook to see your social media performance alongside your website data." [Connect] button
- Search Console not connected: "Connect Google Search Console to see how people find your site on Google." [Connect] button
- Premium report not yet generated (first month): "Your first monthly report will be ready on [date]."

---

## 13. VERCEL CRON JOBS (additions to vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/process-subscriptions",
      "schedule": "0 23 * * *"
    },
    {
      "path": "/api/cron/aggregate-analytics",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/sync-meta-insights",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/sync-search-console",
      "schedule": "0 4 * * *"
    },
    {
      "path": "/api/cron/purge-analytics",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/generate-monthly-reports",
      "schedule": "0 6 1 * *"
    }
  ]
}
```

---

## 14. ENVIRONMENT VARIABLES REQUIRED

```env
META_APP_ID=...
META_APP_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
TOKEN_ENCRYPTION_KEY=...    # 32-byte hex string (generate with: openssl rand -hex 32)
CRON_SECRET=...             # From MONETIZATION.md
```

---

## 15. ERROR HANDLING — COMPLETE MAP

| Scenario | System Action | User-Facing Message |
|---|---|---|
| Tracking script fetch fails (network) | `catch` silently — never breaks the website | None — tracking is fire-and-forget |
| Tracking receives invalid handle | Return 204, don't log | None |
| Tracking from bot/crawler | Rate limit check catches it, drop silently | None |
| Daily aggregation cron fails for one handle | Log error, continue with next handle | None — admin alert only |
| Meta OAuth user denies permission | Redirect to analytics page with error state | "Meta connection was not completed. Please try again." |
| Meta access token expired | Mark connection as expired, send email | In-dashboard banner: "Your Meta connection has expired. Reconnect to continue seeing social insights." [Reconnect] |
| Meta API rate limit (200 calls/hour) | Back off with exponential retry in next cron run | None — data simply doesn't refresh that day |
| Meta API returns partial data (some metrics missing) | Store what was received, leave missing metrics as null | No error — dashboard shows available data only |
| Search Console OAuth user denies | Redirect with error state | "Google connection was not completed. Please try again." |
| Search Console site not verified | Update status to site_not_verified | "Your website is not verified in Google Search Console. [View setup guide]" |
| Search Console API returns 403 | Mark as site_not_verified | Same as above |
| Search Console refresh token expired | Mark as expired, prompt reconnect | "Your Google connection has expired. Reconnect to restore search data." |
| Analytics requested beyond plan retention | Return data for allowed period only | Date range selector shows warning: "Your plan includes 30 days of history. [Upgrade for more]" |
| Monthly report generation fails (Gemini) | Retry once next day. After 3 failures: mark as failed, admin alert | "Your monthly report is delayed. We'll deliver it soon." |
| User deletes account — analytics cascade | ON DELETE CASCADE handles all tables | None — clean deletion |
| Analytics opt-out toggled | Remove tracking script from published site on next render | "Visitor analytics disabled. Your site data will no longer be collected." |
| Encryption key missing (token_encryption_key) | Throw on startup — do not allow the app to run | Server error in logs — fix before deployment |
| Pageviews stored but aggregation missed | Next cron run re-aggregates missing dates (idempotent upsert) | None |

---

## 16. IMPLEMENTATION ORDER

1. `src/lib/analytics/tracking-script.ts` — no dependencies
2. `src/lib/analytics/token-encryption.ts` — no dependencies
3. Database migration (all tables above)
4. Add `analytics_enabled` column to websites table
5. `src/app/api/analytics/track/route.ts`
6. `src/app/api/analytics/event/route.ts`
7. Inject tracking script into BlockRenderer (generated sites only, check analytics_enabled)
8. `src/app/api/cron/aggregate-analytics/route.ts`
9. `src/app/api/analytics/website/route.ts` — website analytics query
10. `src/lib/analytics/meta-sync.ts`
11. `src/app/api/analytics/meta/connect/route.ts` and `callback/route.ts`
12. `src/app/api/analytics/meta/insights/route.ts`
13. `src/app/api/cron/sync-meta-insights/route.ts`
14. `src/lib/analytics/search-console-sync.ts`
15. `src/app/api/analytics/search-console/connect/route.ts` and `callback/route.ts`
16. `src/app/api/analytics/search-console/data/route.ts`
17. `src/app/api/cron/sync-search-console/route.ts`
18. `src/lib/analytics/monthly-report-generator.ts`
19. `src/app/api/cron/generate-monthly-reports/route.ts`
20. `src/app/api/cron/purge-analytics/route.ts`
21. Update `vercel.json` with all cron schedules
22. Analytics dashboard page (`/dashboard/analytics`)
23. Meta and Search Console connection UI (settings cards)
24. Monthly report display page (`/dashboard/analytics/reports/[month]`)
