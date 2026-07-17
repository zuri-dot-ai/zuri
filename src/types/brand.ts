// ════════════════════════════════════════════════════════
//  ZURI — Brand & AI Domain Types
// ════════════════════════════════════════════════════════

/** Mirrors `business_profiles` + handle from `profiles` — used by the website generation pipeline. */
export interface BusinessProfile {
  id: string;
  user_id: string;
  /** From `profiles.handle` — required to upsert `websites.handle`. */
  handle: string;
  business_name: string;
  industry: string;
  business_type: string;
  services: string[];
  target_audience: string;
  location: string;
  location_city: string | null;
  brand_tone: string;
  unique_value: string;
  tagline: string;
  brand_vibe: string;
  color_primary: string;
  color_accent: string;
  platforms: string[];
}

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