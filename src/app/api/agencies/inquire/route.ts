// POST /api/agencies/inquire — docs/07_AGENCY_MARKETPLACE.md §4.1
// Growth+ gate. Rate limit: 3 inquiries per agency per user per 30 days.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkFeatureAccess } from "@/lib/payments/feature-gate";
import { sanitizeText } from "@/lib/utils/sanitize";
import { sendEmail } from "@/lib/email/resend";
import { createNotificationAsync } from "@/lib/notifications/create-notification";
import {
  AGENCY_SERVICE_LABELS,
  RESPONSE_TIME_LABELS,
  type AgencyService,
} from "@/lib/agencies/types";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await checkFeatureAccess(supabase, user.id, "can_contact_agencies");
  if (!gate.allowed) {
    return NextResponse.json(
      {
        error: "Growth plan required to contact agencies",
        upgradeRequired: gate.upgradeRequired ?? "growth",
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { agencyId, serviceNeeded, message, budget } = body as {
    agencyId?: string;
    serviceNeeded?: string;
    message?: string;
    budget?: string;
  };

  const errors: string[] = [];
  if (!agencyId || typeof agencyId !== "string") {
    errors.push("Agency ID is required");
  }

  const cleanMessage = sanitizeText(message ?? "");
  if (!cleanMessage || cleanMessage.length < 10) {
    errors.push("Message must be at least 10 characters");
  }
  if (cleanMessage.length > 1000) {
    errors.push("Message must be 1000 characters or fewer");
  }

  if (serviceNeeded && !Object.keys(AGENCY_SERVICE_LABELS).includes(serviceNeeded)) {
    errors.push("Invalid service selected");
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

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

  // Rate limit: max 3 inquiries to the same agency per user per 30 days.
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { count: recentInquiries } = await supabase
    .from("agency_inquiries")
    .select("id", { count: "exact" })
    .eq("user_id", user.id)
    .eq("agency_id", agencyId as string)
    .gte("created_at", thirtyDaysAgo);

  if ((recentInquiries ?? 0) >= 3) {
    return NextResponse.json(
      {
        error:
          "You've already sent 3 inquiries to this agency recently. Please wait for their response before sending more.",
      },
      { status: 429 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const { data: brand } = await supabase
    .from("business_profiles")
    .select("business_name, industry, services, location_city, location")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!brand) {
    return NextResponse.json(
      {
        error: "Please complete your brand profile before contacting agencies.",
      },
      { status: 422 }
    );
  }

  const { data: inquiry } = await supabaseService
    .from("agency_inquiries")
    .insert({
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
    })
    .select()
    .single();

  await supabaseService.rpc("increment_agency_inquiries", { agency_id: agencyId });

  const responseTimeLabel =
    RESPONSE_TIME_LABELS[agency.response_time] ?? "will respond soon";

  // Email to the agency — not a Zuri user, so no in-app notification row.
  await sendEmail({
    to: agency.contact_email,
    subject: `New client brief from Zuri — ${brand?.business_name ?? "a Zuri business"}`,
    template: "agency_inquiry_received",
    templateProps: {
      agencyName: agency.name,
      userBusinessName: brand?.business_name ?? "A Zuri business",
      userName: profile?.full_name ?? "A Zuri user",
      userEmail: profile?.email ?? user.email ?? "",
      userIndustry: brand?.industry ?? null,
      userLocation: brand?.location_city ?? brand?.location ?? null,
      serviceNeeded: serviceNeeded
        ? AGENCY_SERVICE_LABELS[serviceNeeded as AgencyService]
        : null,
      message: cleanMessage,
      budget: budget ?? null,
    },
  });

  // In-app + email confirmation to the user.
  createNotificationAsync({
    userId: user.id,
    type: "agency_inquiry_sent",
    title: `Inquiry sent to ${agency.name}`,
    body: `${agency.name} ${responseTimeLabel.toLowerCase()}.`,
    actionUrl: "/agencies",
    actionLabel: "View agencies",
    email: profile?.email
      ? {
          to: profile.email,
          subject: `Your inquiry to ${agency.name} has been sent`,
          template: "agency_inquiry_sent",
          templateProps: {
            userName: profile?.full_name ?? null,
            agencyName: agency.name,
            responseTime: responseTimeLabel,
          },
        }
      : undefined,
  });

  return NextResponse.json({
    success: true,
    inquiryId: inquiry?.id,
    message: `Your inquiry has been sent to ${agency.name}. They ${responseTimeLabel.toLowerCase()}.`,
  });
}
