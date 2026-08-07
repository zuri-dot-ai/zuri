// ════════════════════════════════════════════════════════
//  ZURI — Monthly Calendar Generator
//  docs/03_CONTENT_STRATEGY.md §3
//  Uses Gemini (Flash → Pro cascade) for calendar generation —
//  switched from NVIDIA/DeepSeek 2026-08-07 after the NVIDIA NIM
//  free-tier DeepSeek models were retired (410 Gone) and the
//  replacement Llama models proved unreliable (repeated timeouts
//  on free-tier capacity). Gemini is the same provider already
//  proven reliable for website generation.
// ════════════════════════════════════════════════════════

import { geminiJSON } from "@/lib/gemini";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";
import type { BusinessProfile } from "@/types/brand";
import { serviceLines } from "@/types/brand";
import type { ContentCalendarRow } from "@/types/database";
import { getNigerianCulturalMoments, type CulturalMoment } from "./cultural-calendar";
import {
  formatContentProfileForPrompt,
  parseContentProfile,
  postingKeyForDate,
  type ContentProfile,
  type PostingDayKey,
} from "./content-profile";
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

/** Max AI slots per request — keeps completions well under the 90s NVIDIA budget. */
export const CALENDAR_CHUNK_SIZE = 8;

export function calendarChunkCount(totalPosts: number): number {
  if (totalPosts <= 0) return 0;
  return Math.ceil(totalPosts / CALENDAR_CHUNK_SIZE);
}

