// POST /api/website/unpublish
// docs/02_WEBSITE_BUILDER.md §9.2 — status back to "preview", unlock handle.
// Domain references use buildzuri.com via NEXT_PUBLIC_ROOT_DOMAIN.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import {
  canPublishWebsite,
  getActivePlanId,
} from "@/lib/payments/get-plan";
import { createAuditLog } from "@/lib/security/audit";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import { classifySupabaseError } from "@/lib/errors/supabase-errors";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import { getPublicSiteUrl, getRootDomain } from "@/lib/website/public-site-url";

export async function POST(req: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  const rateLimit = await checkRateLimit(supabase, user.id, "api:general");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const planId = await getActivePlanId(supabase, user.id);
  if (!canPublishWebsite(planId)) {
    return NextResponse.json(
      {
        error: "Upgrade required to manage your website",
        upgradeRequired: "pro",
      },
      { status: 403 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    websiteId?: string;
  };

  try {
    let query = supabase
      .from("websites")
      .select("id, handle, status")
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

    if (website.status !== "published") {
      return NextResponse.json({
        success: true,
        message: "Website is not published",
        handle: website.handle,
        domain: getRootDomain(),
      });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("websites")
      .update({
        status: "preview",
        updated_at: now,
      })
      .eq("id", website.id)
      .eq("user_id", user.id);

    if (error) {
      const { status, message } = classifySupabaseError(error);
      return NextResponse.json({ error: message }, { status });
    }

    // Unlock handle so the owner can change it while offline
    await supabase
      .from("profiles")
      .update({ handle_locked: false })
      .eq("id", user.id);

    await createAuditLog(
      supabase,
      user.id,
      "website.unpublished",
      "website",
      website.id,
      {
        handle: website.handle,
        formerUrl: getPublicSiteUrl(website.handle),
      },
      req
    );

    return NextResponse.json({
      success: true,
      handle: website.handle,
      domain: getRootDomain(),
    });
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, { supportRef: ref, userId: user?.id, route: "/api/website/unpublish" });
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR, support_ref: ref },
      { status: 500 }
    );
  }
}
