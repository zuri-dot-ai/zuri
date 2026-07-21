import { NextResponse } from "next/server";
import { PLATFORM_FORMATS } from "@/lib/content/calendar-generator";
import {
  IMAGE_FORMATS,
  runGenerationPipeline,
} from "@/lib/content/generation-pipeline";
import {
  isValidPlatform,
  mapBrandForCalendar,
  requireContentUser,
} from "@/lib/content/api-helpers";
import { resolveArchetype } from "@/lib/content/pillars";
import { checkUsageLimit } from "@/lib/payments/feature-gate";
import { createNotificationAsync } from "@/lib/notifications/create-notification";
import { sanitizeText } from "@/lib/utils/sanitize";
import type { DesignArchetype } from "@/lib/website/archetypes";
import { RATE_LIMIT_MESSAGE, isRateLimitError } from "@/lib/errors/gemini-errors";

const STANDALONE_FORMATS = new Set(["blog_post", "newsletter"]);

export async function POST(req: Request) {
  const auth = await requireContentUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const platform = String(body.platform ?? "");
  const formatType = String(body.formatType ?? body.format_type ?? "");
  const topic = typeof body.topic === "string" ? body.topic : "";
  const hook = typeof body.hook === "string" ? body.hook : "";
  const brief = typeof body.brief === "string" ? body.brief : "";
  const calendarSlotId =
    typeof body.calendarSlotId === "string"
      ? body.calendarSlotId
      : typeof body.calendar_slot_id === "string"
        ? body.calendar_slot_id
        : undefined;

  const errors: string[] = [];

  if (!platform || !isValidPlatform(platform)) {
    errors.push("Invalid platform");
  }
  if (!formatType) errors.push("Format type is required");

  const cleanTopic = sanitizeText(topic);
  if (!cleanTopic || cleanTopic.length < 3) {
    errors.push("Topic is required (min 3 chars)");
  }
  if (cleanTopic.length > 200) {
    errors.push("Topic too long (max 200 chars)");
  }
  const cleanBrief = sanitizeText(brief);
  if (cleanBrief.length > 500) {
    errors.push("Brief too long (max 500 chars)");
  }

  const validFormats = PLATFORM_FORMATS[platform]?.map((f) => f.type) ?? [];
  if (
    formatType &&
    !STANDALONE_FORMATS.has(formatType) &&
    !validFormats.includes(formatType)
  ) {
    errors.push(`"${formatType}" is not a valid format for ${platform}`);
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 400 }
    );
  }

  const isImageFormat = IMAGE_FORMATS.has(formatType);
  const isBlogFormat = formatType === "blog_post";
  const isNewsletterFormat = formatType === "newsletter";
  const isArticle = formatType === "article";

  if (isImageFormat) {
    const gate = await checkUsageLimit(supabase, user.id, "images_generated");
    if (!gate.allowed) {
      createNotificationAsync({
        userId: user.id,
        type: "usage_limit_reached",
        title: "You've reached your images limit",
        body: `You've used all ${gate.limit ?? 0} images this month.`,
        actionUrl: "/settings?tab=billing",
        actionLabel: "Upgrade my plan",
      });
      return NextResponse.json(
        {
          error: "Image generation limit reached",
          used: gate.used,
          limit: gate.limit,
          upgradeRequired: "premium",
        },
        { status: 403 }
      );
    }
  }

  if (isBlogFormat || isArticle) {
    const gate = await checkUsageLimit(
      supabase,
      user.id,
      "blog_posts_generated"
    );
    if (!gate.allowed) {
      createNotificationAsync({
        userId: user.id,
        type: "usage_limit_reached",
        title: "You've reached your blog posts limit",
        body: `You've used all ${gate.limit ?? 0} blog posts this month.`,
        actionUrl: "/settings?tab=billing",
        actionLabel: "Upgrade my plan",
      });
      return NextResponse.json(
        { error: "Blog post limit reached" },
        { status: 403 }
      );
    }
  }

  if (isNewsletterFormat) {
    const gate = await checkUsageLimit(
      supabase,
      user.id,
      "newsletters_generated"
    );
    if (!gate.allowed) {
      createNotificationAsync({
        userId: user.id,
        type: "usage_limit_reached",
        title: "You've reached your newsletters limit",
        body: `You've used all ${gate.limit ?? 0} newsletters this month.`,
        actionUrl: "/settings?tab=billing",
        actionLabel: "Upgrade my plan",
      });
      return NextResponse.json(
        { error: "Newsletter limit reached" },
        { status: 403 }
      );
    }
  }

  // Free plan: content generation blocked (images/blog/newsletter limits are 0)
  if (
    !isImageFormat &&
    !isBlogFormat &&
    !isNewsletterFormat &&
    !isArticle
  ) {
    const calendarGate = await checkUsageLimit(
      supabase,
      user.id,
      "content_calendar_posts"
    );
    if (calendarGate.limit === 0) {
      return NextResponse.json(
        {
          error:
            "Content generation is available from the Pro plan. Start a free trial to continue.",
          upgradeRequired: "pro",
        },
        { status: 403 }
      );
    }
  }

  const { data: brandRow } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!brandRow) {
    return NextResponse.json(
      { error: "No brand profile found" },
      { status: 404 }
    );
  }

  const brand = mapBrandForCalendar(brandRow as Record<string, unknown>);

  const { data: website } = await supabase
    .from("websites")
    .select("archetype")
    .eq("user_id", user.id)
    .maybeSingle();

  const archetype = (website?.archetype ??
    resolveArchetype({
      business_type: brand.business_type,
      industry: brand.industry,
      services: brand.services,
      brand_vibe: brand.brand_vibe,
      business_name: brand.business_name,
    })) as DesignArchetype;

  try {
    const output = await runGenerationPipeline({
      userId: user.id,
      calendarSlotId,
      platform,
      formatType,
      topic: cleanTopic,
      hook: sanitizeText(hook),
      brief: cleanBrief,
      brand,
      archetype,
    });

    return NextResponse.json(output);
  } catch (err) {
    console.error("Content generation failed:", err);
    if (isRateLimitError(err)) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }
    return NextResponse.json(
      { error: "Generation failed. Please try again." },
      { status: 500 }
    );
  }
}
