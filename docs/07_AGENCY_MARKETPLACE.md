# ZURI — AGENCY MARKETPLACE SYSTEM
# Complete specification for the agency directory, inquiry system,
# agency application flow, client discoverability, and admin management

---

## 1. SYSTEM OVERVIEW

The Agency Marketplace connects Zuri users with vetted Nigerian digital service agencies. It is a **curated one-sided directory** in v1 — Zuri users browse and contact agencies; agencies do not have a portal or login. All agency listings are manually approved by the Zuri team before going live. This keeps quality high and scope manageable for the competition deadline.

### Two Directions of Value

**Direction A — User finds Agency:**
Growth+ users browse the agency directory, filter by service and location, and send structured inquiries to agencies they want to hire.

**Direction B — Agency finds User (Client Discoverability):**
Growth+ Zuri users opt into being discoverable by agencies. Vetted agencies receive a curated client digest (managed by the Zuri team) that lists businesses looking for agency services. No agency login required — this is a managed email digest in v1, upgradeable to a full agency portal in v2.

### What Agencies Offer Zuri Users

| Service Category | Description |
|---|---|
| Social media management | Full management of content calendar, posting, and engagement |
| Content creation | Photography, videography, graphic design for social posts |
| Paid advertising | Meta Ads, Google Ads management |
| Branding | Logo, brand identity, brand guidelines |
| Digital PR | Press coverage, influencer outreach |
| Email marketing | Newsletter management, list building, campaigns |
| SEO | Search visibility, blog strategy, link building |
| Website design | Custom website builds (for unsupported Zuri branches) |

---

## 2. AGENCY DATA MODEL

### 2.1 Agency Profile Schema

```typescript
// src/lib/agencies/types.ts

export interface Agency {
  id: string;
  name: string;
  slug: string;                          // URL-friendly unique identifier
  logo_url: string | null;
  cover_image_url: string | null;
  tagline: string;                       // Max 80 chars — what they do in one line
  description: string;                   // Max 500 chars — expanded about
  location_city: string;                 // Lagos | Abuja | Port Harcourt | etc.
  services: AgencyService[];            // What they offer (multi-select)
  price_range: "budget" | "mid" | "premium";
  // budget = ₦50k-₦150k/month | mid = ₦150k-₦500k/month | premium = ₦500k+/month
  team_size: "solo" | "small" | "medium" | "large";
  // solo = 1 person | small = 2-10 | medium = 11-50 | large = 50+
  portfolio_items: PortfolioItem[];      // Up to 5 items
  contact_email: string;
  contact_whatsapp: string | null;
  response_time: "under_24h" | "1_2_days" | "3_5_days";
  is_featured: boolean;                  // Paid or manually featured by Zuri
  is_verified: boolean;                  // Zuri has personally worked with this agency
  is_zuri_certified: boolean;            // Highest tier — Zuri-recommended partner
  is_active: boolean;
  inquiries_count: number;              // Non-private: signals popularity
  created_at: string;
}

export type AgencyService =
  | "social_media_management"
  | "content_creation"
  | "photography_videography"
  | "paid_advertising"
  | "branding"
  | "digital_pr"
  | "email_marketing"
  | "seo"
  | "website_design"
  | "graphic_design"
  | "influencer_marketing"
  | "copywriting";

export interface PortfolioItem {
  title: string;           // Max 60 chars
  description: string;     // Max 150 chars
  url: string;             // External link to work
  image_url: string | null;
}
```

### 2.2 Service Labels (for UI display)