export interface CalendarChunkResult extends CalendarGenerationResult {
  chunkIndex: number;
  chunkCount: number;
  done: boolean;
  /** Planned posts for the full month (after date availability trim). */
  totalPosts: number;
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
  /** Optional range hint when generating a week-sized chunk of the month. */
  dateRangeHint?: string;
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
  total: number,
  postingDays?: PostingDayKey[]
): Date[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const startDay =
    month === today.getMonth() + 1 && year === today.getFullYear()
      ? today.getDate() + 1
      : 1;

  if (startDay > daysInMonth || total <= 0) return [];

  const allowed = postingDays && postingDays.length > 0 ? new Set(postingDays) : null;

  const availableDays = Array.from(
    { length: daysInMonth - startDay + 1 },
    (_, i) => startDay + i
  ).filter((day) => {
    if (!allowed) {
      const d = new Date(year, month - 1, day);
      return d.getDay() !== 0;
    }
    const key = postingKeyForDate(new Date(year, month - 1, day));
    return key != null && allowed.has(key);
  });

  if (availableDays.length === 0 && postingDays && postingDays.length > 0) {
    // Fallback: any non-Sunday day if filter emptied the month
    return distributeDatesAcrossMonth(month, year, total, undefined);
  }

  const interval = Math.max(1, Math.floor(availableDays.length / Math.max(total, 1)));
  const dates: Date[] = [];

  for (let i = 0; i < total && i * interval < availableDays.length; i++) {
    const day = availableDays[Math.min(i * interval, availableDays.length - 1)];
    dates.push(new Date(year, month - 1, day));
  }

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
  total: number,
  scheduledDates?: Date[],
  schedule?: Partial<Record<PostingDayKey, string>>
): string[] {
  const activePillars = pillars.filter((p) => p.is_active && p.id);
  if (activePillars.length === 0) return [];

  const rotation: string[] = [];
  for (let i = 0; i < total; i++) {
    const date = scheduledDates?.[i];
    if (date && schedule) {
      const key = postingKeyForDate(date);
      const scheduledId = key ? schedule[key] : undefined;
      if (
        scheduledId &&
        activePillars.some((p) => p.id === scheduledId)
      ) {
        rotation.push(scheduledId);
        continue;
      }
    }
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
    dateRangeHint,
  } = params;

  const monthName = new Date(year, month - 1, 1).toLocaleString("en-NG", {
    month: "long",
  });

  const businessName = sanitizeForPrompt(brandField(brand, "business_name", "Business"));
  const industry = sanitizeForPrompt(brandField(brand, "industry"));
  const services = sanitizeForPrompt(
    serviceLines((brand as Record<string, unknown>).services).join("; ")
  );
  const location = sanitizeForPrompt(
    brandField(brand, "location_city") || brandField(brand, "location", "Lagos")
  );
  const rawAudience = brandField(brand, "target_audience");
  const audience = sanitizeForPrompt(rawAudience);
  const tone = sanitizeForPrompt(brandField(brand, "brand_tone", "professional"));
  const pitchLine = sanitizeForPrompt(brandField(brand, "pitch_line"));
  const toneSample = sanitizeForPrompt(brandField(brand, "tone_sample_choice"));

  const brandRecord = brand as Record<string, unknown>;
  const contentProfile: ContentProfile =
    brandRecord.content_profile &&
    typeof brandRecord.content_profile === "object" &&
    "primary_tone" in (brandRecord.content_profile as object)
      ? (brandRecord.content_profile as ContentProfile)
      : parseContentProfile(brandRecord.content_profile, {
          brand_tone: brandField(brand, "brand_tone", "professional"),
          target_audience: rawAudience,
          services: brandRecord.services,
        });
  const profileBlock = formatContentProfileForPrompt(contentProfile);

  // Onboarding frequently leaves these thin (e.g. "everyone", a single
  // generic service, no city) — a working AI call with thin input still
  // produces generic output. Detect that and explicitly ask the model to
  // infer specifics rather than silently generating "everyone"-flavoured
  // posts from a blank/lazy value.
  const isThinAudience =
    !rawAudience.trim() ||
    /^(everyone|everybody|anyone|general public|all)$/i.test(rawAudience.trim());
  const isThinServices =
    !services.trim() ||
    serviceLines((brand as Record<string, unknown>).services).length <= 1;
  const inferenceNote =
    isThinAudience || isThinServices
      ? `\nNOTE: Some business details above are thin or generic (e.g. a vague target audience` +
        ` or a single generic service). Where that's the case, infer sensible, specific details` +
        ` for a typical Nigerian ${industry || "small"} business in ${location} rather than writing` +
        ` generic posts aimed at "everyone" — pick a plausible specific audience segment and service` +
        ` angle for each post instead.\n`
      : "";

  const scopeLine = dateRangeHint
    ? `Create exactly ${totalPosts} posts for ${monthName} ${year} covering ${dateRangeHint} (this is one chunk of the monthly calendar — output exactly ${totalPosts} slots).`
    : `Create a ${totalPosts}-post content calendar for ${monthName} ${year} for the business below.`;

  return `
You are a social media strategist specialising in Nigerian small businesses.
${scopeLine}

BUSINESS:
- Name: ${businessName}
- Industry: ${industry}
- Services: ${services}
- Location: ${location}, Nigeria
- Target audience: ${audience}
- Brand tone: ${tone}
${pitchLine ? `- Differentiator: ${pitchLine}` : ""}
${toneSample ? `- Preferred voice sample (match this register): "${toneSample}"` : ""}
${profileBlock}
${inferenceNote}

CONTENT PILLARS (rotate through these — match pillar_name exactly when assigning):
${pillars.map((p) => `- ${sanitizeForPrompt(p.name)}: ${sanitizeForPrompt(p.description ?? "")}`).join("\n")}

POSTING CADENCE: Prefer scheduling on the business's preferred weekdays when possible.
Respect pillar rotation — each slot's pillar_name must be one of the pillars listed above.

PLATFORM DISTRIBUTION (posts in this batch):
${Object.entries(distribution)
  .map(([p, n]) => `- ${p}: ${n} posts`)
  .join("\n")}

NIGERIAN CULTURAL MOMENTS THIS MONTH (include when a slot falls on/near the moment):
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
1. Output exactly ${totalPosts} slots — no more, no fewer
2. Every slot must have a unique, specific topic — no two slots can have the same topic
3. Every post must be directly relevant to ${businessName} and its audience
4. Topics must feel authentic to a Nigerian audience — reference local context, language, and culture where natural
5. Do NOT schedule posts on Sundays unless specifically for a cultural moment
6. Rotate through content pillars — no pillar should appear more than twice in a row
7. Each slot must include a specific HOOK — the first line the audience will read or see
8. Video format slots: mark as coming_soon: true — these appear in the calendar but cannot be generated yet
9. At least 20% of posts should be engagement-driven (questions, polls, challenges, opinions)
10. If a slot's topic is directly inspired by one of the TRENDING TOPICS listed above,
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

function isTimeoutError(err: unknown): boolean {
  if (err instanceof Error && err.name === "AbortError") return true;
  return /timeout|AbortError/i.test(String(err));
}

function isJsonParseError(err: unknown): boolean {
  return /JSON|SyntaxError/i.test(String(err));
}

/** Compact, always-informative error description for logs. */
function describeErr(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 400);
  return String(err).slice(0, 400);
}

/**
 * geminiJSON has no built-in per-call timeout (unlike the old nvidiaJSON,
 * which used AbortSignal.timeout internally). Race it against a manual
 * timeout here so a single slow Gemini call can't consume the whole
 * request's time budget and trigger a hard Vercel FUNCTION_INVOCATION_TIMEOUT.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`TimeoutError: Gemini call exceeded ${ms}ms budget`));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

interface MonthPlan {
  totalPosts: number;
  culturalMoments: CulturalMoment[];
  trends: TrendingTopic[];
  pillarRotation: string[];
  scheduledDates: Date[];
  formatsDistribution: Array<{
    format_type: string;
    coming_soon: boolean;
    platform: string;
  }>;
}

async function buildMonthPlan(
  input: CalendarGenerationInput
): Promise<MonthPlan> {
  const { month, year, brand, pillars, platforms, postsPerMonth } = input;

  const culturalMoments = getNigerianCulturalMoments(month, year);
  const industry = brandField(brand, "industry", "business");
  const location =
    brandField(brand, "location_city") ||
    brandField(brand, "location", "Lagos");

  // Never block calendar generation on a fresh trending-topics call.
  const trends = await getTrendingTopics(industry, location, {
    waitForFresh: false,
  });

  const brandRecord = brand as Record<string, unknown>;
  const contentProfile =
    brandRecord.content_profile &&
    typeof brandRecord.content_profile === "object" &&
    "primary_tone" in (brandRecord.content_profile as object)
      ? (brandRecord.content_profile as ContentProfile)
      : parseContentProfile(brandRecord.content_profile, {
          brand_tone: brandField(brand, "brand_tone", "professional"),
          target_audience: brandField(brand, "target_audience"),
          services: brandRecord.services,
        });

  const requested = postsPerMonth === null ? 30 : postsPerMonth;
  const scheduledDates = distributeDatesAcrossMonth(
    month,
    year,
    requested,
    contentProfile.posting_days
  );
  const totalPosts = scheduledDates.length;
  const pillarRotation = rotatePillars(
    pillars,
    totalPosts,
    scheduledDates,
    contentProfile.pillar_schedule
  );
  const formatsDistribution = distributeFormats(totalPosts, platforms);

  return {
    totalPosts,
    culturalMoments,
    trends,
    pillarRotation,
    scheduledDates,
    formatsDistribution,
  };
}

function formatDateRangeHint(dates: Date[]): string {
  if (dates.length === 0) return "";
  const fmt = (d: Date) =>
    d.toLocaleString("en-NG", { month: "short", day: "numeric" });
  if (dates.length === 1) return fmt(dates[0]);
  return `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;
}

