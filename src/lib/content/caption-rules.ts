export interface CaptionRule {
  max_chars: number;
  recommended_chars: number;
  tone: string;
  cta_style: string;
  hashtag_count: { min: number; max: number };
  hashtag_position: string;
  emoji_usage: string;
  structure: string;
}

export const CAPTION_RULES: Record<string, CaptionRule> = {
  instagram: {
    max_chars: 2200,
    recommended_chars: 150,
    tone: "visual-first, conversational, emoji-friendly",
    cta_style: "end with a question or direct call to action",
    hashtag_count: { min: 15, max: 25 },
    hashtag_position: "end",
    emoji_usage: "encouraged — 2-4 emojis to add energy",
    structure: "Hook line → 2-3 sentences → CTA → line break → hashtags",
  },
  facebook: {
    max_chars: 63206,
    recommended_chars: 250,
    tone: "conversational, storytelling, community-focused",
    cta_style: "ask a question or invite comments",
    hashtag_count: { min: 0, max: 3 },
    hashtag_position: "inline or end",
    emoji_usage: "light — 1-2 emojis maximum",
    structure: "Hook → story or context (2-4 sentences) → CTA",
  },
  linkedin: {
    max_chars: 3000,
    recommended_chars: 300,
    tone: "professional, insights-driven, first-person narrative",
    cta_style: "invite thoughts or professional discussion",
    hashtag_count: { min: 3, max: 5 },
    hashtag_position: "end",
    emoji_usage: "very light or none — use sparingly for emphasis only",
    structure:
      "Bold opening statement → insight or story (3-4 short paragraphs) → professional CTA → hashtags",
  },
  x: {
    max_chars: 280,
    recommended_chars: 220,
    tone: "punchy, opinionated, direct, conversational",
    cta_style: "provocative question or bold statement that invites replies",
    hashtag_count: { min: 0, max: 2 },
    hashtag_position: "inline",
    emoji_usage: "optional — 1 max",
    structure: "Strong hook (the whole post IS the hook — no preamble)",
  },
  tiktok: {
    max_chars: 2200,
    recommended_chars: 100,
    tone: "casual, energetic, trend-aware",
    cta_style: "follow, comment, duet, or stitch",
    hashtag_count: { min: 3, max: 10 },
    hashtag_position: "end",
    emoji_usage: "encouraged — 2-5 emojis",
    structure: "Hook → 1-2 sentences → CTA → hashtags",
  },
};
