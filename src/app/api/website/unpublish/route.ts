// POST /api/website/unpublish
// docs/02_WEBSITE_BUILDER.md §9.2 — status back to "preview", unlock handle.
// Domain references use buildzuri.com via NEXT_PUBLIC_ROOT_DOMAIN.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  canPublishWebsite,
  getActivePlanId,
} from "@/lib/payments/get-plan";
import { createAuditLog } from "@/lib/security/audit";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import { getPublicSiteUrl, getRootDomain } from "@/lib/website/public-site-url";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
}
