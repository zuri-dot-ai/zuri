// ════════════════════════════════════════════════════════
//  ZURI — Monthly Calendar Generator
//  docs/03_CONTENT_STRATEGY.md §3
// ════════════════════════════════════════════════════════

import { geminiJSON } from "@/lib/gemini";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";
import type { BusinessProfile } from "@/types/brand";
import type { ContentCalendarRow } from "@/types/database";
import { getNigerianCulturalMoments, type CulturalMoment } from "./cultural-calendar";
import type { ContentPillar } from "./pillars";
import { getSuggestedTime } from "./posting-times";
import { getTrendingTopics, type TrendingTopic } from "./trending-topics";

export interface CalendarGenerationInput {
  userId: string;
  month: number;
  year: number;
  brand: BusinessProfile | Record<string, unknown>;
  pillars: ContentPillar[];
  platforms: string[];
  postsPerMonth: number | null;
  existingSlots?: string[];
}

export type CalendarSlot = Omit<
  ContentCalendarRow,
  "id" | "created_at" | "updated_at" | "content_id"
> & {
  id?: string;
  content_id?: string | null;
  generation_source: "ai" | "fallback";
};

export interface CalendarGenerationResult {
  slots: CalendarSlot[];
  usedFallback: boolean;
  /** Human-readable reason when usedFallback is true, safe to show/log. */
  reason?: string;
}

interface PostFormat {
  type: string;
  weight: number;
  label: string;
  coming_soon?: boolean;
}

interface GeneratedSlot {
  platform: string;
  format_type: string;
  pillar_name: string;
  topic: string;
  hook: string;
  brief: string;
  coming_soon?: boolean;
  is_cultural_moment?: boolean;
  cultural_moment_name?: string | null;
  suggested_day_of_week?: string;
  trend_topic?: string | null;
}

interface CalendarPromptParams {
  brand: BusinessProfile | Record<string, unknown>;
  pillars: ContentPillar[];
  platforms: string[];
  culturalMoments: CulturalMoment[];
  trends: TrendingTopic[];
  totalPosts: number;
  distribution: Record<string, number>;
  month: number;
  year: number;
}

export const PLATFORM_FORMATS: Record<string, PostFormat[]> = {
  instagram: [
    { type: "static_image", weight: 3, label: "Image Post" },
    { type: "carousel", weight: 2, label: "Carousel" },
    { type: "reel", weight: 2, label: "Reel", coming_soon: true },
    { type: "story", weight: 1, label: "Story" },
  ],
  facebook: [
    { type: "static_image", weight: 3, label: "Image Post" },
    { type: "text_post", weight: 2, label: "Text Post" },
    { type: "video", weight: 1, label: "Video", coming_soon: true },
  ],
  linkedin: [
    { type: "text_post", weight: 3, label: "Text Post" },
    { type: "static_image", weight: 2, label: "Image Post" },
    { type: "article", weight: 1, label: "Article" },
    { type: "poll", weight: 1, label: "Poll" },
  ],
  x: [
    { type: "text_post", weight: 3, label: "Tweet" },
    { type: "static_image", weight: 2, label: "Image Tweet" },
    { type: "thread", weight: 1, label: "Thread" },
  ],
  tiktok: [
    { type: "short_video", weight: 1, label: "Short Video", coming_soon: true },
  ],
};

function brandField(
  brand: BusinessProfile | Record<string, unknown>,
  key: string,
  fallback = ""
): string {
  const v = (brand as Record<string, unknown>)[key];
  if (v == null) return fallback;
  if (Array.isArray(v)) return v.map(String).join(", ");
  return String(v);
}