```typescript
export const AGENCY_SERVICE_LABELS: Record<AgencyService, string> = {
  social_media_management: "Social Media Management",
  content_creation: "Content Creation",
  photography_videography: "Photography & Videography",
  paid_advertising: "Paid Advertising",
  branding: "Branding & Identity",
  digital_pr: "Digital PR",
  email_marketing: "Email Marketing",
  seo: "SEO",
  website_design: "Website Design",
  graphic_design: "Graphic Design",
  influencer_marketing: "Influencer Marketing",
  copywriting: "Copywriting",
};

export const PRICE_RANGE_LABELS: Record<string, string> = {
  budget: "₦ Budget-friendly",
  mid: "₦₦ Mid-range",
  premium: "₦₦₦ Premium",
};

export const RESPONSE_TIME_LABELS: Record<string, string> = {
  under_24h: "Responds within 24 hours",
  "1_2_days": "Responds in 1–2 days",
  "3_5_days": "Responds in 3–5 days",
};

export const TEAM_SIZE_LABELS: Record<string, string> = {
  solo: "Solo / Freelancer",
  small: "Small team (2–10)",
  medium: "Medium team (11–50)",
  large: "Large agency (50+)",
};
```

---

## 3. AGENCY LISTING API

```typescript
// src/app/api/agencies/route.ts
// GET — public list of active agencies with filters

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const services = searchParams.getAll("service");         // ?service=seo&service=branding
  const priceRange = searchParams.get("price_range");      // budget | mid | premium
  const location = searchParams.get("location");           // Lagos | Abuja | all
  const search = searchParams.get("q");                    // text search
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 12;

  const supabase = createServiceClient();
  let query = supabase
    .from("agencies")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .order("is_featured", { ascending: false })   // Featured agencies always first
    .order("is_zuri_certified", { ascending: false })
    .order("is_verified", { ascending: false })
    .order("inquiries_count", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  // Service filter
  if (services.length > 0) {
    query = query.overlaps("services", services);
  }

  // Price range filter
  if (priceRange && ["budget", "mid", "premium"].includes(priceRange)) {
    query = query.eq("price_range", priceRange);
  }

  // Location filter
  if (location && location !== "all") {
    query = query.ilike("location_city", `%${location}%`);
  }

  // Text search — searches name, tagline, and description
  if (search && search.length >= 2) {
    const cleanSearch = sanitizeText(search).slice(0, 50);
    query = query.or(
      `name.ilike.%${cleanSearch}%,tagline.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%`
    );
  }

  const { data: agencies, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to load agencies" }, { status: 500 });
  }

  return NextResponse.json({
    agencies: agencies ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  });
}
```

```typescript
// src/app/api/agencies/[slug]/route.ts
// GET — single agency detail page

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug?.replace(/[^a-z0-9-]/g, "").slice(0, 60);
  if (!slug) return NextResponse.json({ error: "Invalid slug" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: agency } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

  return NextResponse.json({ agency });
}
```

---

## 4. INQUIRY SYSTEM

### 4.1 Sending an Inquiry

