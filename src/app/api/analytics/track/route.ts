import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/security/rate-limit";

function anonymizeIp(ip: string): string {
  if (ip.includes(":")) {
    const groups = ip.split(":");
    return groups.slice(0, 3).join(":") + ":0:0:0:0:0";
  }
  const octets = ip.split(".");
  if (octets.length !== 4) return "0.0.0.0";
  return `${octets[0]}.${octets[1]}.${octets[2]}.0`;
}

function getDeviceType(viewportWidth: number): "mobile" | "tablet" | "desktop" {
  if (viewportWidth === 0) return "desktop";
  if (viewportWidth < 768) return "mobile";
  if (viewportWidth < 1024) return "tablet";
  return "desktop";
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .replace(/^www\./, "");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { h: handle, p: path, r: referrer, w: viewportWidth } = body;

    if (!handle || typeof handle !== "string") {
      return new Response(null, { status: 204 });
    }
    if (!path || typeof path !== "string") {
      return new Response(null, { status: 204 });
    }

    const cleanHandle = handle.replace(/[^a-z0-9-]/gi, "").slice(0, 30);
    const cleanPath = path.replace(/[<>"']/g, "").slice(0, 200);
    const cleanReferrer =
      typeof referrer === "string" ? extractDomain(referrer).slice(0, 200) : null;

    const rawIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "0.0.0.0";
    const anonymizedIp = anonymizeIp(rawIp);

    const country =
      req.headers.get("x-vercel-ip-country") ??
      req.headers.get("cf-ipcountry") ??
      null;

    const deviceType = getDeviceType(Number(viewportWidth) || 0);

    const supabase = createServiceClient();

    const rate = await checkRateLimit(
      supabase,
      `${cleanHandle}:${anonymizedIp}`,
      "analytics:track"
    );
    if (!rate.allowed) {
      return new Response(null, { status: 204 });
    }

    const { data: website } = await supabase
      .from("websites")
      .select("user_id, status, analytics_enabled")
      .eq("handle", cleanHandle)
      .maybeSingle();

    if (
      !website ||
      website.status !== "published" ||
      website.analytics_enabled === false
    ) {
      return new Response(null, { status: 204 });
    }

    await supabase.from("website_pageviews").insert({
      website_handle: cleanHandle,
      website_owner_id: website.user_id,
      page_path: cleanPath,
      referrer_domain: cleanReferrer || null,
      device_type: deviceType,
      country: country?.toUpperCase().slice(0, 2) ?? null,
      anonymized_ip: anonymizedIp,
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("Tracking error:", err);
    return new Response(null, { status: 204 });
  }
}
