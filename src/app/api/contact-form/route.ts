// POST /api/contact-form
// Public endpoint — receives submissions from published *.buildzuri.com sites.
// docs/02_WEBSITE_BUILDER.md §10 (v1 §13 validation + spam heuristic + Resend).
//
// Expected payload (templates should POST here):
//   https://app.buildzuri.com/api/contact-form
//   { business_handle, owner_email?, name, email, message, phone?, service_interest? }
//
// Rate limit: 10 submissions per IP per hour via Supabase rate_limit_log
// (not Vercel KV).

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeText } from "@/lib/utils/sanitize";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/security/rate-limit";
import { createNotificationAsync } from "@/lib/notifications/create-notification";

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildzuri.com";

function isBuildzuriOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    if (hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`)) {
      return true;
    }
    if (
      process.env.NODE_ENV !== "production" &&
      (hostname === "localhost" || hostname === "127.0.0.1")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null, allow = false): HeadersInit {
  // Browsers reject literal "*.buildzuri.com" — reflect a matching Origin.
  const allowOrigin =
    origin && allow
      ? origin
      : `https://app.${ROOT_DOMAIN}`;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

async function isAllowedOrigin(
  origin: string | null,
  supabase: ReturnType<typeof createServiceClient>
): Promise<boolean> {
  if (!origin) return true; // non-browser / same-origin style clients
  if (isBuildzuriOrigin(origin)) return true;

  // Custom domains on published sites also need to POST here
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    const { data } = await supabase
      .from("websites")
      .select("id")
      .eq("custom_domain", hostname)
      .eq("status", "published")
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  const supabase = createServiceClient();
  const allowed = await isAllowedOrigin(origin, supabase);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin, allowed),
  });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const supabase = createServiceClient();
  const allowed = await isAllowedOrigin(origin, supabase);
  const headers = corsHeaders(origin, allowed);

  if (origin && !allowed) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403, headers }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers }
    );
  }

  // Prefer v2 field name; accept v1 `handle` as alias
  const rawHandle =
    (typeof body.business_handle === "string" && body.business_handle) ||
    (typeof body.handle === "string" && body.handle) ||
    "";
  const handle = sanitizeText(rawHandle).toLowerCase();
  const name = sanitizeText(body.name);
  const emailRaw =
    typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  const message = sanitizeText(body.message);
  const phone =
    body.phone != null ? sanitizeText(body.phone).slice(0, 30) : null;
  const serviceInterest =
    body.service_interest != null
      ? sanitizeText(body.service_interest).slice(0, 100)
      : null;
  // owner_email is accepted from the form but never trusted for routing —
  // we look up the owner from the published website row.
  void body.owner_email;

  const errors: string[] = [];
  if (!handle) errors.push("Invalid handle");
  if (!name || name.length < 2) errors.push("Name is required");
  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    errors.push("Valid email is required");
  }
  if (!message || message.length < 5) errors.push("Message is required");
  if (message.length > 2000) errors.push("Message too long (max 2000 chars)");

  // 2-URL spam heuristic (v1 §13)
  const urlCount = (typeof body.message === "string" ? body.message : "").match(
    /https?:\/\//gi
  )?.length ?? 0;
  if (urlCount > 2) errors.push("Message appears to be spam");

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400, headers }
    );
  }

  // IP rate limit: 10 / hour (Supabase rate_limit_log — not Vercel KV)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rate = await checkRateLimit(supabase, ip, "contact_form:submit");
  if (!rate.allowed) {
    const limited = rateLimitExceededResponse(rate.resetIn);
    for (const [k, v] of Object.entries(headers)) {
      limited.headers.set(k, v);
    }
    return limited;
  }

  const { data: website } = await supabase
    .from("websites")
    .select("user_id, status")
    .eq("handle", handle)
    .maybeSingle();

  if (!website) {
    return NextResponse.json(
      { error: "Website not found" },
      { status: 404, headers }
    );
  }

  if (website.status !== "published") {
    return NextResponse.json(
      { error: "This website is not currently active." },
      { status: 404, headers }
    );
  }

  const { error: insertError } = await supabase
    .from("contact_submissions")
    .insert({
      website_owner_id: website.user_id,
      website_handle: handle,
      name,
      email: emailRaw,
      phone,
      message,
      service_interest: serviceInterest,
      ip_address: ip,
    });

  if (insertError) {
    console.error("[contact-form] insert failed:", insertError);
    return NextResponse.json(
      { error: "Could not save your message. Please try again." },
      { status: 500, headers }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", website.user_id)
    .maybeSingle();

  createNotificationAsync({
    userId: website.user_id,
    type: "contact_form_received",
    title: `New enquiry from ${name}`,
    body: message.slice(0, 140),
    actionUrl: "/dashboard",
    actionLabel: "View enquiry",
    email: profile?.email
      ? {
          to: profile.email,
          subject: `New enquiry on ${handle}.buildzuri.com`,
          template: "contact_form_received",
          templateProps: {
            ownerName: profile.full_name ?? null,
            ownerBusinessName: handle,
            senderName: name,
            senderEmail: emailRaw,
            message,
            serviceInterest,
          },
        }
      : undefined,
  });

  return NextResponse.json({ success: true }, { headers });
}