```typescript
// src/app/api/agencies/inquire/route.ts

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check plan — Growth+ required to contact agencies
  const gate = await checkFeatureAccess(supabase, user.id, "can_contact_agencies");
  if (!gate.allowed) {
    return NextResponse.json({
      error: "Growth plan required to contact agencies",
      upgradeRequired: "growth",
    }, { status: 403 });
  }

  const body = await req.json();
  const { agencyId, serviceNeeded, message, budget } = body;

  // ── Validation ──────────────────────────────────────────────────────────────
  const errors: string[] = [];

  if (!agencyId || typeof agencyId !== "string") errors.push("Agency ID is required");

  const cleanMessage = sanitizeText(message ?? "");
  if (!cleanMessage || cleanMessage.length < 10) errors.push("Message must be at least 10 characters");
  if (cleanMessage.length > 1000) errors.push("Message must be 1000 characters or fewer");

  if (serviceNeeded && !Object.keys(AGENCY_SERVICE_LABELS).includes(serviceNeeded)) {
    errors.push("Invalid service selected");
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  // ── Verify agency exists and is active ──────────────────────────────────────
  const supabaseService = createServiceClient();
  const { data: agency } = await supabaseService
    .from("agencies")
    .select("id, name, contact_email, response_time")
    .eq("id", agencyId)
    .eq("is_active", true)
    .single();

  if (!agency) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  }

  // ── Rate limit: max 3 inquiries to the same agency per user per 30 days ─────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentInquiries } = await supabase
    .from("agency_inquiries")
    .select("id", { count: "exact" })
    .eq("user_id", user.id)
    .eq("agency_id", agencyId)
    .gte("created_at", thirtyDaysAgo);

  if ((recentInquiries ?? 0) >= 3) {
    return NextResponse.json({
      error: "You have already sent 3 inquiries to this agency in the past 30 days.",
    }, { status: 429 });
  }

  // ── Fetch user profile for pre-fill ─────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const { data: brand } = await supabase
    .from("business_profiles")
    .select("business_name, industry, services, location_city, location")
    .eq("user_id", user.id)
    .single();

  // ── Save inquiry ─────────────────────────────────────────────────────────────
  const { data: inquiry } = await supabaseService.from("agency_inquiries").insert({
    agency_id: agencyId,
    user_id: user.id,
    user_name: profile?.full_name ?? "Zuri User",
    user_email: profile?.email ?? user.email,
    user_business_name: brand?.business_name ?? "Unknown Business",
    user_industry: brand?.industry ?? null,
    user_location: brand?.location_city ?? brand?.location ?? null,
    service_needed: serviceNeeded ?? null,
    message: cleanMessage,
    budget: budget ? sanitizeText(budget).slice(0, 50) : null,
    status: "sent",
  }).select().single();

  // ── Increment agency inquiries count ─────────────────────────────────────────
  await supabaseService.rpc("increment_agency_inquiries", { agency_id: agencyId });

  // ── Send email to agency via Resend ──────────────────────────────────────────
  await sendAgencyInquiryEmail({
    agencyEmail: agency.contact_email,
    agencyName: agency.name,
    userBusinessName: brand?.business_name ?? "A Zuri business",
    userName: profile?.full_name ?? "A Zuri user",
    userEmail: profile?.email ?? user.email ?? "",
    userIndustry: brand?.industry ?? null,
    userLocation: brand?.location_city ?? brand?.location ?? null,
    serviceNeeded: serviceNeeded ? AGENCY_SERVICE_LABELS[serviceNeeded as AgencyService] : null,
    message: cleanMessage,
    budget: budget ?? null,
    inquiryId: inquiry?.id ?? "",
  });

  // ── Send confirmation to user ─────────────────────────────────────────────────
  if (profile?.email) {
    await sendInquiryConfirmationEmail({
      userEmail: profile.email,
      userName: profile.full_name,
      agencyName: agency.name,
      responseTime: RESPONSE_TIME_LABELS[agency.response_time],
    });
  }

  return NextResponse.json({
    success: true,
    inquiryId: inquiry?.id,
    message: `Your inquiry has been sent to ${agency.name}. They ${RESPONSE_TIME_LABELS[agency.response_time].toLowerCase()}.`,
  });
}
```

### 4.2 Inquiry Status Tracking (user side)

Users can mark inquiries as "responded" or "not responded." This data is used (aggregated, anonymously) to surface reliable agencies in the directory order.

```typescript
// src/app/api/agencies/inquire/[id]/status/route.ts

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  // ... auth check ...
  const { status } = await req.json(); // "responded" | "not_responded" | "hired"

  const validStatuses = ["responded", "not_responded", "hired"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await supabase
    .from("agency_inquiries")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", user.id); // Ensure user can only update their own inquiries

  return NextResponse.json({ success: true });
}
```

---

## 5. AGENCY APPLICATION FLOW

Agencies apply to be listed via a public form at `/agencies/apply`. No account required. All applications are reviewed manually by the Zuri team before the agency appears in the marketplace.

### 5.1 Application API

