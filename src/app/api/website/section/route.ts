// ZURI section editor API
// Two modes:
//   1. Direct edit: user typed a value -> field-level update, no AI
//   2. Regenerate: user wants fresh copy for one block -> AI rewrites just
//      that block using Gemini Flash.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { geminiJSON, FLASH } from "@/lib/gemini";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import { classifySupabaseError } from "@/lib/errors/supabase-errors";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import type { WebsiteComposition } from "@/types/website";

export async function PATCH(req: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  const rateLimit = await checkRateLimit(supabase, user.id, "api:general");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  const body = (await req.json().catch(() => ({}))) as {
    blockId?: string;
    field?: string;
    value?: unknown;
    regenerate?: boolean;
  };

  const blockId = body.blockId;
  if (!blockId) {
    return NextResponse.json({ error: "Missing blockId" }, { status: 400 });
  }

  try {
    const { data: website } = await supabase
      .from("websites")
      .select("id, generation_version, template_html")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!website) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.WEBSITE_NOT_FOUND },
        { status: 404 }
      );
    }

    if (website.template_html || website.generation_version === 2) {
      return NextResponse.json(
        {
          error:
            "This editor API is deprecated. Use PATCH /api/website/placeholder instead.",
        },
        { status: 410 }
      );
    }

    const { data: legacy } = await supabase
      .from("websites")
      .select("id, composition_json")
      .eq("user_id", user.id)
      .single();

    if (!legacy?.composition_json) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.WEBSITE_NOT_FOUND },
        { status: 404 }
      );
    }

    const composition = legacy.composition_json as WebsiteComposition;
    const next: any = JSON.parse(JSON.stringify(composition));

    if (!next.content) next.content = { blocks: {} };
    if (!next.content.blocks) next.content.blocks = {};

    let updatedBlock: any = next.content.blocks[blockId] ?? {};

    if (body.regenerate) {
      // ── Mode 2: Regenerate the block copy via Gemini Flash ───────────────
      const { data: brand } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const currentContent = updatedBlock;
      const prompt = `Regenerate copy for the "${blockId}" block of a website for ${brand?.business_name || "the business"}.
Business industry: ${brand?.industry || "general"}
Services: ${(brand?.services || []).join(", ")}
Tone: ${brand?.brand_tone || "professional"}
Location: ${brand?.location || "Lagos, Nigeria"}

This is the SAME block on the site; preserve its purpose but write fresh copy.
Current content: ${JSON.stringify(currentContent)}

Return ONLY valid JSON with the SAME fields as the original content (headline, subheadline, body, cta_text, services, stats, testimonials as applicable). Make copy specific to this business — never generic.`;

      let newContent: any;
      try {
        newContent = await geminiJSON<any>(prompt, { model: FLASH, temperature: 0.7 });
      } catch {
        return NextResponse.json({ error: "Regeneration failed" }, { status: 500 });
      }
      updatedBlock = { ...updatedBlock, ...newContent };
    } else {
      // ── Mode 1: Direct field edit (user typed a value) ───────────────────
      const { field, value } = body;
      if (field && value !== undefined) {
        updatedBlock[field] = value;
      } else {
        return NextResponse.json({ error: "Missing field/value for direct edit" }, { status: 400 });
      }
    }

    next.content.blocks[blockId] = updatedBlock;

    // Mirror headline/body to flat content fields for legacy v1 block consumers
    if (blockId.startsWith("hero_")) {
      if (updatedBlock.headline) next.content.hero_headline = updatedBlock.headline;
      if (updatedBlock.subheadline) next.content.hero_subheadline = updatedBlock.subheadline;
    }
    if (blockId.startsWith("about_")) {
      if (updatedBlock.body || updatedBlock.subheadline)
        next.content.about_paragraph = updatedBlock.body || updatedBlock.subheadline;
    }
    if (blockId.startsWith("services_") || blockId === "pricing_table") {
      if (Array.isArray(updatedBlock.services)) next.content.services = updatedBlock.services;
    }
    if (blockId.startsWith("cta_")) {
      if (updatedBlock.cta_text) next.content.cta_text = updatedBlock.cta_text;
    }

    const { error: updateErr } = await supabase
      .from("websites")
      .update({
        composition_json: next as WebsiteComposition,
        last_edited: new Date().toISOString(),
      })
      .eq("id", website.id);

    if (updateErr) {
      const { status, message } = classifySupabaseError(updateErr);
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({
      success: true,
      content: updatedBlock,
      composition: next as WebsiteComposition,
    });
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, { supportRef: ref, userId: user?.id, route: "/api/website/section" });
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR, support_ref: ref },
      { status: 500 }
    );
  }
}
