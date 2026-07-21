// Admin-only CRUD for agency listings. docs/07_AGENCY_MARKETPLACE.md §8

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sanitizeText } from "@/lib/utils/sanitize";
import { sendEmail } from "@/lib/email/resend";

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

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await requireAdmin(supabase, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  const { data: agencies } = await service
    .from("agencies")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json({ agencies: agencies ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await requireAdmin(supabase, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const service = createServiceClient();

  const name = sanitizeText(body.name ?? "");
  const contactEmail = (body.contact_email ?? "").trim().toLowerCase();
  if (!name || !contactEmail) {
    return NextResponse.json(
      { error: "name and contact_email are required" },
      { status: 400 }
    );
  }

  const slugBase = generateSlug(name);
  const { data: existing } = await service
    .from("agencies")
    .select("id")
    .eq("slug", slugBase)
    .maybeSingle();
  const finalSlug = existing ? `${slugBase}-${Date.now().toString(36)}` : slugBase;

  const { data: agency, error } = await service
    .from("agencies")
    .insert({
      name,
      slug: finalSlug,
      logo_url: body.logo_url ?? null,
      cover_image_url: body.cover_image_url ?? null,
      tagline: sanitizeText(body.tagline ?? "").slice(0, 80) || name,
      description: sanitizeText(body.description ?? "").slice(0, 500),
      location_city: sanitizeText(body.location_city ?? "Lagos"),
      services: Array.isArray(body.services) ? body.services : [],
      price_range: body.price_range ?? "mid",
      team_size: body.team_size ?? "small",
      portfolio_items: Array.isArray(body.portfolio_items) ? body.portfolio_items : [],
      contact_email: contactEmail,
      contact_whatsapp: body.contact_whatsapp ?? null,
      response_time: body.response_time ?? "1_2_days",
      is_active: false, // admin activates manually after final review
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.application_id) {
    await service
      .from("agency_applications")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", body.application_id);

    await sendEmail({
      to: contactEmail,
      subject: `${name} is now listed on Zuri`,
      template: "agency_approval",
      templateProps: {
        agencyName: name,
        listingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/agencies/${finalSlug}`,
      },
    });
  }

  return NextResponse.json({ agency });
}

const ALLOWED_UPDATE_FIELDS = [
  "is_featured",
  "is_verified",
  "is_zuri_certified",
  "is_active",
  "tagline",
  "description",
  "services",
  "price_range",
  "team_size",
  "logo_url",
  "cover_image_url",
  "response_time",
  "contact_email",
  "contact_whatsapp",
  "portfolio_items",
  "location_city",
];

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await requireAdmin(supabase, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, ...updates } = body as { id?: string; [key: string]: unknown };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const safeUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key]) => ALLOWED_UPDATE_FIELDS.includes(key))
  );

  const service = createServiceClient();
  const { error } = await service
    .from("agencies")
    .update({ ...safeUpdates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