```typescript
// src/app/api/agencies/apply/route.ts
// PUBLIC — no auth required

export async function POST(req: Request) {
  const body = await req.json();

  // ── Validation ──────────────────────────────────────────────────────────────
  const errors: string[] = [];

  const agencyName = sanitizeText(body.agency_name ?? "");
  if (!agencyName || agencyName.length < 2) errors.push("Agency name is required");
  if (agencyName.length > 100) errors.push("Agency name too long");

  const contactName = sanitizeText(body.contact_name ?? "");
  if (!contactName || contactName.length < 2) errors.push("Contact name is required");

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Valid email address is required");
  }

  const locationCity = sanitizeText(body.location_city ?? "");
  if (!locationCity) errors.push("Location is required");

  const services: string[] = (body.services ?? []).filter(
    (s: string) => Object.keys(AGENCY_SERVICE_LABELS).includes(s)
  );
  if (services.length === 0) errors.push("At least one service must be selected");

  const description = sanitizeText(body.description ?? "");
  if (!description || description.length < 30) errors.push("Description must be at least 30 characters");
  if (description.length > 500) errors.push("Description must be 500 characters or fewer");

  const portfolioUrls: string[] = (body.portfolio_urls ?? [])
    .map((u: string) => u.trim())
    .filter((u: string) => {
      try { new URL(u); return true; } catch { return false; }
    })
    .slice(0, 5);

  if (!["budget", "mid", "premium"].includes(body.price_range)) {
    errors.push("Price range is required");
  }

  if (!["solo", "small", "medium", "large"].includes(body.team_size)) {
    errors.push("Team size is required");
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  // ── Rate limit: max 1 application per email per 30 days ─────────────────────
  const supabase = createServiceClient();
  const { count: existingApps } = await supabase
    .from("agency_applications")
    .select("id", { count: "exact" })
    .eq("email", email)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if ((existingApps ?? 0) > 0) {
    return NextResponse.json({
      error: "An application from this email address was recently submitted. Please allow up to 7 business days for review.",
    }, { status: 429 });
  }

  // ── Check for duplicate agency name ─────────────────────────────────────────
  const { data: existingAgency } = await supabase
    .from("agencies")
    .select("id")
    .ilike("name", agencyName)
    .single();

  if (existingAgency) {
    return NextResponse.json({
      error: "An agency with this name is already listed on Zuri. If this is your agency, contact support.",
    }, { status: 409 });
  }

  // ── Save application ─────────────────────────────────────────────────────────
  await supabase.from("agency_applications").insert({
    agency_name: agencyName,
    contact_name: contactName,
    email,
    phone: body.phone ? sanitizeText(body.phone).slice(0, 20) : null,
    location_city: locationCity,
    services,
    team_size: body.team_size,
    price_range: body.price_range,
    portfolio_urls: portfolioUrls,
    description,
    referral_source: body.referral_source ? sanitizeText(body.referral_source).slice(0, 100) : null,
    status: "pending",
  });

  // ── Notify Zuri team ─────────────────────────────────────────────────────────
  await sendNewAgencyApplicationAlert({
    agencyName,
    contactName,
    email,
    services: services.map(s => AGENCY_SERVICE_LABELS[s as AgencyService]).join(", "),
  });

  // ── Confirmation to applicant ─────────────────────────────────────────────────
  await sendAgencyApplicationConfirmation({
    email,
    contactName,
    agencyName,
  });

  return NextResponse.json({
    success: true,
    message: "Your application has been received. We review all applications within 7 business days and will be in touch.",
  });
}
```

---

## 6. CLIENT DISCOVERABILITY (Growth+ Feature)

Zuri users on Growth and Premium plans can opt into being discoverable by vetted agencies. In v1, this is managed as a curated email digest sent to approved agencies — no agency login portal required.

### 6.1 Opt-In Toggle

```typescript
// In user Settings → Profile → Agency Discoverability
// Toggle: "Allow agencies to discover my business for potential partnerships"

// When toggled ON:
// - Set profiles.agency_discoverable = true
// - User's business profile becomes visible in the client digest

// When toggled OFF:
// - Set profiles.agency_discoverable = false
// - Profile removed from next digest

// Only available for Growth+ users — show with upgrade prompt for Pro/Free
```