export function distributePostsAcrossPlatforms(
  total: number,
  platforms: string[]
): Record<string, number> {
  if (platforms.length === 0) return {};

  const PLATFORM_WEIGHTS: Record<string, number> = {
    instagram: 3,
    facebook: 3,
    tiktok: 2,
    x: 2,
    linkedin: 1,
  };

  const activeWeights = platforms.reduce(
    (acc, p) => {
      acc[p] = PLATFORM_WEIGHTS[p] ?? 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalWeight = Object.values(activeWeights).reduce((a, b) => a + b, 0);
  const distribution: Record<string, number> = {};

  let assigned = 0;
  platforms.forEach((platform, i) => {
    if (i === platforms.length - 1) {
      distribution[platform] = total - assigned;
    } else {
      const share = Math.round((activeWeights[platform] / totalWeight) * total);
      distribution[platform] = share;
      assigned += share;
    }
  });

  return distribution;
}

export function distributeFormats(
  total: number,
  platforms: string[]
): Array<{ format_type: string; coming_soon: boolean; platform: string }> {
  const result: Array<{
    format_type: string;
    coming_soon: boolean;
    platform: string;
  }> = [];
  if (platforms.length === 0 || total <= 0) return result;

  const dist = distributePostsAcrossPlatforms(total, platforms);

  for (const [platform, count] of Object.entries(dist)) {
    const formats = PLATFORM_FORMATS[platform] ?? [
      { type: "static_image", weight: 1, label: "Image Post" },
    ];
    const totalWeight = formats.reduce((s, f) => s + f.weight, 0);
    let assigned = 0;

    formats.forEach((fmt, i) => {
      const n =
        i === formats.length - 1
          ? count - assigned
          : Math.round((fmt.weight / totalWeight) * count);
      for (let j = 0; j < n; j++) {
        result.push({
          format_type: fmt.type,
          coming_soon: Boolean(fmt.coming_soon),
          platform,
        });
      }
      assigned += n;
    });
  }

  while (result.length < total) {
    const platform = platforms[result.length % platforms.length];
    result.push({
      format_type: "static_image",
      coming_soon: false,
      platform,
    });
  }

  return result.slice(0, total);
}

export function distributeDatesAcrossMonth(
  month: number,
  year: number,
  total: number
): Date[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const startDay =
    month === today.getMonth() + 1 && year === today.getFullYear()
      ? today.getDate() + 1
      : 1;

  if (startDay > daysInMonth || total <= 0) return [];

  const availableDays = Array.from(
    { length: daysInMonth - startDay + 1 },
    (_, i) => startDay + i
  );

  const interval = Math.max(1, Math.floor(availableDays.length / total));
  const dates: Date[] = [];

  for (let i = 0; i < total && i * interval < availableDays.length; i++) {
    const day = availableDays[Math.min(i * interval, availableDays.length - 1)];
    dates.push(new Date(year, month - 1, day));
  }

  // If we need more dates than interval allows, fill remaining evenly
  while (dates.length < total && availableDays.length > 0) {
    const day =
      availableDays[
        Math.min(
          Math.floor((dates.length / total) * availableDays.length),
          availableDays.length - 1
        )
      ];
    dates.push(new Date(year, month - 1, day));
  }

  return dates.slice(0, total);
}

export function rotatePillars(
  pillars: ContentPillar[],
  total: number
): string[] {
  const activePillars = pillars.filter((p) => p.is_active && p.id);
  if (activePillars.length === 0) return [];

  const rotation: string[] = [];
  for (let i = 0; i < total; i++) {
    rotation.push(activePillars[i % activePillars.length].id!);
  }
  return rotation;
}

export function buildCalendarPrompt(params: CalendarPromptParams): string {
  const {
    brand,
    pillars,
    culturalMoments,
    trends,
    totalPosts,
    distribution,
    month,
    year,
  } = params;

  const monthName = new Date(year, month - 1, 1).toLocaleString("en-NG", {
    month: "long",
  });

  const businessName = sanitizeForPrompt(brandField(brand, "business_name", "Business"));
  const industry = sanitizeForPrompt(brandField(brand, "industry"));
  const services = sanitizeForPrompt(brandField(brand, "services"));
  const location = sanitizeForPrompt(
    brandField(brand, "location_city") || brandField(brand, "location", "Lagos")
  );
  const rawAudience = brandField(brand, "target_audience");
  const audience = sanitizeForPrompt(rawAudience);
  const tone = sanitizeForPrompt(brandField(brand, "brand_tone", "professional"));
  const pitchLine = sanitizeForPrompt(brandField(brand, "pitch_line"));
  const toneSample = sanitizeForPrompt(brandField(brand, "tone_sample_choice"));

  // Onboarding frequently leaves these thin (e.g. "everyone", a single
  // generic service, no city) — a working Gemini call with thin input
  // still produces generic output. Detect that and explicitly ask Gemini
  // to infer specifics rather than silently generating "everyone"-flavoured
  // posts from a blank/lazy value.
  const isThinAudience =
    !rawAudience.trim() ||
    /^(everyone|everybody|anyone|general public|all)$/i.test(rawAudience.trim());
  const isThinServices = !services.trim() || services.split(",").length <= 1;
  const inferenceNote =
    isThinAudience || isThinServices
      ? `\nNOTE: Some business details above are thin or generic (e.g. a vague target audience` +
        ` or a single generic service). Where that's the case, infer sensible, specific details` +
        ` for a typical Nigerian ${industry || "small"} business in ${location} rather than writing` +
        ` generic posts aimed at "everyone" — pick a plausible specific audience segment and service` +
        ` angle for each post instead.\n`
      : "";

  return `
You are a social media strategist specialising in Nigerian small businesses.
Create a ${totalPosts}-post content calendar for ${monthName} ${year} for the business below.

BUSINESS:
- Name: ${businessName}
- Industry: ${industry}
- Services: ${services}
- Location: ${location}, Nigeria
- Target audience: ${audience}
- Brand tone: ${tone}
${pitchLine ? `- Differentiator: ${pitchLine}` : ""}
${toneSample ? `- Preferred voice sample (match this register): "${toneSample}"` : ""}
${inferenceNote}

CONTENT PILLARS (rotate through these):
${pillars.map((p) => `- ${sanitizeForPrompt(p.name)}: ${sanitizeForPrompt(p.description ?? "")}`).join("\n")}

PLATFORM DISTRIBUTION (total posts per platform this month):
${Object.entries(distribution)
  .map(([p, n]) => `- ${p}: ${n} posts`)
  .join("\n")}

NIGERIAN CULTURAL MOMENTS THIS MONTH (must include at least one post for each applicable moment):
${
  culturalMoments.length > 0
    ? culturalMoments
        .map(
          (m) =>
            `- ${m.date ?? `${month}-${m.day}`}: ${m.name} — ${m.content_angle}`
        )
        .join("\n")
    : "None this month"
}

TRENDING TOPICS IN THIS INDUSTRY RIGHT NOW:
${trends
  .slice(0, 3)
  .map((t) => `- ${t.topic}: ${t.angle}`)
  .join("\n")}

RULES:
1. Every slot must have a unique, specific topic — no two slots can have the same topic
2. Every post must be directly relevant to ${businessName} and its audience
3. Topics must feel authentic to a Nigerian audience — reference local context, language, and culture where natural
4. Do NOT schedule posts on Sundays unless specifically for a cultural moment
5. Rotate through content pillars — no pillar should appear more than twice in a row
6. Each slot must include a specific HOOK — the first line the audience will read or see
7. Video format slots: mark as coming_soon: true — these appear in the calendar but cannot be generated yet
8. At least 20% of posts should be engagement-driven (questions, polls, challenges, opinions)
9. If a slot's topic is directly inspired by one of the TRENDING TOPICS listed above,
   set "trend_topic" to that trend's exact topic text. Otherwise set it to null.
   Do not force trends into slots where they don't fit naturally — most slots
   should have trend_topic: null.

Output ONLY valid JSON with no markdown:
{
  "slots": [
    {
      "platform": "instagram",
      "format_type": "static_image",
      "pillar_name": "Product Showcase",
      "topic": "specific and descriptive topic",
      "hook": "specific opening hook or question (max 15 words)",
      "brief": "2-3 sentence description of what this post should say and show",
      "coming_soon": false,
      "is_cultural_moment": false,
      "cultural_moment_name": null,
      "suggested_day_of_week": "Tuesday",
      "trend_topic": "string matching a trend topic above, or null"
    }
  ]
}
`;
}

function hasPlaceholder(text: string): boolean {
  return /\[[^\]]+\]/.test(text);
}

function buildTemplateSlots(
  input: CalendarGenerationInput,
  totalPosts: number,
  pillarRotation: string[],
  scheduledDates: Date[],
  formatsDistribution: Array<{
    format_type: string;
    coming_soon: boolean;
    platform: string;
  }>,
  culturalMoments: CulturalMoment[]
): CalendarSlot[] {
  const platforms =
    input.platforms.length > 0 ? input.platforms : ["instagram", "facebook"];
  const businessName = brandField(input.brand, "business_name", "your business");

  return Array.from({ length: totalPosts }, (_, i) => {
    const date = scheduledDates[i] ?? scheduledDates[scheduledDates.length - 1] ?? new Date();
    const fmt = formatsDistribution[i] ?? {
      format_type: "static_image",
      coming_soon: false,
      platform: platforms[i % platforms.length],
    };
    const cultural =
      culturalMoments[i % Math.max(culturalMoments.length, 1)] ?? null;
    const isCultural = culturalMoments.length > 0 && i < culturalMoments.length;

    return {
      user_id: input.userId,
      pillar_id: pillarRotation[i] ?? null,
      platform: fmt.platform,
      scheduled_date: date.toISOString().split("T")[0],
      scheduled_time: getSuggestedTime(fmt.platform, date),
      format_type: fmt.format_type,
      topic: isCultural
        ? `${cultural!.name} for ${businessName}`
        : `Share value from ${businessName} — tip ${i + 1}`,
      hook: isCultural
        ? `Celebrating ${cultural!.name} with our community`
        : `Quick tip for your week #${i + 1}`,
      brief: isCultural
        ? cultural!.content_angle
        : `A starter post idea for ${businessName}. Edit this brief to match your voice.`,
      status: "draft" as const,
      is_cultural_moment: isCultural,
      cultural_moment_name: isCultural ? cultural!.name : null,
      coming_soon: fmt.coming_soon,
      is_series: false,
      series_title: null,
      series_part: null,
      series_total: null,
      repurposed_from: null,
      needs_review: false,
      trend_source: null,
      generation_source: "fallback" as const,
    };
  });
}

export function mergeCalendarOutput(
  generated: GeneratedSlot[],
  pillarRotation: string[],
  scheduledDates: Date[],
  formatsDistribution: Array<{
    format_type: string;
    coming_soon: boolean;
    platform: string;
  }>,
  culturalMoments: CulturalMoment[],
  userId: string,
  pillars: ContentPillar[],
  trends: TrendingTopic[] = []
): CalendarSlot[] {
  const pillarByName = new Map(
    pillars.map((p) => [p.name.toLowerCase(), p.id ?? null])
  );

  const count = Math.min(
    generated.length || scheduledDates.length,
    scheduledDates.length || generated.length
  );

  return Array.from({ length: Math.max(count, scheduledDates.length) }, (_, i) => {
    const g = generated[i];
    const date = scheduledDates[i] ?? scheduledDates[scheduledDates.length - 1];
    const fmt = formatsDistribution[i];
    const platform = g?.platform ?? fmt?.platform ?? "instagram";
    const format_type = g?.format_type ?? fmt?.format_type ?? "static_image";
    const coming_soon =
      g?.coming_soon ??
      fmt?.coming_soon ??
      Boolean(
        PLATFORM_FORMATS[platform]?.find((f) => f.type === format_type)
          ?.coming_soon
      );

    const topic = g?.topic ?? `Content idea ${i + 1}`;
    const hook = g?.hook ?? "";
    const brief = g?.brief ?? "";

    const pillarId =
      (g?.pillar_name
        ? pillarByName.get(g.pillar_name.toLowerCase())
        : null) ??
      pillarRotation[i] ??
      null;

    const culturalName = g?.cultural_moment_name ?? null;
    const isCultural =
      g?.is_cultural_moment ??
      Boolean(
        culturalName ||
          culturalMoments.some(
            (m) =>
              m.day === date.getDate() ||
              (m.date && m.date === date.toISOString().split("T")[0])
          )
      );

    const matchedTrend = g?.trend_topic
      ? trends.find((t) => t.topic === g.trend_topic)
      : null;

    return {
      user_id: userId,
      pillar_id: pillarId,
      platform,
      scheduled_date: date.toISOString().split("T")[0],
      scheduled_time: getSuggestedTime(platform, date),
      format_type,
      topic,
      hook,
      brief,
      status: "draft" as const,
      is_cultural_moment: isCultural,
      cultural_moment_name:
        culturalName ??
        (isCultural
          ? culturalMoments.find((m) => m.day === date.getDate())?.name ?? null
          : null),
      coming_soon,
      is_series: false,
      series_title: null,
      series_part: null,
      series_total: null,
      repurposed_from: null,
      needs_review:
        hasPlaceholder(topic) || hasPlaceholder(hook) || hasPlaceholder(brief),
      trend_source: matchedTrend
        ? {
            topic: matchedTrend.topic,
            angle: matchedTrend.angle,
            fetched_at: new Date().toISOString(),
          }
        : null,
      generation_source: "ai" as const,
    };
  });
}

export async function generateMonthlyCalendar(
  input: CalendarGenerationInput
): Promise<CalendarGenerationResult> {
  const { month, year, brand, pillars, platforms, postsPerMonth } = input;

  const culturalMoments = getNigerianCulturalMoments(month, year);
  const industry = brandField(brand, "industry", "business");
  const location =
    brandField(brand, "location_city") ||
    brandField(brand, "location", "Lagos");

  const trends = await getTrendingTopics(industry, location);

  const totalPosts = postsPerMonth === null ? 30 : postsPerMonth;
  const distribution = distributePostsAcrossPlatforms(totalPosts, platforms);
  const pillarRotation = rotatePillars(pillars, totalPosts);
  const scheduledDates = distributeDatesAcrossMonth(month, year, totalPosts);
  const formatsDistribution = distributeFormats(totalPosts, platforms);

  if (scheduledDates.length === 0) {
    return { slots: [], usedFallback: false };
  }

  const calendarPrompt = buildCalendarPrompt({
    brand,
    pillars,
    platforms,
    culturalMoments,
    trends,
    totalPosts: scheduledDates.length,
    distribution,
    month,
    year,
  });

  let generated: { slots: GeneratedSlot[] };
  try {
    try {
      generated = await geminiJSON<{ slots: GeneratedSlot[] }>(
        calendarPrompt,
        "flash"
      );
    } catch (initialErr) {
      console.warn(
        "[generateMonthlyCalendar] initial Gemini call failed, retrying with stricter JSON instruction:",
        initialErr
      );
      generated = await geminiJSON<{ slots: GeneratedSlot[] }>(
        calendarPrompt +
          "\n\nIMPORTANT: Output ONLY valid JSON. No markdown fences. Start with { end with }.",
        "flash"
      );
    }
  } catch (err) {
    // Both the initial call and the stricter-JSON retry failed. This is the
    // failure mode that used to silently produce indistinguishable template
    // content — now logged with full diagnostic detail and flagged via
    // usedFallback so callers/UI can surface it instead of hiding it.
    console.error(
      "[generateMonthlyCalendar] both Gemini attempts failed — falling back to template slots. " +
        `userId=${input.userId} month=${month} year=${year}. Error:`,
      err
    );
    return {
      slots: buildTemplateSlots(
        input,
        scheduledDates.length,
        pillarRotation,
        scheduledDates,
        formatsDistribution,
        culturalMoments
      ),
      usedFallback: true,
      reason:
        "We couldn't reach the AI right now, so starter content was created instead.",
    };
  }

  return {
    slots: mergeCalendarOutput(
      generated.slots ?? [],
      pillarRotation,
      scheduledDates,
      formatsDistribution,
      culturalMoments,
      input.userId,
      pillars,
      trends
    ),
    usedFallback: false,
  };
}
