import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { UAParser } from "ua-parser-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = "edge";

function getClientIp(req: NextRequest): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

function anonymizeIp(ip: string): string {
  if (ip.includes(":")) {
    const groups = ip.split(":");
    return groups.slice(0, 3).join(":") + ":0:0:0:0:0";
  }
  const octets = ip.split(".");
  if (octets.length !== 4) return "0.0.0.0";
  return `${octets[0]}.${octets[1]}.${octets[2]}.0`;
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      const text = await req.text();
      try { body = JSON.parse(text); }
      catch { return NextResponse.json({ ok: false }, { status: 400 }); }
    }

    const websiteId = body.website_id as string | undefined;
    const eventType = body.event_type as string | undefined;
    if (!websiteId || !eventType) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const validTypes = new Set([
      "page_view", "whatsapp_click", "phone_click", "form_submit",
      "cta_click", "product_click", "session_start", "session_end",
    ]);
    if (!validTypes.has(eventType)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const ip = anonymizeIp(getClientIp(req));

    const ua = new UAParser(req.headers.get("user-agent") || "");
    const deviceType = ua.getDevice().type === "mobile" ? "mobile"
      : ua.getDevice().type === "tablet" ? "tablet" : "desktop";

    const geo = {
      country: (req.geo?.country as string | null) ?? null,
      region: (req.geo?.region as string | null) ?? null,
      city: (req.geo?.city as string | null) ?? null,
    };

    let referrerDomain: string | null = null;
    if (body.referrer && typeof body.referrer === "string") {
      try { referrerDomain = new URL(body.referrer).hostname.replace(/^www\./, ""); }
      catch {}
    }

    await supabase.from("analytics_events").insert({
      website_id,
      event_type: eventType,
      session_id: body.session_id,
      visitor_id: body.visitor_id,
      is_new_visitor: body.is_new_visitor ?? true,
      page_path: body.page_path ?? null,
      page_title: body.page_title ?? null,
      referrer_domain: referrerDomain,
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      device_type: deviceType,
      browser: ua.getBrowser().name,
      os: ua.getOS().name,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      metadata: body.metadata ?? {},
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[track] error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