```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agency_discoverable boolean DEFAULT false;
```

### 6.2 Client Digest Generation (Admin Tool)

A simple admin-only endpoint that generates the client digest for agencies. This is sent manually by the Zuri team to vetted agencies.

```typescript
// src/app/api/admin/agency-client-digest/route.ts
// Admin-only — protected by is_admin check

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch discoverable Growth/Premium users with their business profiles
  const { data: discoverableUsers } = await supabase
    .from("profiles")
    .select(`
      full_name,
      agency_discoverable,
      subscriptions!inner(plan_id),
      business_profiles!inner(
        business_name,
        industry,
        services,
        location_city,
        location,
        target_audience,
        platforms,
        brand_vibe
      )
    `)
    .eq("agency_discoverable", true)
    .in("subscriptions.plan_id", ["growth", "premium"])
    .eq("subscriptions.status", "active");

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    total_businesses: discoverableUsers?.length ?? 0,
    businesses: (discoverableUsers ?? []).map(u => ({
      business_name: (u as any).business_profiles?.business_name,
      industry: (u as any).business_profiles?.industry,
      services: (u as any).business_profiles?.services,
      location: (u as any).business_profiles?.location_city ?? (u as any).business_profiles?.location,
      platforms: (u as any).business_profiles?.platforms,
      plan: (u as any).subscriptions?.plan_id,
    })),
  });
}
```

---

## 7. DATABASE SCHEMA

```sql
-- ============================================================
-- AGENCIES
-- ============================================================
CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  cover_image_url text,
  tagline text NOT NULL,
  description text NOT NULL,
  location_city text NOT NULL,
  services text[] NOT NULL DEFAULT '{}',
  price_range text NOT NULL,  -- budget | mid | premium
  team_size text NOT NULL,    -- solo | small | medium | large
  portfolio_items jsonb NOT NULL DEFAULT '[]',
  contact_email text NOT NULL,
  contact_whatsapp text,
  response_time text NOT NULL DEFAULT '1_2_days',
  is_featured boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  is_zuri_certified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  inquiries_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- No RLS on agencies — public read
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agencies are public read" ON agencies FOR SELECT USING (is_active = true);
CREATE POLICY "Admin manages agencies" ON agencies FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE INDEX idx_agencies_services ON agencies USING gin(services);
CREATE INDEX idx_agencies_active_featured ON agencies(is_active, is_featured DESC, is_zuri_certified DESC);
CREATE INDEX idx_agencies_slug ON agencies(slug);

-- Atomic increment for inquiries_count
CREATE OR REPLACE FUNCTION increment_agency_inquiries(agency_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE agencies SET inquiries_count = inquiries_count + 1
  WHERE id = agency_id;
END;
$$;

-- ============================================================
-- AGENCY INQUIRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS agency_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name text NOT NULL,
  user_email text NOT NULL,
  user_business_name text NOT NULL,
  user_industry text,
  user_location text,
  service_needed text,
  message text NOT NULL,
  budget text,
  status text NOT NULL DEFAULT 'sent',
  -- status: sent | responded | not_responded | hired
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agency_inquiries ENABLE ROW LEVEL SECURITY;
-- Users can only see and manage their own inquiries
CREATE POLICY "Users manage own inquiries"
  ON agency_inquiries FOR ALL USING (auth.uid() = user_id);
-- Admin can read all
CREATE POLICY "Admin reads all inquiries"
  ON agency_inquiries FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX idx_agency_inquiries_user ON agency_inquiries(user_id, created_at);
CREATE INDEX idx_agency_inquiries_agency ON agency_inquiries(agency_id, created_at);

-- ============================================================
-- AGENCY APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS agency_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  location_city text NOT NULL,
  services text[] NOT NULL DEFAULT '{}',
  team_size text,
  price_range text,
  portfolio_urls text[] DEFAULT '{}',
  description text NOT NULL,
  referral_source text,
  status text NOT NULL DEFAULT 'pending',
  -- status: pending | approved | rejected
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Applications are admin-only
ALTER TABLE agency_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages applications"
  ON agency_applications FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX idx_agency_applications_status ON agency_applications(status, created_at);
CREATE INDEX idx_agency_applications_email ON agency_applications(email);

-- ============================================================
-- AGENCY DISCOVERABILITY (addition to profiles — already in schema section)
-- ============================================================
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agency_discoverable boolean DEFAULT false;
-- (listed here for reference — run once in migration)
```