/**
 * Hard wall-clock budget for the whole calendar-tier Gemini cascade
 * (Flash retries + possible Pro attempt), inside a 120s serverless
 * invocation that also does Supabase I/O. Leaves headroom for the rest
 * of the route.
 */
const CALENDAR_AI_BUDGET_MS = 80_000;
/** Per-call timeout for calendar-tier Gemini calls — short enough that
 * one slow/hanging call can't eat the whole budget by itself. */
const CALENDAR_CALL_TIMEOUT_MS = 25_000;
/** Don't even attempt the Pro fallback if less than this much budget
 * remains — a Pro call needs realistic room to succeed. */
const MIN_BUDGET_FOR_PRO_MS = 25_000;

async function generateSlotsForSlice(
  input: CalendarGenerationInput,
  plan: MonthPlan,
  sliceStart: number,
  sliceDates: Date[],
  slicePillars: string[],
  sliceFormats: MonthPlan["formatsDistribution"]
): Promise<CalendarGenerationResult> {
  const { month, year, brand, pillars, platforms } = input;
  const chunkCount = sliceDates.length;
  if (chunkCount === 0) {
    return { slots: [], usedFallback: false };
  }

  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;
  const remaining = () => CALENDAR_AI_BUDGET_MS - elapsed();

  const chunkDistribution = distributePostsAcrossPlatforms(
    chunkCount,
    platforms
  );

  const calendarPrompt = buildCalendarPrompt({
    brand,
    pillars,
    platforms,
    culturalMoments: plan.culturalMoments,
    trends: plan.trends,
    totalPosts: chunkCount,
    distribution: chunkDistribution,
    month,
    year,
    dateRangeHint: formatDateRangeHint(sliceDates),
  });

  const strictPrompt =
    calendarPrompt +
    "\n\nIMPORTANT: Output ONLY valid JSON. No markdown fences. Start with { end with }.";

  let generated: { slots: GeneratedSlot[] } | null = null;

  // Tier 1: Gemini Flash — fast, cheap, bulk of calendar generation.
  try {
    try {
      generated = await withTimeout(
        geminiJSON<{ slots: GeneratedSlot[] }>(calendarPrompt, "flash", 2),
        CALENDAR_CALL_TIMEOUT_MS
      );
    } catch (initialErr) {
      if (isTimeoutError(initialErr) || !isJsonParseError(initialErr)) {
        throw initialErr;
      }
      console.warn(
        "[generateCalendarChunk] Flash JSON parse failed, retrying with stricter instruction:",
        describeErr(initialErr)
      );
      generated = await withTimeout(
        geminiJSON<{ slots: GeneratedSlot[] }>(strictPrompt, "flash", 1),
        CALENDAR_CALL_TIMEOUT_MS
      );
    }
  } catch (flashErr) {
    console.warn(
      `[generateCalendarChunk] Flash tier failed (${describeErr(flashErr)}) after ${elapsed()}ms — ` +
        `${remaining() >= MIN_BUDGET_FOR_PRO_MS ? "trying Pro" : "skipping Pro, insufficient time budget"}. ` +
        `userId=${input.userId} month=${month} year=${year} sliceStart=${sliceStart}`
    );

    // Tier 2: Gemini Pro — only attempted if there's realistically enough
    // time budget left. A timed-out request returns NOTHING to the user
    // (a bare 504); a graceful template fallback at least returns usable
    // slots.
    if (remaining() >= MIN_BUDGET_FOR_PRO_MS) {
      try {
        generated = await withTimeout(
          geminiJSON<{ slots: GeneratedSlot[] }>(calendarPrompt, "pro", 2),
          Math.min(CALENDAR_CALL_TIMEOUT_MS * 2, Math.max(remaining() - 2000, 1000))
        );
      } catch (proErr) {
        console.error(
          `[generateCalendarChunk] Pro tier also failed (${describeErr(proErr)}) after ${elapsed()}ms total — ` +
            `falling back to template slots. userId=${input.userId} month=${month} year=${year} sliceStart=${sliceStart}`
        );
      }
    }

    if (!generated) {
      return {
        slots: buildTemplateSlots(
          input,
          chunkCount,
          slicePillars,
          sliceDates,
          sliceFormats,
          plan.culturalMoments
        ),
        usedFallback: true,
        reason:
          "We couldn't reach the AI right now, so starter content was created instead.",
      };
    }
  }

  return {
    slots: mergeCalendarOutput(
      generated?.slots ?? [],
      slicePillars,
      sliceDates,
      sliceFormats,
      plan.culturalMoments,
      input.userId,
      pillars,
      plan.trends
    ),
    usedFallback: false,
  };
}

