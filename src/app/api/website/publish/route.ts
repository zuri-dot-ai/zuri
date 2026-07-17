// POST /api/website/publish
// docs/02_WEBSITE_BUILDER.md §9 — plan gate, validateFilledHtml, handle lock,
// "your site is live" email, buildzuri.com URL.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkFeatureAccess } from "@/lib/payments/feature-gate";
import { validateFilledHtml } from "@/lib/website/generation-pipeline";
import { sendSitePublishedEmail } from "@/lib/email/templates";
import { createAuditLog } from "@/lib/security/audit";
import { ERROR_MESSAGES } from "@/lib/errors/messages";

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "buildzuri.com";

function siteUrlFor(handle: string): string {
  return `https://${handle}.${ROOT_DOMAIN}`;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Plan gate — Free cannot publish (websites limit is 0)
  const gate = await checkFeatureAccess(supabase, user.id, "websites");
  if (!gate.allowed) {
    return NextResponse.json(
      {
        error:
          "Upgrade to Pro to publish your website. [Upgrade]",
        upgradeRequired: gate.upgradeRequired,
      },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    websiteId?: string;
  };

  let query = supabase
    .from("websites")
    .select("id, handle, status, template_html, custom_domain")
    .eq("user_id", user.id);

  if (body.websiteId) {
    query = query.eq("id", body.websiteId);
  }

  const { data: website } = await query.maybeSingle();

  if (!website) {
    return NextResponse.json(
      { error: ERROR_MESSAGES.WEBSITE_NOT_FOUND },
      { status: 404 }
    );
  }

  if (!website.handle) {
    return NextResponse.json(
      { error: "Website handle is missing. Complete onboarding first." },
      { status: 400 }
    );
  }

  const liveUrl = siteUrlFor(website.handle);

  if (website.status === "published") {
    return NextResponse.json({
      success: true,
      message: "Already published",
      url: liveUrl,
      liveUrl,
      slug: website.handle,
    });
  }

  if (!website.template_html) {
    return NextResponse.json(
      {
        error: ERROR_MESSAGES.PUBLISH_VALIDATION_FAILED,
        details: ["Website HTML is missing. Regenerate your website first."],
      },
      { status: 422 }
    );
  }

  // §6 validateFilledHtml — not the old block-schema validator
  const validation = validateFilledHtml(website.template_html);
  if (!validation.valid) {
    return NextResponse.json(
      {
        error: ERROR_MESSAGES.PUBLISH_VALIDATION_FAILED,
        details: validation.errors,
        warnings: validation.warnings,
      },
      { status: 422 }
    );
  }

  const now = new Date().toISOString();
  const { error: publishError } = await supabase
    .from("websites")
    .update({
      status: "published",
      published_at: now,
      updated_at: now,
    })
    .eq("id", website.id)
    .eq("user_id", user.id);

  if (publishError) {
    return NextResponse.json(
      { error: publishError.message },
      { status: 500 }
    );
  }

  // Lock handle on first publish
  await supabase
    .from("profiles")
    .update({ handle_locked: true })
    .eq("id", user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.email) {
    // Log-only until EMAIL_DELIVERY_MODE=send is approved
    await sendSitePublishedEmail({
      to: profile.email,
      name: profile.full_name ?? null,
      siteUrl: liveUrl,
    }).catch((err) =>
      console.error("[publish] site-live email failed:", err)
    );
  }

  await createAuditLog(
    supabase,
    user.id,
    "website.published",
    "website",
    website.id,
    { handle: website.handle, url: liveUrl },
    req
  );

  return NextResponse.json({
    success: true,
    url: liveUrl,
    liveUrl,
    slug: website.handle,
  });
}