---

## 8. ADMIN AGENCY MANAGEMENT

The Zuri team manages all agency listings through an admin interface. No self-serve agency portal in v1.

```typescript
// src/app/api/admin/agencies/route.ts
// Admin-only CRUD for agency listings

// POST — Create a new agency listing (after approving an application)
export async function POST(req: Request) {
  // ... admin check ...
  const body = await req.json();

  // Validate all fields (same rules as application, plus logo_url, cover_image_url)
  // Generate slug from agency name
  const slug = generateSlug(body.name);

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("agencies")
    .select("id")
    .eq("slug", slug)
    .single();

  const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

  const { data: agency } = await supabase.from("agencies").insert({
    ...validatedBody,
    slug: finalSlug,
    is_active: false, // Start inactive — admin activates manually after final review
  }).select().single();

  // If application_id was provided, mark it as approved
  if (body.application_id) {
    await supabase.from("agency_applications").update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
    }).eq("id", body.application_id);

    // Send approval email to agency
    await sendAgencyApprovalEmail({
      email: body.contact_email,
      agencyName: body.name,
      listingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/agencies/${finalSlug}`,
    });
  }

  return NextResponse.json({ agency });
}

// PATCH — Update an agency (toggle featured, verified, active)
export async function PATCH(req: Request) {
  // ... admin check ...
  const { id, ...updates } = await req.json();

  // Only allow safe fields to be updated
  const allowedFields = [
    "is_featured", "is_verified", "is_zuri_certified", "is_active",
    "tagline", "description", "services", "price_range",
    "logo_url", "cover_image_url", "response_time",
    "contact_email", "contact_whatsapp",
  ];
  const safeUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key]) => allowedFields.includes(key))
  );

  await supabase.from("agencies").update({
    ...safeUpdates,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  return NextResponse.json({ success: true });
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);
}
```

---

## 9. ALL API ROUTES

| Method | Route | Description | Auth | Plan Gate |
|---|---|---|---|---|
| GET | /api/agencies | List agencies with filters | Public | — |
| GET | /api/agencies/[slug] | Get single agency profile | Public | — |
| POST | /api/agencies/inquire | Send inquiry to agency | Yes | Growth+ |
| GET | /api/agencies/inquiries | Get user's sent inquiries | Yes | Growth+ |
| PATCH | /api/agencies/inquire/[id]/status | Update inquiry status | Yes | Growth+ |
| POST | /api/agencies/apply | Submit agency listing application | Public | — |
| GET | /api/admin/agencies | Admin: list all agencies | Admin | — |
| POST | /api/admin/agencies | Admin: create agency listing | Admin | — |
| PATCH | /api/admin/agencies | Admin: update agency | Admin | — |
| DELETE | /api/admin/agencies/[id] | Admin: deactivate agency | Admin | — |
| GET | /api/admin/agency-applications | Admin: list pending applications | Admin | — |
| PATCH | /api/admin/agency-applications/[id] | Admin: approve/reject | Admin | — |
| GET | /api/admin/agency-client-digest | Admin: get discoverable clients | Admin | — |

---

## 10. EMAIL TEMPLATES REQUIRED

```typescript
// src/lib/email/templates/agency.ts
// All sent via Resend