/**
 * Generate one deterministic chunk of the monthly calendar.
 * Planning (dates/platforms/pillars) is identical for every chunk of a month.
 */
export async function generateCalendarChunk(
  input: CalendarGenerationInput,
  opts: { chunkIndex: number; chunkCount?: number }
): Promise<CalendarChunkResult> {
  const plan = await buildMonthPlan(input);
  const { totalPosts, scheduledDates, pillarRotation, formatsDistribution } =
    plan;

  if (totalPosts === 0) {
    return {
      slots: [],
      usedFallback: false,
      chunkIndex: 0,
      chunkCount: 0,
      done: true,
      totalPosts: 0,
    };
  }

  const chunkCount = opts.chunkCount ?? calendarChunkCount(totalPosts);
  const chunkIndex = Math.max(
    0,
    Math.min(opts.chunkIndex, Math.max(chunkCount - 1, 0))
  );
  const start = chunkIndex * CALENDAR_CHUNK_SIZE;
  const end = Math.min(start + CALENDAR_CHUNK_SIZE, totalPosts);

  const sliceDates = scheduledDates.slice(start, end);
  const slicePillars = pillarRotation.slice(start, end);
  const sliceFormats = formatsDistribution.slice(start, end);

  const result = await generateSlotsForSlice(
    input,
    plan,
    start,
    sliceDates,
    slicePillars,
    sliceFormats
  );

  return {
    ...result,
    chunkIndex,
    chunkCount,
    done: chunkIndex >= chunkCount - 1,
    totalPosts,
  };
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

/**
 * Full-month helper for seed / internal callers. Generates chunks sequentially
 * and concatenates. Prefer `generateCalendarChunk` for user-facing requests.
 */
export async function generateMonthlyCalendar(
  input: CalendarGenerationInput
): Promise<CalendarGenerationResult> {
  const plan = await buildMonthPlan(input);
  if (plan.totalPosts === 0) {
    return { slots: [], usedFallback: false };
  }

  const chunkCount = calendarChunkCount(plan.totalPosts);
  const allSlots: CalendarSlot[] = [];
  let usedFallback = false;
  let reason: string | undefined;

  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
    const chunk = await generateCalendarChunk(input, {
      chunkIndex,
      chunkCount,
    });
    allSlots.push(...chunk.slots);
    if (chunk.usedFallback) {
      usedFallback = true;
      reason = chunk.reason;
    }
  }

  return { slots: allSlots, usedFallback, ...(reason ? { reason } : {}) };
}