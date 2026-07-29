// POST /api/agencies/apply — public, no auth. docs/07_AGENCY_MARKETPLACE.md §5.1

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeText, sanitizeUrl } from "@/lib/utils/sanitize";
import { sendEmail } from "@/lib/email/resend";
import { AGENCY_SERVICE_LABELS, type AgencyService } from "@/lib/agencies/types";
import { errorResponse } from "@/lib/security/sanitize-response";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/security/rate-limit";
import {
  getClientIp,
  hashForRateLimit,
} from "@/lib/onboarding/anonymous-session";
import { createNotificationAsync } from "@/lib/notifications/create-notification";

const SERVICE_KEYS = new Set(Object.keys(AGENCY_SERVICE_LABELS));
const PRICE_RANGES = new Set(["budget", "mid", "premium"]);

function isAgencyService(value: unknown): value is AgencyService {
  return typeof value === "string" && SERVICE_KEYS.has(value);
}

export async function POST(req: Request) {
  try {
    return await handleApply(req);
  } catch (err) {
    console.error("[agency-apply] unhandled:", err);
    return errorResponse(
      500,
      "Could not submit your application. Please try again.",
      err instanceof Error ? err.message : String(err)
    );
  }
}

async function handleApply(req: Request) {
  const body = await req.json().catch(() => ({}));
  const errors: string[] = [];

  const agencyName = sanitizeText(body.agency_name ?? "");
  if (!agencyName || agencyName.length < 2) errors.push("Agency name is required");
  if (agencyName.length > 100) errors.push("Agency name too long");

  const website = sanitizeUrl(body.website ?? "");
  if (!website) errors.push("Website or portfolio link is required");

  const locationCity = sanitizeText(body.location_city ?? "");
  if (!locationCity) errors.push("Location is required");

  if (!isAgencyService(body.primary_service)) {
    errors.push("Please select a primary specialty");
  }

  const secondaryRaw: unknown[] = Array.isArray(body.secondary_services)
    ? body.secondary_services
    : [];
  const secondaryServices = secondaryRaw
    .filter(isAgencyService)
    .filter((s) => s !== body.primary_service);

  const services: AgencyService[] = isAgencyService(body.primary_service)
    ? [body.primary_service, ...secondaryServices]
    : [];

  const description = sanitizeText(body.description ?? "");
  if (!description || description.length < 30) {
    errors.push("Description must be at least 30 characters");
  }
  if (description.length > 500) {
    errors.push("Description must be 500 characters or fewer");
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Valid email address is required");
  }

  const whatsapp = body.whatsapp
    ? sanitizeText(body.whatsapp).slice(0, 30)
    : null;
  const phone = body.phone ? sanitizeText(body.phone).slice(0, 20) : null;

  let priceRange: string | null = null;
  if (body.price_range != null && body.price_range !== "") {
    if (!PRICE_RANGES.has(body.price_range)) {
      errors.push("Invalid price range");
    } else {
      priceRange = body.price_range;
    }
  }

  const logoUrl = body.logo_url ? sanitizeUrl(body.logo_url) : null;

  const portfolioImageUrls: string[] = (
    Array.isArray(body.portfolio_image_urls) ? body.portfolio_image_urls : []
  )
    .map((u: string) => sanitizeUrl(u))
    .filter((u: string | null): u is string => Boolean(u))
    .slice(0, 3);

  // Legacy link field still accepted; website also stored in portfolio_urls[0] for older readers
  const portfolioUrls: string[] = (
    Array.isArray(body.portfolio_urls) ? body.portfolio_urls : []
  )
    .map((u: string) => sanitizeUrl(u))
    .filter((u: string | null): u is string => Boolean(u))
    .slice(0, 5);

  if (website && !portfolioUrls.includes(website)) {
    portfolioUrls.unshift(website);
  }

  const contactName =
    sanitizeText(body.contact_name ?? "").length >= 2
      ? sanitizeText(body.contact_name)
      : agencyName;

  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors[0] ?? "Validation failed", details: errors },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const ip = getClientIp(req.headers);
  const rateKey = hashForRateLimit(ip ?? "unknown");
  const rate = await checkRateLimit(supabase, rateKey, "agency:apply");
  if (!rate.allowed) {
    return rateLimitExceededResponse(rate.resetIn);
  }

  const { count: existingApps, error: existingAppsError } = await supabase
    .from("agency_applications")
    .select("id", { count: "exact" })
    .eq("email", email)
    .gte(
      "created_at",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    );

  if (existingAppsError) {
    return errorResponse(
      500,
      "Could not submit your application. Please try again.",
      existingAppsError.message
    );
  }

  if ((existingApps ?? 0) > 0) {
    return errorResponse(
      429,
      "An application from this email address was recently submitted. Please allow up to 7 business days for review."
    );
  }

  const { data: existingAgency, error: existingAgencyError } = await supabase
    .from("agencies")
    .select("id")
    .ilike("name", agencyName)
    .maybeSingle();

  if (existingAgencyError) {
    return errorResponse(
      500,
      "Could not submit your application. Please try again.",
      existingAgencyError.message
    );
  }

  if (existingAgency) {
    return errorResponse(
      409,
      "An agency with this name is already listed on Zuri. If this is your agency, contact support."
    );
  }

  const { error: insertError } = await supabase
    .from("agency_applications")
    .insert({
      agency_name: agencyName,
      contact_name: contactName,
      email,
      phone,
      whatsapp,
      website,
      logo_url: logoUrl,
      location_city: locationCity,
      services,
      team_size: null,
      price_range: priceRange,
      portfolio_urls: portfolioUrls.slice(0, 5),
      portfolio_image_urls: portfolioImageUrls,
      description,
      referral_source: body.referral_source
        ? sanitizeText(body.referral_source).slice(0, 100)
        : null,
      status: "pending",
    });

  if (insertError) {
    return errorResponse(
      500,
      "Could not submit your application. Please try again.",
      insertError.message
    );
  }

  // Best-effort side effects — never fail the applicant's success response.
  // services[0] is always the validated primary specialty after insert.
  const primarySpecialty = services[0]
    ? AGENCY_SERVICE_LABELS[services[0]]
    : "";
  const servicesLabel = services
    .map((s) => AGENCY_SERVICE_LABELS[s])
    .join(", ");
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://app.buildzuri.com"
  ).replace(/\/$/, "");
  const adminUrl = `${appUrl}/admin`;

  void (async () => {
    try {
      const zuriTeamEmail =
        process.env.ZURI_TEAM_EMAIL || "team@buildzuri.com";
      await sendEmail({
        to: zuriTeamEmail,
        subject: `New agency application: ${agencyName}`,
        template: "new_agency_application_alert",
        templateProps: {
          agencyName,
          contactName,
          email,
          services: servicesLabel,
          location: locationCity,
          primarySpecialty,
          adminUrl,
        },
      });
    } catch (err) {
      console.error("[agency-apply] admin email failed:", err);
    }

    try {
      await sendEmail({
        to: email,
        subject: "We received your Zuri agency application",
        template: "agency_application_confirmation",
        templateProps: { contactName, agencyName },
      });
    } catch (err) {
      console.error("[agency-apply] applicant email failed:", err);
    }

    try {
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_admin", true);

      for (const admin of admins ?? []) {
        createNotificationAsync({
          userId: admin.id,
          type: "agency_application_received",
          title: "New agency application",
          body: `${agencyName} applied (${primarySpecialty || "services TBD"} · ${locationCity}).`,
          actionUrl: "/admin",
          actionLabel: "Open admin",
          metadata: {
            agency_name: agencyName,
            email,
            location_city: locationCity,
            primary_specialty: primarySpecialty,
          },
        });
      }
    } catch (err) {
      console.error("[agency-apply] admin notifications failed:", err);
    }
  })();

  return NextResponse.json({
    success: true,
    message:
      "Your application has been received. We review all applications within 7 business days and will be in touch.",
  });
}
