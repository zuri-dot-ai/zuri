// ════════════════════════════════════════════════════════
//  ZURI — Brand & AI Domain Types
// ════════════════════════════════════════════════════════

export type Tone = "professional" | "warm" | "bold" | "playful";

/** Output of the Gemini brand-extraction agent */
export interface ExtractedBrand {
  business_name: string;
  industry: string;
  services: string[];
  target_audience: string;
  tone: Tone;
  unique_value: string;
  location: string;
  tagline_suggestion: string;
}

/** Output of the Gemini content-draft agent */
export interface ContentDraft {
  caption: string;
  hashtags: string[];
  call_to_action: string;
  canva_search_term: string;
  video_script?: string; // Growth tier only
}

/** One task in the 90-day plan (Gemini output) */
export interface GeneratedTask {
  day: number;
  title: string;
  description: string;
  why_this_matters: string;
  task_type: "setup" | "content" | "engagement" | "website";
  platform?: string;
  ai_asset: string;
  estimated_minutes: number;
}

/** Auto-generated agency brief */
export interface AgencyBrief {
  business_summary: string;
  goals: string[];
  platforms: string[];
  content_volume: string;
  budget_range: string;
  timeline: string;
}

/** Weekly AI coach check-in */
export interface WeeklyCheckin {
  headline: string;
  encouragement: string;
  top_moves: string[];
}