// 1. Agency receives a new inquiry
sendAgencyInquiryEmail({
  agencyEmail, agencyName,
  userBusinessName, userName, userEmail,
  userIndustry, userLocation,
  serviceNeeded, message, budget, inquiryId
})

// 2. User receives confirmation their inquiry was sent
sendInquiryConfirmationEmail({
  userEmail, userName,
  agencyName, responseTime
})

// 3. Zuri team receives a new agency application
sendNewAgencyApplicationAlert({
  agencyName, contactName, email, services
})

// 4. Agency applicant receives confirmation of receipt
sendAgencyApplicationConfirmation({
  email, contactName, agencyName
})

// 5. Agency receives approval notification (listing is live)
sendAgencyApprovalEmail({
  email, agencyName, listingUrl
})

// 6. Agency receives rejection (with optional feedback)
sendAgencyRejectionEmail({
  email, contactName, agencyName, reason
})
```

---

## 11. PLAN-GATED FEATURES

| Feature | Free | Pro | Growth | Premium |
|---|---|---|---|---|
| Browse agency directory | No | No | Yes | Yes |
| Contact agencies | No | No | Yes | Yes |
| View inquiry history | No | No | Yes | Yes |
| Mark inquiry status (responded/hired) | No | No | Yes | Yes |
| Client discoverability opt-in | No | No | Yes | Yes |
| Featured in client digest | No | No | No | Yes (priority placement in digest) |

Agencies themselves are NOT Zuri plan subscribers in v1. Their listing is managed entirely by the Zuri team.

---

## 12. MARKETPLACE UI REQUIREMENTS

### Agency Directory Page (`/agencies`)

**Header:**
- "Find a professional" title
- Subheading: "Vetted Nigerian agencies ready to grow your business"
- Filter bar: Services (dropdown multi-select) | Location | Price Range | [Clear filters]
- Search bar: "Search agencies"

**Agency Cards (grid — 2 columns mobile, 3 columns desktop):**
- Logo or initial avatar (circle, brand-colored background if no logo)
- Agency name + location (city) with MapPin icon
- Tagline (1 line, truncated)
- Service tags (max 3 shown, +N more if applicable)
- Price range indicator (₦ / ₦₦ / ₦₦₦)
- Response time (Clock icon + label)
- Badges: Zuri Certified (gold star), Verified (blue check), Featured (gold border on card)
- [Contact Agency] button

**Featured agencies:** First in the grid with a gold border. "Featured" badge in the top corner.

**Zuri Certified agencies:** Special gold star badge. These are explicitly endorsed by Zuri — shown at the very top of relevant filtered results.

**Agency Profile Page (`/agencies/[slug]`):**
- Header: Logo, name, tagline, badges
- About: full description
- Services: tag chips
- Price range + team size + response time
- Portfolio: cards with title, description, and link
- [Contact Agency] CTA — sticky on mobile
- Other agencies you might like (3 recommendations based on same services)

**Contact Modal (triggered by CTA):**
- Pre-filled: user's name, business name
- Service needed: dropdown (user selects)
- Message: textarea (required, min 10 chars, max 1000 chars)
- Budget: text field (optional, e.g. "₦100k–₦200k/month")
- [Send Inquiry] button
- Disclaimer: "Your email will be shared with [Agency Name] to facilitate this connection."

**Inquiry History (`/dashboard/agencies`):**
- List of sent inquiries with: agency name, date, status badge, message preview
- Status options user can set: "Waiting" / "They responded" / "Not responded" / "Hired"

**Agency Application Page (`/agencies/apply`):**
- Public page — no login required
- Clean form with all application fields
- "We review all applications within 7 business days" messaging
- What Zuri looks for: quality of work, responsiveness, ethical practices, Nigerian/African business focus

---

## 13. ERROR HANDLING — COMPLETE MAP

| Scenario | System Action | User-Facing Message |
|---|---|---|
| Pro/Free user tries to contact agency | Return 403 | "Connecting with agencies is available on the Growth plan. [Upgrade]" |
| Agency not found (deleted or inactive) | Return 404 | "This agency is no longer available on Zuri." |
| Inquiry message too short (<10 chars) | Return 400 | "Please write a more detailed message (at least 10 characters)." |
| Inquiry message too long (>1000 chars) | Return 400 | "Message must be 1000 characters or fewer." |
| Message contains only special chars/emojis | Sanitize → length check fails | "Please describe what you're looking for using text." |
| Rate limit: >3 inquiries to same agency in 30 days | Return 429 | "You've already sent 3 inquiries to this agency recently. Please wait for their response before sending more." |
| Agency email delivery fails (Resend) | Log error, inquiry still saved in DB | "Your inquiry has been sent." (we log and retry the email) |
| User has no brand profile yet | Return 422 | "Please complete your brand profile before contacting agencies." [Complete profile →] |
| Application email already submitted (30-day window) | Return 429 | "An application from this email was recently submitted. Please allow up to 7 business days for review." |
| Application: duplicate agency name in directory | Return 409 | "An agency with this name is already listed. If this is your agency, contact support at team@zuri.com." |
| Application: invalid portfolio URL | Silently filter invalid URLs | No error — invalid URLs just aren't stored |
| Application: no services selected | Return 400 | "Please select at least one service you offer." |
| Application email to Zuri team fails | Log critical error, application still saved | None — admin can see applications in admin panel |
| Admin creates duplicate slug | Auto-append timestamp to slug | None — handled transparently |
| Filters return no results | Return empty array | "No agencies match your filters. Try removing some filters or browse all agencies." |
| Agency directory fetch fails (DB error) | Return 500 | "We couldn't load the agency directory. Please try again." |
| Search term too short (<2 chars) | Ignore search term, return unfiltered | No error — just returns all results |
| Search term contains SQL/HTML | Sanitize silently | No error |
| Client digest fetch fails | Return 500, admin only | Admin sees error in response |
| Agency inquiry to non-discoverable user | N/A in v1 — agencies contact via Zuri team | — |

---

## 14. IMPLEMENTATION ORDER

1. Database migration (agencies, agency_inquiries, agency_applications tables)
2. Add `agency_discoverable` column to profiles
3. Seed initial agency data (add 5-10 real Nigerian agencies manually before launch)
4. `src/app/api/agencies/route.ts` — listing with filters
5. `src/app/api/agencies/[slug]/route.ts` — single agency
6. `src/app/api/agencies/apply/route.ts` — application form
7. `src/app/api/agencies/inquire/route.ts` — send inquiry
8. `src/app/api/agencies/inquiries/route.ts` — user's inquiry history
9. `src/app/api/agencies/inquire/[id]/status/route.ts` — status update
10. `src/app/api/admin/agencies/route.ts` — admin CRUD
11. `src/app/api/admin/agency-applications/route.ts` — admin applications view
12. `src/app/api/admin/agency-client-digest/route.ts` — client digest
13. Email templates: all 6 agency emails in Resend
14. Agency directory page (`/agencies`)
15. Agency profile page (`/agencies/[slug]`)
16. Agency application page (`/agencies/apply`)
17. Contact modal component (reusable)
18. User inquiry history (`/dashboard/agencies`)
19. Settings toggle: "Agency discoverability" (Growth+ only)
20. Admin panel pages (basic table views for managing agencies and applications)

## 15. INITIAL AGENCY SEEDING

Before launch, manually seed at least 8-10 real vetted Nigerian agencies across different service categories and cities. This ensures the marketplace is not empty on day one. Reach out to agencies directly to:
1. Get their permission to be listed
2. Collect their logo, portfolio links, and description
3. Insert their data via the admin API

Target mix for launch:
- 3-4 social media management agencies (Lagos)
- 2 content creation / photography studios (Lagos, Abuja)
- 1-2 digital marketing agencies (Lagos)
- 1 branding/design studio
- 1 agency in Abuja or Port Harcourt (geographic variety)
