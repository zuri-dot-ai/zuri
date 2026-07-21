// POST /api/agencies/apply — public, no auth. docs/07_AGENCY_MARKETPLACE.md §5.1

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeText, sanitizeUrl } from "@/lib/utils/sanitize";
import { sendEmail } from "@/lib/email/resend";
import { AGENCY_SERVICE_LABELS, type AgencyService } from "@/lib/agencies/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

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

  const services: string[] = Array.isArray(body.services)
    ? body.services.filter((s: string) =>
        Object.keys(AGENCY_SERVICE_LABELS).includes(s)
      )
    : [];
  if (services.length === 0) errors.push("Please select at least one service you offer.");

  const description = sanitizeText(body.description ?? "");
  if (!description || description.length < 30) {
    errors.push("Description must be at least 30 characters");
  }
  if (description.length > 500) {
    errors.push("Description must be 500 characters or fewer");
  }

  const portfolioUrls: string[] = (
    Array.isArray(body.portfolio_urls) ? body.portfolio_urls : []
  )
    .map((u: string) => sanitizeUrl(u))
    .filter((u: string | null): u is string => Boolean(u))
    .slice(0, 5);

  if (!["budget", "mid", "premium"].includes(body.price_range)) {
    errors.push("Price range is required");
  }

  if (!["solo", "small", "medium", "large"].includes(body.team_size)) {
    errors.push("Team size is required");
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { count: existingApps } = await supabase
    .from("agency_applications")
    .select("id", { count: "exact" })
    .eq("email", email)
    .gte(
      "created_at",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    );

  if ((existingApps ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "An application from this email address was recently submitted. Please allow up to 7 business days for review.",
      },
      { status: 429 }
    );
  }

  const { data: existingAgency } = await supabase
    .from("agencies")
    .select("id")
    .ilike("name", agencyName)
    .maybeSingle();

  if (existingAgency) {
    return NextResponse.json(
      {
        error:
          "An agency with this name is already listed on Zuri. If this is your agency, contact support.",
      },
      { status: 409 }
    );
  }

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
    referral_source: body.referral_source
      ? sanitizeText(body.referral_source).slice(0, 100)
      : null,
    status: "pending",
  });

  const zuriTeamEmail = process.env.ZURI_TEAM_EMAIL || "team@buildzuri.com";
  await sendEmail({
    to: zuriTeamEmail,
    subject: `New agency application: ${agencyName}`,
    template: "new_agency_application_alert",
    templateProps: {
      agencyName,
      contactName,
      email,
      services: services
        .map((s) => AGENCY_SERVICE_LABELS[s as AgencyService])
        .join(", "),
    },
  });

  await sendEmail({
    to: email,
    subject: "We received your Zuri agency application",
    template: "agency_application_confirmation",
    templateProps: { contactName, agencyName },
  });

  return NextResponse.json({
    success: true,
    message:
      "Your application has been received. We review all applications within 7 business days and will be in touch.",
  });
}
