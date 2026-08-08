// ════════════════════════════════════════════════════════
//  ZURI — Trending Topics Engine
//  docs/03_CONTENT_STRATEGY.md §5
//  Uses Gemini for Content AI (switched from NVIDIA 2026-08-07).
// ════════════════════════════════════════════════════════

import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";
import { geminiJSON } from "@/lib/gemini";

export interface TrendingTopic {
  topic: string;
  angle: string;
  relevance: "high" | "medium";
  source: "web_search" | "cached" | "fallback";
}

/**
 * Warm the trends cache in the background. Never awaited on the calendar
 * critical path — failures are logged and ignored.
 */
export function warmTrendingCache(industry: string, location: string): void {
  void (async () => {
    try {
      const topics = await fetchTrendingWithGemini(industry, location);
      await cacheTrends(industry, topics);
    } catch (err) {
      console.error(
        `[warmTrendingCache] failed for industry="${industry}":`,
        err
      );
    }
  })();
}

/**
 * @param waitForFresh When false (calendar generation), return cache or
 *   hardcoded fallback immediately and refresh trends in the background.
 *   When true (default — trending API), await a fresh fetch on cache miss.
 */
export async function getTrendingTopics(
  industry: string,
  location: string,
  opts?: { waitForFresh?: boolean }
): Promise<TrendingTopic[]> {
  const waitForFresh = opts?.waitForFresh ?? true;
  const cached = await getCachedTrends(industry);
  if (cached) return cached;

  if (!waitForFresh) {
    warmTrendingCache(industry, location);
    return getFallbackTopics(industry);
  }

  try {
    const topics = await fetchTrendingWithGemini(industry, location);
    await cacheTrends(industry, topics);
    return topics;
  } catch (err) {
    console.error(
      `[getTrendingTopics] falling back to hardcoded topics for industry="${industry}":`,
      err
    );
    return getFallbackTopics(industry);
  }
}

export async function fetchTrendingWithGemini(
  industry: string,
  location: string
): Promise<TrendingTopic[]> {
  const safeIndustry = sanitizeForPrompt(industry).slice(0, 100);
  const safeLocation = sanitizeForPrompt(location).slice(0, 100);

  const parsed = await geminiJSON<{
    topics?: Array<{ topic: string; angle: string; relevance?: string }>;
  }>(
    `Suggest 5 timely social media topics for a ${safeIndustry} business in Nigeria (${safeLocation}) this week.

Base ideas on common Nigerian market conversations, seasonal moments, and industry angles — be specific, not generic.

For each topic, provide:
- topic: the trend or moment (specific)
- angle: how a ${safeIndustry} business should address this on social media (1 sentence)
- relevance: "high" or "medium"

Output ONLY valid JSON: { "topics": [ { "topic": "...", "angle": "...", "relevance": "high" } ] }
No markdown, no explanation.`,
    "flash"
  );

  return (parsed.topics ?? []).map((t) => ({
    topic: t.topic,
    angle: t.angle,
    relevance: t.relevance === "medium" ? ("medium" as const) : ("high" as const),
    source: "web_search" as const,
  }));
}

/** @deprecated Use fetchTrendingWithGemini — kept as alias for any external callers. */
export const fetchTrendingWithNvidia = fetchTrendingWithGemini;

export function getFallbackTopics(industry: string): TrendingTopic[] {
  const FALLBACKS: Record<string, TrendingTopic[]> = {
    default: [
      {
        topic: "Supporting local Nigerian businesses",
        angle:
          "Why buying local matters and how your business contributes to the Nigerian economy",
        relevance: "high",
        source: "fallback",
      },
      {
        topic: "Entrepreneurship in Nigeria",
        angle:
          "Share your own journey building a business in Nigeria — authentic stories resonate deeply",
        relevance: "medium",
        source: "fallback",
      },
      {
        topic: "Quality over quantity mindset",
        angle:
          "Speak to the premium value your business delivers vs. cheaper alternatives",
        relevance: "medium",
        source: "fallback",
      },
    ],
    "Food & Beverage": [
      {
        topic: "Healthy eating in Nigeria",
        angle: "How your food business caters to health-conscious Nigerians",
        relevance: "high",
        source: "fallback",
      },
      {
        topic: "Naija comfort food",
        angle:
          "Celebrate the emotional connection Nigerians have with traditional flavours",
        relevance: "high",
        source: "fallback",
      },
    ],
    "Beauty & Personal Care": [
      {
        topic: "Natural hair movement Nigeria",
        angle:
          "Position your salon or beauty brand within the natural/protective style conversation",
        relevance: "high",
        source: "fallback",
      },
      {
        topic: "Skin care for melanin-rich skin",
        angle:
          "Education content about products and routines for Nigerian skin tones",
        relevance: "high",
        source: "fallback",
      },
    ],
  };

  return FALLBACKS[industry] ?? FALLBACKS["default"];
}

export async function getCachedTrends(
  industry: string
): Promise<TrendingTopic[] | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("trending_topics_cache")
    .select("topics, cached_at")
    .eq("industry", industry)
    .maybeSingle();

  if (!data) return null;

  const ageHours =
    (Date.now() - new Date(data.cached_at).getTime()) / 3600000;
  if (ageHours > 24) return null;

  return (data.topics as TrendingTopic[]).map((t) => ({
    ...t,
    source: "cached" as const,
  }));
}

export async function cacheTrends(
  industry: string,
  topics: TrendingTopic[]
): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("trending_topics_cache").upsert(
    {
      industry,
      topics,
      cached_at: new Date().toISOString(),
    },
    { onConflict: "industry" }
  );
}