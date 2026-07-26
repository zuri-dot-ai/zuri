import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
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
  MAX_EMBEDS,
  parseEmbedInput,
} from "@/lib/website/embed-sanitize";
import { sanitizeText } from "@/lib/utils/sanitize";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import type {
  ActiveTheme,
  DesignArchetype,
  ResolvedEmbed,
} from "@/types/website";

async function loadWebsite(userId: string) {
  const supabase = await createClient();
  const { data: website } = await supabase
    .from("websites")
    .select(
      "id, template_id, archetype, filled_placeholders, filled_images, filled_links, filled_embeds, active_theme"
    )
    .eq("user_id", userId)
    .maybeSingle();
  return { supabase, website };
}

function recomposeArgs(website: {
  template_id: string;
  filled_placeholders: unknown;
  filled_images: unknown;
  filled_links: unknown;
  filled_embeds: unknown;
  active_theme: unknown;
  archetype: unknown;
}, embeds: ResolvedEmbed[]) {
  return {
    templateId: website.template_id,
    filledPlaceholders:
      (website.filled_placeholders as Record<string, string>) ?? {},
    filledImages: normalizeFilledImages(website.filled_images),
    filledLinks: normalizeFilledLinks(website.filled_links),
    filledEmbeds: embeds,
    activeTheme: (website.active_theme as ActiveTheme) ?? "theme-1",
    archetype: (website.archetype as DesignArchetype) ?? "clean-modern",
  };
}

/** Add a new embed from URL or iframe paste. */
export async function POST(req: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const rateLimitClient = await createClient();
  const rateLimit = await checkRateLimit(rateLimitClient, user.id, "api:general");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const body = (await req.json().catch(() => ({}))) as {
    input?: string;
    title?: string;
  };

  const parsed = parseEmbedInput(body.input ?? "");
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Could not use that embed. Paste a YouTube, Vimeo, or Google Maps URL, or an iframe snippet from a supported provider.",
      },
      { status: 400 }
    );
  }

  const { supabase, website } = await loadWebsite(user.id);
  if (!website?.template_id) {
    return NextResponse.json(
      { error: ERROR_MESSAGES.WEBSITE_NOT_FOUND },
      { status: 404 }
    );
  }

  const existing = normalizeFilledEmbeds(website.filled_embeds);
  if (existing.length >= MAX_EMBEDS) {
    return NextResponse.json(
      { error: `You can add up to ${MAX_EMBEDS} embeds.` },
      { status: 400 }
    );
  }

  const title =
    (typeof body.title === "string" && body.title.trim()
      ? sanitizeText(body.title).slice(0, 120)
      : parsed.title) || undefined;

  const embed: ResolvedEmbed = {
    id: randomUUID(),
    provider: parsed.provider,
    src: parsed.src,
    ...(title ? { title } : {}),
  };

  const updated = [...existing, embed];

  try {
    const result = await persistRecomposedWebsite(
      supabase,
      website.id,
      user.id,
      recomposeArgs(website, updated)
    );

    return NextResponse.json({
      success: true,
      embed,
      filledEmbeds: updated,
      needsReview: result.needsReview,
    });
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId: user?.id,
      route: "/api/website/embed",
    });
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR, support_ref: ref },
      { status: 500 }
    );
  }
}

/** Update title or reorder embeds. */
export async function PATCH(req: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const rateLimitClient = await createClient();
  const rateLimit = await checkRateLimit(rateLimitClient, user.id, "api:general");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    title?: string;
    order?: string[];
  };

  const { supabase, website } = await loadWebsite(user.id);
  if (!website?.template_id) {
    return NextResponse.json(
      { error: ERROR_MESSAGES.WEBSITE_NOT_FOUND },
      { status: 404 }
    );
  }

  let embeds = normalizeFilledEmbeds(website.filled_embeds);

  if (Array.isArray(body.order)) {
    const byId = new Map(embeds.map((e) => [e.id, e]));
    const next: ResolvedEmbed[] = [];
    for (const id of body.order) {
      const item = byId.get(id);
      if (item) {
        next.push(item);
        byId.delete(id);
      }
    }
    for (const remaining of byId.values()) next.push(remaining);
    embeds = next.slice(0, MAX_EMBEDS);
  }

  if (body.id && typeof body.title === "string") {
    const title = sanitizeText(body.title).slice(0, 120);
    embeds = embeds.map((e) =>
      e.id === body.id
        ? { ...e, ...(title ? { title } : { title: undefined }) }
        : e
    );
  }

  try {
    const result = await persistRecomposedWebsite(
      supabase,
      website.id,
      user.id,
      recomposeArgs(website, embeds)
    );

    return NextResponse.json({
      success: true,
      filledEmbeds: embeds,
      needsReview: result.needsReview,
    });
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId: user?.id,
      route: "/api/website/embed",
    });
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR, support_ref: ref },
      { status: 500 }
    );
  }
}

/** Remove an embed by id. */
export async function DELETE(req: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const rateLimitClient = await createClient();
  const rateLimit = await checkRateLimit(rateLimitClient, user.id, "api:general");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing embed id" }, { status: 400 });
  }

  const { supabase, website } = await loadWebsite(user.id);
  if (!website?.template_id) {
    return NextResponse.json(
      { error: ERROR_MESSAGES.WEBSITE_NOT_FOUND },
      { status: 404 }
    );
  }

  const embeds = normalizeFilledEmbeds(website.filled_embeds).filter(
    (e) => e.id !== id
  );

  try {
    const result = await persistRecomposedWebsite(
      supabase,
      website.id,
      user.id,
      recomposeArgs(website, embeds)
    );

    return NextResponse.json({
      success: true,
      filledEmbeds: embeds,
      needsReview: result.needsReview,
    });
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, {
      supportRef: ref,
      userId: user?.id,
      route: "/api/website/embed",
    });
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR, support_ref: ref },
      { status: 500 }
    );
  }
}
