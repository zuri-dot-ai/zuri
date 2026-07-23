import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { extractBrandProfile } from "@/lib/onboarding/brand-extractor";
import { convertAnonymousSession } from "@/lib/onboarding/convert-session";
import { clearAnonymousSessionCookie } from "@/lib/onboarding/anonymous-session";
import { resolveArchetypeFromCategory } from "@/lib/website/archetypes";
import {
  VALID_BUSINESS_TYPES,
  VALID_LOCATIONS,
  VALID_PLATFORMS,
  isUnsupportedBusinessType,
  type OnboardingState,
} from "@/lib/onboarding/types";
import { RESERVED_HANDLES, validateHandle } from "@/lib/handle/rules";
import { sanitizeText } from "@/lib/utils/sanitize";
import {
  collectErrors,
  validateLength,
  validateRequired,
  type ValidationResult,
} from "@/lib/utils/validate";
import { classifySupabaseError } from "@/lib/errors/supabase-errors";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

const FIRST_NAME_PATTERN = /^[\p{L}]+(?:[\s'-][\p{L}]+)*$/u;
const BLOCKED_SERVICE_KEYWORDS = new Set(["drop", "select", "insert", "delete"]);

/**
 * Onboarding V2 (docs/01_ONBOARDING_V2.md §7.5) — fires from the Step 11
 * signup-success handler. The request body is just `{ sessionToken }`;
 * everything else is looked up server-side from the anonymous session row.
 * NEVER trust a client-submitted OnboardingState body directly.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(supabase, user.id, "onboarding:complete");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionToken =
    typeof body.sessionToken === "string" ? body.sessionToken : "";
  if (!sessionToken) {
    return NextResponse.json({ error: "Missing sessionToken" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: anonSession, error: anonError } = await service
    .from("anonymous_onboarding_sessions")
    .select("data, archetype, expires_at")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (anonError && anonError.code !== "PGRST116") {
    const classified = classifySupabaseError(anonError);
    return NextResponse.json({ error: classified.message }, { status: classified.status });
  }
  if (!anonSession) {
    return NextResponse.json(
      { error: "Onboarding session not found or expired" },
      { status: 400 }
    );
  }
  if (new Date(anonSession.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Onboarding session expired" },
      { status: 400 }
    );
  }

  const onboardingData = (anonSession.data ?? {}) as Partial<OnboardingState>;

  const firstName = sanitizeText(onboardingData.firstName);
  const businessName = sanitizeText(onboardingData.businessName);
  const handle =
    typeof onboardingData.handle === "string"
      ? onboardingData.handle.toLowerCase().trim()
      : "";
  const businessType =
    typeof onboardingData.businessType === "string" ? onboardingData.businessType : "";
  const brandVibe =
    typeof onboardingData.brandVibe === "string"
      ? sanitizeText(onboardingData.brandVibe)
      : "";
  const location =
    typeof onboardingData.location === "string" ? onboardingData.location : "";
  const locationCity = onboardingData.locationCity
    ? sanitizeText(onboardingData.locationCity)
    : undefined;
  const audienceTypes = Array.isArray(onboardingData.audienceTypes)
    ? onboardingData.audienceTypes
        .map((a) => sanitizeText(a))
        .filter((a): a is string => Boolean(a))
    : [];

  // ── Structured services: { name, description }[] (docs §7.5) ───────────
  const services = (Array.isArray(onboardingData.services) ? onboardingData.services : [])
    .filter(
      (s): s is { name: string; description: string } =>
        Boolean(s) &&
        typeof s.name === "string" &&
        s.name.trim().length >= 2 &&
        typeof s.description === "string" &&
        s.description.trim().length >= 10
    )
    .filter((s) => {
      const name = s.name.trim();
      if (name.length > 40) return false;
      if (BLOCKED_SERVICE_KEYWORDS.has(name.toLowerCase())) return false;
      return /[a-zA-Z]/.test(name);
    })
    .filter(
      (s, i, arr) =>
        arr.findIndex((x) => x.name.toLowerCase() === s.name.toLowerCase()) === i
    )
    .slice(0, 6)
    .map((s) => ({
      name: sanitizeText(s.name).slice(0, 40),
      description: sanitizeText(s.description).slice(0, 70),
    }));

  const platforms: string[] = (
    Array.isArray(onboardingData.platforms) ? onboardingData.platforms : []
  )
    .filter(
      (p): p is string =>
        typeof p === "string" && (VALID_PLATFORMS as readonly string[]).includes(p)
    )
    .slice(0, 5);
  const finalPlatforms = platforms.length > 0 ? platforms : ["instagram", "facebook"];

  const archetype =
    (typeof onboardingData.resolvedArchetype === "string" &&
      onboardingData.resolvedArchetype) ||
    resolveArchetypeFromCategory(businessType);

  const errors = collectErrors([
    (): ValidationResult => {
      const req = validateRequired(firstName, "First name");
      if (!req.valid) return req;
      const len = validateLength(firstName, "First name", 2, 50);
      if (!len.valid) return len;
      if (!FIRST_NAME_PATTERN.test(firstName)) {
        return { valid: false, error: "Please enter your name using letters only." };
      }
      return { valid: true };
    },
    (): ValidationResult => {
      const req = validateRequired(businessName, "Business name");
      if (!req.valid) return req;
      const len = validateLength(businessName, "Business name", 2, 80);
      if (!len.valid) return len;
      if (!/[a-zA-Z]/.test(businessName)) {
        return { valid: false, error: "Business name must contain at least one letter" };
      }
      return { valid: true };
    },
    (): ValidationResult => {
      const result = validateHandle(handle);
      if (!result.valid) {
        return { valid: false, error: result.error ?? "Invalid handle format" };
      }
      if (RESERVED_HANDLES.has(handle)) {
        return { valid: false, error: "Handle is reserved" };
      }
      return { valid: true };
    },
    (): ValidationResult => {
      if (!(VALID_BUSINESS_TYPES as readonly string[]).includes(businessType)) {
        return { valid: false, error: "Invalid business type" };
      }
      if (isUnsupportedBusinessType(businessType)) {
        return {
          valid: false,
          error: "This business type needs a custom build. Contact build@buildzuri.com.",
        };
      }
      return { valid: true };
    },
    (): ValidationResult => {
      if (services.length === 0) {
        return { valid: false, error: "At least one service is required" };
      }
      return { valid: true };
    },
    (): ValidationResult => {
      if (!(VALID_LOCATIONS as readonly string[]).includes(location)) {
        return { valid: false, error: "Invalid location" };
      }
      return { valid: true };
    },
    (): ValidationResult => {
      if (audienceTypes.length === 0) {
        return { valid: false, error: "At least one audience type is required" };
      }
      return { valid: true };
    },
    (): ValidationResult => {
      if (!brandVibe) {
        return { valid: false, error: "Brand vibe is required" };
      }
      return { valid: true };
    },
    (): ValidationResult => {
      if (location === "other-city") {
        if (!locationCity || locationCity.length < 2) {
          return { valid: false, error: "Please enter your city name." };
        }
        if (locationCity.length > 40) {
          return { valid: false, error: "City name must be 40 characters or fewer." };
        }
        if (!/^[\p{L}\s]+$/u.test(locationCity)) {
          return { valid: false, error: "City name can only contain letters and spaces." };
        }
      }
      return { valid: true };
    },
  ]);

  // Handle uniqueness (race-condition safety) — allow if already this user's
  const { data: existingHandle, error: handleLookupError } = await service
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .neq("id", user.id)
    .maybeSingle();

  if (handleLookupError && handleLookupError.code !== "PGRST116") {
    const classified = classifySupabaseError(handleLookupError);
    return NextResponse.json({ error: classified.message }, { status: classified.status });
  }
  if (existingHandle) errors.push("Handle is already taken");

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  // ── Brand extraction (graceful fallback) ─────────────────────────────────
  let enrichedBrand;
  try {
    enrichedBrand = await extractBrandProfile({
      businessName,
      businessType,
      services,
      audienceTypes,
      location,
      locationCity,
      brandVibe,
    });
  } catch (err) {
    console.error("Brand extraction failed, using raw data:", err);
    enrichedBrand = {
      industry: businessType,
      unique_value: `${businessName} offers quality ${services
        .slice(0, 2)
        .map((s) => s.name)
        .join(" and ")}.`,
      brand_tone: "professional",
      tagline_suggestion: `Your trusted ${businessType.replace(/-/g, " ")} partner.`,
      color_primary_suggestion: "#C9A84C",
      color_accent_suggestion: "#0C0C0E",
      target_audience_refined: audienceTypes.join(", "),
    };
  }

  // ── Mark anonymous session converted ──────────────────────────────────────
  try {
    await convertAnonymousSession(sessionToken, user.id);
  } catch (err) {
    // Don't block account creation over this — log and continue. The user
    // already has a real account; a stuck anonymous row is not fatal.
    console.error("convertAnonymousSession failed:", err);
  }

  // ── Persist profile ──────────────────────────────────────────────────────
  // Profiles: no INSERT grant/policy for authenticated (trigger + service_role only).
  const { error: profileError } = await service.from("profiles").upsert(
    {
      id: user.id,
      full_name: firstName,
      handle,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("Profile save error:", profileError);
    const classified = classifySupabaseError(profileError);
    return NextResponse.json(
      {
        error: classified.message,
        details: profileError.message ? [profileError.message] : undefined,
        code: profileError.code,
      },
      { status: classified.status }
    );
  }

  const { data: bizProfile, error: bizError } = await service
    .from("business_profiles")
    .upsert(
      {
        user_id: user.id,
        business_name: businessName,
        industry: enrichedBrand.industry,
        business_type: businessType,
        services,
        target_audience: enrichedBrand.target_audience_refined,
        location,
        location_city: locationCity ?? null,
        brand_tone: enrichedBrand.brand_tone,
        unique_value: enrichedBrand.unique_value,
        tagline: enrichedBrand.tagline_suggestion,
        brand_vibe: brandVibe,
        color_primary: enrichedBrand.color_primary_suggestion,
        color_accent: enrichedBrand.color_accent_suggestion,
        platforms: finalPlatforms,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (bizError || !bizProfile) {
    console.error("Business profile save error:", bizError);
    const classified = classifySupabaseError(bizError);
    return NextResponse.json(
      {
        error: classified.message || "Failed to save profile",
        details: bizError?.message ? [bizError.message] : undefined,
        code: bizError?.code,
      },
      { status: classified.status || 500 }
    );
  }

  // ── Migrate onboarding-scoped uploaded images to permanent user images ──
  const { error: migrateError } = await service.rpc(
    "migrate_onboarding_images_to_user",
    { p_session_token: sessionToken, p_user_id: user.id }
  );
  if (migrateError) {
    console.error("migrate_onboarding_images_to_user failed:", migrateError);
  }

  // ── Persist the resolved archetype on the website row once created; the
  // generation pipeline re-resolves it deterministically too, so this isn't
  // load-bearing — best-effort only.
  void archetype;

  // ── Queue website generation (service role — no user INSERT RLS policy) ──
  const { data: job, error: jobError } = await service
    .from("website_generation_jobs")
    .insert({
      user_id: user.id,
      status: "queued",
      business_profile_id: bizProfile.id,
    })
    .select("id")
    .maybeSingle();

  if (jobError) {
    console.error("Generation job insert error:", jobError);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (appUrl && internalSecret) {
    fetch(`${appUrl}/api/ai/generate-website`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({ userId: user.id, jobId: job?.id }),
    }).catch((err) => console.error("Website generation trigger failed:", err));

    fetch(`${appUrl}/api/content/seed-calendar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({ userId: user.id }),
    }).catch((err) => console.error("Calendar seed trigger failed:", err));
  } else {
    console.warn(
      "Skipping website generation trigger: NEXT_PUBLIC_APP_URL or INTERNAL_API_SECRET missing"
    );
  }

  await clearAnonymousSessionCookie();

  return NextResponse.json({ success: true, jobId: job?.id ?? null });
}
