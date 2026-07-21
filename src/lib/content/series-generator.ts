// ════════════════════════════════════════════════════════
//  ZURI — Content Series Generator
//  docs/03_CONTENT_STRATEGY.md §8
// ════════════════════════════════════════════════════════

import { geminiJSON } from "@/lib/gemini";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";
import type { BusinessProfile } from "@/types/brand";
import type { DesignArchetype } from "./cultural-calendar";
import type { CalendarSlot } from "./calendar-generator";
import { getSuggestedTime } from "./posting-times";

export interface SeriesDefinition {
  name: string;
  description: string;
  post_count: number;
  duration_days: number;
  best_for: DesignArchetype[];
}

export const SERIES_TEMPLATES: SeriesDefinition[] = [
  {
    name: "Meet the Team",
    description: "One team member per day, 5 days",
    post_count: 5,
    duration_days: 5,
    best_for: ["authority-minimal", "trust-professional", "clean-modern"],
  },
  {
    name: "How We Make It",
    description: "Behind-the-scenes process in 4 parts",
    post_count: 4,
    duration_days: 7,
    best_for: ["warm-sensory", "portfolio-dramatic", "editorial-bold"],
  },
  {
    name: "Customer of the Week",
    description: "Feature a customer story across 3 posts",
    post_count: 3,
    duration_days: 7,
    best_for: ["community-vibrant", "luxury-aspirational", "warm-sensory"],
  },
  {
    name: "5 Tips Series",
    description: "One actionable tip per day for 5 days",
    post_count: 5,
    duration_days: 5,
    best_for: [
      "authority-minimal",
      "trust-professional",
      "clean-modern",
      "community-vibrant",
    ],
  },
  {
    name: "Before & After",
    description: "2-post transformation reveal",
    post_count: 2,
    duration_days: 3,
    best_for: ["luxury-aspirational", "community-vibrant", "warm-sensory"],
  },
  {
    name: "Product Deep Dive",
    description: "3-part breakdown of your signature product or service",
    post_count: 3,
    duration_days: 5,
    best_for: ["clean-modern", "editorial-bold", "authority-minimal"],
  },
];

export async function generateSeries(
  brand: BusinessProfile | Record<string, unknown>,
  seriesTemplate: SeriesDefinition,
  platform: string,
  startDate: Date,
  userId: string,
  pillarId?: string | null
): Promise<CalendarSlot[]> {
  const businessName = sanitizeForPrompt(
    String((brand as { business_name?: string }).business_name ?? "Business")
  );
  const industry = sanitizeForPrompt(
    String((brand as { industry?: string }).industry ?? "")
  );
  const services = Array.isArray((brand as { services?: string[] }).services)
    ? (brand as { services: string[] }).services
        .map((s) => sanitizeForPrompt(s))
        .join(", ")
    : "";
  const tone = sanitizeForPrompt(
    String(
      (brand as { brand_tone?: string }).brand_tone ??
        (brand as { tone?: string }).tone ??
        "professional"
    )
  );

  const prompt = `
Create a ${seriesTemplate.post_count}-part content series called "${sanitizeForPrompt(seriesTemplate.name)}"
for ${businessName} (${industry}).

Series description: ${sanitizeForPrompt(seriesTemplate.description)}
Platform: ${sanitizeForPrompt(platform)}
Start date: ${startDate.toISOString().split("T")[0]}
Business services: ${services}
Brand tone: ${tone}

Generate exactly ${seriesTemplate.post_count} posts that form a cohesive series.
Each post must reference the series (so the audience knows it is part of a set).
Each post must build on or complement the previous one.

Output ONLY valid JSON:
{
  "series_title": "series name customised for this business",
  "posts": [
    {
      "part_number": 1,
      "topic": "specific topic for this post",
      "hook": "opening hook that mentions Part 1 of the series",
      "brief": "what this post should say",
      "format_type": "static_image"
    }
  ]
}
`;

  const { series_title, posts } = await geminiJSON<{
    series_title: string;
    posts: Array<{
      part_number: number;
      topic: string;
      hook: string;
      brief: string;
      format_type: string;
    }>;
  }>(prompt, "flash");

  return (posts ?? []).map((post, i) => {
    const postDate = new Date(startDate);
    postDate.setDate(
      startDate.getDate() +
        Math.floor(
          (i / seriesTemplate.post_count) * seriesTemplate.duration_days
        )
    );

    return {
      user_id: userId,
      pillar_id: pillarId ?? null,
      platform,
      topic: `[Series: ${series_title}] Part ${post.part_number}: ${post.topic}`,
      hook: post.hook,
      brief: post.brief,
      format_type: post.format_type || "static_image",
      scheduled_date: postDate.toISOString().split("T")[0],
      scheduled_time: getSuggestedTime(platform, postDate),
      status: "draft" as const,
      is_series: true,
      series_title,
      series_part: post.part_number,
      series_total: seriesTemplate.post_count,
      is_cultural_moment: false,
      cultural_moment_name: null,
      coming_soon: false,
      repurposed_from: null,
      needs_review: false,
    };
  });
}
