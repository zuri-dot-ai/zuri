// docs/09_DEPLOYMENT.md §5.3
// Runs every 15 minutes — checks all pending custom domain verifications.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@/lib/notifications/create-notification";

export const dynamic = "force-dynamic";

interface VercelVerificationChallenge {
  type: string;
  domain: string;
  value: string;
  reason?: string;
}

function vercelHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
  };
  if (process.env.VERCEL_TEAM_ID) {
    headers["x-vercel-team-id"] = process.env.VERCEL_TEAM_ID;
  }
  return headers;
}

// Two independent checks, in order:
//  1. Ownership verification (TXT challenge) — Vercel won't route ANY
//     traffic until this passes, regardless of DNS being correct.
//  2. DNS routing config (A/CNAME) — only meaningful once (1) has passed.
async function checkDomainOwnership(domain: string): Promise<{
  verified: boolean;
  verification: VercelVerificationChallenge[] | null;
}> {
  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`,
      { headers: vercelHeaders(), signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) {
      // If Vercel doesn't know about the domain at all (e.g. it was removed
      // out-of-band), treat as not verified rather than throwing.
      return { verified: false, verification: null };
    }
    const data = await res.json();
    if (data.verified === false && Array.isArray(data.verification)) {
      return { verified: false, verification: data.verification };
    }
    return { verified: true, verification: null };
  } catch {
    return { verified: false, verification: null };
  }
}

async function checkDomainDnsConfigured(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.vercel.com/v6/domains/${domain}/config`, {
      headers: vercelHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    // Vercel marks a domain as configured when misconfigured is false
    return data.misconfigured === false;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const fortyEightHoursMs = 48 * 60 * 60 * 1000;

  const { data: pendingDomains } = await supabase
    .from("websites")
    .select("id, user_id, custom_domain, custom_domain_added_at, handle")
    .eq("custom_domain_status", "pending_verification")
    .not("custom_domain", "is", null);

  let verified = 0;
  let expired = 0;

  for (const website of pendingDomains ?? []) {
    const domain = website.custom_domain as string;

    const addedAt = website.custom_domain_added_at
      ? new Date(website.custom_domain_added_at as string)
      : null;
    if (!addedAt || Date.now() - addedAt.getTime() > fortyEightHoursMs) {
      await supabase
        .from("websites")
        .update({ custom_domain_status: "verification_failed" })
        .eq("id", website.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", website.user_id)
        .maybeSingle();

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://app.buildzuri.com";

      await createNotification({
        userId: website.user_id,
        type: "domain_dns_delayed",
        title: "Custom domain not connected yet",
        body: `It's been over 48 hours and ${domain} still hasn't propagated. Double-check your DNS records.`,
        actionUrl: "/settings?tab=domain",
        actionLabel: "View domain setup",
        email: profile?.email
          ? {
              to: profile.email,
              subject: `${domain} isn't connected yet`,
              template: "domain_dns_delayed",
              templateProps: {
                firstName:
                  typeof profile.full_name === "string"
                    ? profile.full_name.split(" ")[0]
                    : "there",
                domain,
                setupGuideUrl: `${appUrl}/settings?tab=domain`,
              },
            }
          : undefined,
      });

      expired++;
      continue;
    }

    // Step 1: ownership verification. If Vercel still needs a TXT challenge
    // resolved, refresh the stored challenge (it can change) and skip the
    // DNS check entirely — DNS config is meaningless until ownership passes.
    const ownership = await checkDomainOwnership(domain);
    if (!ownership.verified) {
      await supabase
        .from("websites")
        .update({
          custom_domain_verification: ownership.verification,
          updated_at: new Date().toISOString(),
        })
        .eq("id", website.id);
      continue;
    }

    // Ownership passed — clear any stale TXT instructions.
    if (ownership.verified) {
      await supabase
        .from("websites")
        .update({ custom_domain_verification: null })
        .eq("id", website.id);
    }

    // Step 2: DNS routing (A/CNAME) config.
    const isDnsConfigured = await checkDomainDnsConfigured(domain);

    if (isDnsConfigured) {
      await supabase
        .from("websites")
        .update({
          custom_domain_status: "verified",
          custom_domain_verification: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", website.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", website.user_id)
        .maybeSingle();

      await createNotification({
        userId: website.user_id,
        type: "domain_connected",
        title: "Custom domain connected",
        body: `Your domain ${domain} is now live and serving your website.`,
        actionUrl: `https://${domain}`,
        actionLabel: "Visit my site",
        email: profile?.email
          ? {
              to: profile.email,
              subject: `${domain} is now live`,
              template: "domain_connected",
              templateProps: {
                firstName:
                  typeof profile.full_name === "string"
                    ? profile.full_name.split(" ")[0]
                    : undefined,
                domain,
                siteUrl: `https://${domain}`,
              },
            }
          : undefined,
      });

      verified++;
    }
  }

  return NextResponse.json({ ok: true, verified, expired });
}
