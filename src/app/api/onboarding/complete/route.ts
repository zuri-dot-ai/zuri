import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractBrandProfile } from "@/lib/onboarding/brand-extractor";
import {
  VALID_BUSINESS_TYPES,
  VALID_LOCATIONS,
  VALID_PLATFORMS,
} from "@/lib/onboarding/types";
import {
  RESERVED_HANDLES,
  validateHandle,
} from "@/lib/handle/rules";
import { sanitizeText } from "@/lib/utils/sanitize";
import {
  collectErrors,
  validateLength,
  validateRequired,
  type ValidationResult,
} from "@/lib/utils/validate";
import { classifySupabaseError } from "@/lib/errors/supabase-errors";

const FIRST_NAME_PATTERN = /^[\p{L}]+(?:[\s'-][\p{L}]+)*$/u;
const BLOCKED_SERVICE_KEYWORDS = new Set([
  "drop",
  "select",
  "insert",
  "delete",
]);

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const firstName = sanitizeText(body.firstName);
  const businessName = sanitizeText(body.businessName);
  const handle = typeof body.handle === "string"
    ? body.handle.toLowerCase().trim()
    : "";
  const businessType =
    typeof body.businessType === "string" ? body.businessType : "";
  const brandVibe =
    typeof body.brandVibe === "string" ? sanitizeText(body.brandVibe) : "";
  const location =
    typeof body.location === "string" ? body.location : "";
  const locationCity = body.locationCity
    ? sanitizeText(body.locationCity)
    : undefined;
  const audienceTypes = Array.isArray(body.audienceTypes)
    ? body.audienceTypes
        .map((a) => sanitizeText(a))
        .filter((a): a is string => Boolean(a))
    : [];

  const services: string[] = (Array.isArray(body.services) ? body.services : [])
    .map((s: unknown) => sanitizeText(s))
    .filter((s: string) => {
      if (s.length < 2 || s.length > 50) return false;
      if (BLOCKED_SERVICE_KEYWORDS.has(s.toLowerCase())) return false;
      return /[a-zA-Z]/.test(s);
    })
    .filter(
      (s, i, arr) =>
        arr.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i
    )
    .slice(0, 8);

  const platforms: string[] = (
    Array.isArray(body.platforms) ? body.platforms : []
  )
    .filter(
      (p: unknown): p is string =>
        typeof p === "string" &&
        (VALID_PLATFORMS as readonly string[]).includes(p)
    )
    .slice(0, 5);
  const finalPlatforms =
    platforms.length > 0 ? platforms : ["instagram", "facebook"];

  const errors = collectErrors([
    (): ValidationResult => {
      const req = validateRequired(firstName, "First name");
      if (!req.valid) return req;
      const len = validateLength(firstName, "First name", 2, 50);
      if (!len.valid) return len;
      if (!FIRST_NAME_PATTERN.test(firstName)) {
        return {
          valid: false,
          error: "Please enter your name using letters only.",
        };
      }
      return { valid: true };
    },
    (): ValidationResult => {
      const req = validateRequired(businessName, "Business name");
      if (!req.valid) return req;
      const len = validateLength(businessName, "Business name", 2, 80);
      if (!len.valid) return len;
      if (!/[a-zA-Z]/.test(businessName)) {
        return {
          valid: false,
          error: "Business name must contain at least one letter",
        };
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
          return {
            valid: false,
            error: "City name must be 40 characters or fewer.",
          };
        }
        if (!/^[\p{L}\s]+$/u.test(locationCity)) {
          return {
            valid: false,
            error: "City name can only contain letters and spaces.",
          };
        }
      }
      return { valid: true };
    },
  ]);

  // Handle uniqueness (race-condition safety) — allow if already this user's
  const { data: existingHandle, error: handleLookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .neq("id", user.id)
    .maybeSingle();

  if (handleLookupError && handleLookupError.code !== "PGRST116") {
    const classified = classifySupabaseError(handleLookupError);
    return NextResponse.json(
      { error: classified.message },
      { status: classified.status }
    );
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
      unique_value: `${businessName} offers quality ${services.slice(0, 2).join(" and ")}.`,
      brand_tone: "professional",
      tagline_suggestion: `Your trusted ${businessType.replace(/-/g, " ")} partner.`,
      color_primary_suggestion: "#C9A84C",
      color_accent_suggestion: "#0C0C0E",
      target_audience_refined: audienceTypes.join(", "),
    };
  }

  // ── Persist profile ──────────────────────────────────────────────────────
  const { error: profileError } = await supabase.from("profiles").upsert(
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
    const classified = classifySupabaseError(profileError);
    return NextResponse.json(
      { error: classified.message },
      { status: classified.status }
    );
  }

  const { data: bizProfile, error: bizError } = await supabase
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

  if (bizError) {
    console.error("Business profile save error:", bizError);
    const classified = classifySupabaseError(bizError);
    return NextResponse.json(
      { error: classified.message || "Failed to save profile" },
      { status: classified.status || 500 }
    );
  }

  // ── Queue website generation ─────────────────────────────────────────────
  const { data: job } = await supabase
    .from("website_generation_jobs")
    .insert({
      user_id: user.id,
      status: "queued",
      business_profile_id: bizProfile.id,
    })
    .select()
    .maybeSingle();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (appUrl && internalSecret) {
    fetch(`${appUrl}/api/ai/compose-website`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({ userId: user.id, jobId: job?.id }),
    }).catch((err) =>
      console.error("Website generation trigger failed:", err)
    );

    fetch(`${appUrl}/api/content/seed-calendar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({ userId: user.id }),
    }).catch((err) => console.error("Calendar seed trigger failed:", err));
  }

  return NextResponse.json({ success: true, jobId: job?.id });
}
