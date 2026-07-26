import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import {
  normalizeFilledEmbeds,
  normalizeFilledImages,
  normalizeFilledLinks,
  persistRecomposedWebsite,
} from "@/lib/website/recompose-html";
import {
  defaultLinkTarget,
  isInternalHref,
  isValidLinkSlot,
  sanitizeLinkHref,
} from "@/lib/website/link-sanitize";
import { sanitizeText } from "@/lib/utils/sanitize";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import type { ActiveTheme, DesignArchetype, ResolvedLink } from "@/types/website";

export async function PATCH(req: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  const rateLimit = await checkRateLimit(supabase, user.id, "api:general");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const body = (await req.json().catch(() => ({}))) as {
    slot?: string;
    href?: string;
    target?: "_blank" | "_self";
    label?: string;
    clear?: boolean;
  };

  const slot = body.slot?.trim() ?? "";
  if (!isValidLinkSlot(slot)) {
    return NextResponse.json({ error: "Invalid link slot" }, { status: 400 });
  }

  const { data: website } = await supabase
    .from("websites")
    .select(
      "id, template_id, archetype, filled_placeholders, filled_images, filled_links, filled_embeds, active_theme"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!website?.template_id) {
    return NextResponse.json(
      { error: ERROR_MESSAGES.WEBSITE_NOT_FOUND },
      { status: 404 }
    );
  }

  const placeholders =
    (website.filled_placeholders as Record<string, string>) ?? {};
  const images = normalizeFilledImages(website.filled_images);
  const links = normalizeFilledLinks(website.filled_links);
  const embeds = normalizeFilledEmbeds(website.filled_embeds);
  const activeTheme = (website.active_theme as ActiveTheme) ?? "theme-1";
  const archetype = (website.archetype as DesignArchetype) ?? "clean-modern";

  const updatedLinks = { ...links };

  if (body.clear) {
    delete updatedLinks[slot];
  } else {
    const href = sanitizeLinkHref(body.href);
    if (!href) {
      return NextResponse.json(
        { error: "Enter a valid URL (https://…) or page section (#contact)." },
        { status: 400 }
      );
    }

    let target: "_blank" | "_self" =
      body.target === "_blank" || body.target === "_self"
        ? body.target
        : defaultLinkTarget(href);

    if (isInternalHref(href)) {
      target = "_self";
    }

    const link: ResolvedLink = { href, target };
    if (slot.startsWith("cta_") && typeof body.label === "string") {
      const label = sanitizeText(body.label).slice(0, 80);
      if (label) link.label = label;
    }

    updatedLinks[slot] = link;
  }

  try {
    const result = await persistRecomposedWebsite(
      supabase,
      website.id,
      user.id,
      {
        templateId: website.template_id,
        filledPlaceholders: placeholders,
        filledImages: images,
        filledLinks: updatedLinks,
        filledEmbeds: embeds,
        activeTheme,
        archetype,
      }
    );

    return NextResponse.json({
      success: true,
      slot,
      link: updatedLinks[slot] ?? null,
      filledLinks: updatedLinks,
      needsReview: result.needsReview,
    });
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId: user?.id,
      route: "/api/website/link",
    });
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR, support_ref: ref },
      { status: 500 }
    );
  }
}
