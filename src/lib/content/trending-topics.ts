// ════════════════════════════════════════════════════════
//  ZURI — Trending Topics Engine
//  docs/03_CONTENT_STRATEGY.md §5
// ════════════════════════════════════════════════════════

import { createServiceClient } from "@/lib/supabase/service";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";
import { FLASH } from "@/lib/gemini";

export interface TrendingTopic {
  topic: string;
  angle: string;
  relevance: "high" | "medium";
  source: "web_search" | "cached" | "fallback";
}

export async function getTrendingTopics(
  industry: string,
  location: string
): Promise<TrendingTopic[]> {
  const cached = await getCachedTrends(industry);
  if (cached) return cached;

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const model = FLASH || "gemini-flash-latest";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Search the web for what is trending right now in ${safeIndustry} in Nigeria (${safeLocation}).
Find 5 specific trending topics, news items, conversations, or moments that a
${safeIndustry} business in Nigeria should be talking about on social media this week.

For each topic, provide:
- topic: the trend or moment (specific, not generic)
- angle: how a ${safeIndustry} business should address this topic on social media (1 sentence)
- relevance: "high" or "medium"

Output ONLY valid JSON: { "topics": [ { "topic": "...", "angle": "...", "relevance": "high" } ] }
No markdown, no explanation.`,
              },
            ],
          },
        ],
        tools: [{ googleSearch: {} }],
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(
      `Gemini trending fetch failed: ${response.status} ${errBody.slice(0, 500)}`
    );
  }

  const data = await response.json();
  const text =
    data.candidates?.[0]?.content?.parts
      ?.filter((p: { text?: string }) => p.text)
      .map((p: { text: string }) => p.text)
      .join("") ?? "";

  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned) as {
    topics?: Array<{ topic: string; angle: string; relevance?: string }>;
  };

  return (parsed.topics ?? []).map((t) => ({
    topic: t.topic,
    angle: t.angle,
    relevance: t.relevance === "medium" ? "medium" : "high",
    source: "web_search" as const,
  }));
}

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
