// docs/09_DEPLOYMENT.md §5.2, §5.4, §5.5
// POST: add a custom domain to the user's website (Growth+ only)
// GET: check current custom domain verification status
// DELETE: remove the custom domain

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkFeatureAccess } from "@/lib/payments/feature-gate";

interface DnsInstruction {
  type: "A" | "CNAME";
  name: string;
  value: string;
  description: string;
}

function vercelHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
    "Content-Type": "application/json",
  };
  if (process.env.VERCEL_TEAM_ID) {
    headers["x-vercel-team-id"] = process.env.VERCEL_TEAM_ID;
  }
  return headers;
}

function buildDnsInstructions(domain: string): DnsInstruction[] {
  const isApex = !domain.includes("www.") && domain.split(".").length === 2;

  if (isApex) {
    return [
      {
        type: "A",
        name: "@",
        value: "76.76.21.21",
        description: "Points your root domain to Zuri",
      },
      {
        type: "CNAME",
        name: "www",
        value: "cname.vercel-dns.com",
        description: "Points www to Zuri (recommended)",
      },
    ];
  }

  return [
    {
      type: "CNAME",
      name: domain.split(".")[0],
      value: "cname.vercel-dns.com",
      description: "Points your subdomain to Zuri",
    },
  ];
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await checkFeatureAccess(supabase, user.id, "custom_domain");
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Growth plan required", upgradeRequired: gate.upgradeRequired ?? "growth" },
      { status: 403 }
    );
  }

  let body: { domain?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const domain = body.domain
    ?.toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!domain) {
    return NextResponse.json({ error: "Domain is required." }, { status: 400 });
  }

  const domainPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/;
  if (!domainPattern.test(domain)) {
    return NextResponse.json(
      {
        error:
          "Invalid domain format. Enter your domain as: example.com or www.example.com",
      },
      { status: 400 }
    );
  }

  if (domain.endsWith(".zuri.com") || domain === "zuri.com") {
    return NextResponse.json(
      { error: "You cannot use a zuri.com domain as a custom domain." },
      { status: 400 }
    );
  }

  const { data: existingWebsite } = await supabase
    .from("websites")
    .select("user_id")
    .eq("custom_domain", domain)
    .maybeSingle();

  if (existingWebsite && existingWebsite.user_id !== user.id) {
    return NextResponse.json(
      { error: "This domain is already connected to another Zuri site." },
      { status: 409 }
    );
  }

  const { data: website } = await supabase
    .from("websites")
    .select("id, status, handle")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!website) {
    return NextResponse.json(
      { error: "No website found. Generate your website first." },
      { status: 404 }
    );
  }

  // ── Add domain to Vercel project ──────────────────────────────────────────
  const vercelRes = await fetch(
    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains`,
    {
      method: "POST",
      headers: vercelHeaders(),
      body: JSON.stringify({ name: domain }),
    }
  );

  if (!vercelRes.ok) {
    let errData: { error?: { code?: string } } = {};
    try {
      errData = await vercelRes.json();
    } catch {
      // ignore parse errors
    }
    if (errData.error?.code !== "domain_already_in_use") {
      console.error("Vercel domain add error:", errData);
      return NextResponse.json(
        {
          error:
            "Could not configure your domain. Please try again or contact support.",
        },
        { status: 500 }
      );
    }
  }

  // ── Save to DB ───────────────────────────────────────────────────────────
  await supabase
    .from("websites")
    .update({
      custom_domain: domain,
      custom_domain_status: "pending_verification",
      custom_domain_added_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  const dnsInstructions = buildDnsInstructions(domain);

  return NextResponse.json({
    success: true,
    domain,
    status: "pending_verification",
    dns_instructions: dnsInstructions,
    estimated_propagation: "Up to 48 hours, usually within a few minutes",
  });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: website } = await supabase
    .from("websites")
    .select("custom_domain, custom_domain_status, custom_domain_added_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!website?.custom_domain) {
    return NextResponse.json({ has_custom_domain: false });
  }

  return NextResponse.json({
    has_custom_domain: true,
    domain: website.custom_domain,
    status: website.custom_domain_status,
    // status: pending_verification | verified | verification_failed
    added_at: website.custom_domain_added_at,
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: website } = await supabase
    .from("websites")
    .select("custom_domain")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!website?.custom_domain) {
    return NextResponse.json({ error: "No custom domain to remove" }, { status: 404 });
  }

  await fetch(
    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${website.custom_domain}`,
    {
      method: "DELETE",
      headers: vercelHeaders(),
    }
  ).catch((err) => console.error("Vercel domain remove error:", err));

  await supabase
    .from("websites")
    .update({
      custom_domain: null,
      custom_domain_status: null,
      custom_domain_added_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
