// ════════════════════════════════════════════════════════
//  ZURI — Repurpose Engine
//  docs/03_CONTENT_STRATEGY.md §7
// ════════════════════════════════════════════════════════

import type { SupabaseClient } from "@supabase/supabase-js";
import { geminiJSON } from "@/lib/gemini";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";
import type { ContentCalendarRow } from "@/types/database";
import { getSuggestedTime } from "./posting-times";

export async function repurposeSlot(
  supabase: SupabaseClient,
  userId: string,
  sourceSlotId: string,
  targetPlatforms: string[]
): Promise<ContentCalendarRow[]> {
  const { data: sourceSlot } = await supabase
    .from("content_calendar")
    .select("*, content_pillars(name, description)")
    .eq("id", sourceSlotId)
    .eq("user_id", userId)
    .single();

  if (!sourceSlot) throw new Error("Source slot not found");

  const { data: brand } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  const pillarName =
    (sourceSlot as { content_pillars?: { name?: string } }).content_pillars
      ?.name ?? "";

  const prompt = `
You are adapting a social media post idea for multiple platforms.

BUSINESS: ${sanitizeForPrompt(brand?.business_name)} — ${sanitizeForPrompt(brand?.industry)}
ORIGINAL PLATFORM: ${sanitizeForPrompt(sourceSlot.platform)}
ORIGINAL TOPIC: ${sanitizeForPrompt(sourceSlot.topic)}
ORIGINAL HOOK: ${sanitizeForPrompt(sourceSlot.hook)}
ORIGINAL BRIEF: ${sanitizeForPrompt(sourceSlot.brief)}
CONTENT PILLAR: ${sanitizeForPrompt(pillarName)}

Adapt this content idea for each of the following platforms.
Keep the CORE MESSAGE identical but adjust the format, tone, and hook for each platform's audience behaviour.

TARGET PLATFORMS: ${targetPlatforms.map((p) => sanitizeForPrompt(p)).join(", ")}

Platform-specific adaptation rules:
- instagram: visual-first, punchy hook, emotion-driven, max 150 words caption
- facebook: conversational, can be longer (up to 250 words), storytelling works well
- linkedin: professional angle, thought leadership lens, insights-focused, 100-200 words
- x: ultra-short (max 60 words), punchy opinion or question, thread-friendly
- tiktok: script hook for short video (coming_soon: true), max 3 sentences

Output ONLY valid JSON:
{
  "adaptations": [
    {
      "platform": "instagram",
      "topic": "adapted topic",
      "hook": "adapted hook for this platform",
      "brief": "adapted brief for this platform",
      "format_type": "static_image",
      "coming_soon": false
    }
  ]
}
`;

  try {
    const { adaptations } = await geminiJSON<{
      adaptations: Array<{
        platform: string;
        topic: string;
        hook: string;
        brief: string;
        format_type: string;
        coming_soon?: boolean;
      }>;
    }>(prompt, "flash");

    const newSlots = (adaptations ?? [])
      .filter((a) => targetPlatforms.includes(a.platform))
      .map((adaptation) => ({
        user_id: userId,
        pillar_id: sourceSlot.pillar_id,
        platform: adaptation.platform,
        scheduled_date: sourceSlot.scheduled_date,
        scheduled_time: getSuggestedTime(
          adaptation.platform,
          new Date(sourceSlot.scheduled_date)
        ),
        format_type: adaptation.format_type || "static_image",
        topic: adaptation.topic,
        hook: adaptation.hook,
        brief: adaptation.brief,
        status: "draft" as const,
        coming_soon: adaptation.coming_soon ?? false,
        is_cultural_moment: false,
        cultural_moment_name: null,
        is_series: false,
        series_title: null,
        series_part: null,
        series_total: null,
        repurposed_from: sourceSlotId,
        needs_review: false,
        generation_source: "ai" as const,
      }));

    if (newSlots.length === 0) return [];

    const { data: inserted } = await supabase
      .from("content_calendar")
      .insert(newSlots)
      .select();

    return (inserted as ContentCalendarRow[]) ?? [];
  } catch (err) {
    console.error("[repurposeSlot]", err);
    throw new Error("Could not repurpose to all platforms. Please try again.");
  }
}
