// ════════════════════════════════════════════════════════
//  ZURI — Brand & AI Domain Types
// ════════════════════════════════════════════════════════

/** A single structured service — Onboarding V2 (docs/01_ONBOARDING_V2.md §9). */
export interface ServiceEntry {
  name: string;
  description: string;
}

/**
 * `business_profiles.services` is jsonb and may still hold plain strings for
 * rows created before the V2 migration (`to_jsonb(text[])` wraps each string
 * as-is, not as `{name, description}`). Always read through this helper
 * rather than assuming the richer shape.
 */
export function normalizeServices(raw: unknown): ServiceEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): ServiceEntry => {
      if (typeof item === "string") return { name: item, description: "" };
      if (item && typeof item === "object" && "name" in item) {
        const obj = item as Record<string, unknown>;
        return {
          name: typeof obj.name === "string" ? obj.name : "",
          description: typeof obj.description === "string" ? obj.description : "",
        };
      }
      return { name: "", description: "" };
    })
    .filter((s) => s.name.trim().length > 0);
}

/** Flat list of service names — for prompts/UI that only need the label. */
export function serviceNames(raw: unknown): string[] {
  return normalizeServices(raw).map((s) => s.name);
}

/** "Name — description" lines — for prompts that benefit from the richer detail. */
export function serviceLines(raw: unknown): string[] {
  return normalizeServices(raw).map((s) =>
    s.description ? `${s.name} — ${s.description}` : s.name
  );
}

/** Mirrors `business_profiles` + handle from `profiles` — used by the website generation pipeline. */
export interface BusinessProfile {
  id: string;
  user_id: string;
  /** From `profiles.handle` — required to upsert `websites.handle`. */
  handle: string;
  business_name: string;
  industry: string;
  business_type: string;
  services: ServiceEntry[];
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
  /** One-sentence differentiator captured in onboarding Step 3. */
  pitch_line?: string | null;
  /** 'leads' | 'sales' | 'bookings' | 'credibility' */
  primary_goal?: string | null;
  /** Which of two sample sentences the owner picked — tone signal. */
  tone_sample_choice?: string | null;
  social_handle?: string | null;
  logo_url?: string | null;
  reference_url?: string | null;
  /**
   * Owner's first name, captured in onboarding Step 10 ("What should we
   * call you?") and persisted to profiles.full_name — NOT stored on
   * business_profiles. Callers building a BusinessProfile from a raw
   * business_profiles row must separately fetch profiles.full_name and
   * pass it in here; it will never appear on the business_profiles row
   * itself. Used to fill the {{first_name}} placeholder that 18 v2
   * templates (luxury-aspirational + trust-professional archetypes)
   * declare for founder-personalized copy — see generation-pipeline.ts
   * buildFillPrompt(). Without this, Gemini has no real signal for
   * {{first_name}} and invents a plausible-sounding name instead.
   */
  first_name?: string | null;
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