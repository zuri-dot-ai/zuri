import type { DesignArchetype } from "@/lib/website/archetypes";
import type { mapBrandForCalendar } from "./api-helpers";

// The content pipeline never receives a raw BusinessProfile — every call
// site maps the DB row through `mapBrandForCalendar()` first (flat
// `services: string[]`, no handle/pitch_line/etc.), so type against that
// shape directly rather than the richer website-generation `BusinessProfile`.
export type ContentBrand = ReturnType<typeof mapBrandForCalendar>;

export interface GenerationInput {
  userId: string;
  calendarSlotId?: string;
  platform: string;
  formatType: string;
  topic: string;
  hook: string;
  brief: string;
  brand: ContentBrand;
  archetype: DesignArchetype;
}

export interface BlogSection {
  heading: string;
  content: string;
  subsections?: { heading: string; content: string }[];
}

export interface BlogContent {
  title: string;
  meta_description: string;
  introduction: string;
  sections: BlogSection[];
  conclusion: string;
  cta: { text: string; button_label: string };
  suggested_tags: string[];
  reading_time_minutes: number;
  word_count: number;
}

export type NewsletterSectionType =
  | "hero"
  | "main_content"
  | "featured_item"
  | "tips_list"
  | "testimonial_highlight"
  | "event_announcement"
  | "closing";

export interface NewsletterSection {
  type: NewsletterSectionType;
  headline?: string;
  subheadline?: string;
  content?: string;
  items?: string[];
  cta_text?: string;
  cta_url?: string;
  image_suggestion?: string;
}

export interface NewsletterContent {
  subject: string;
  preheader: string;
  sections: NewsletterSection[];
  footer_tagline: string;
  estimated_read_time: string;
}

export interface ScriptBeat {
  time_seconds: number;
  spoken_text: string;
  visual_direction: string;
  text_overlay?: string;
}

export interface VideoScript {
  hook_line: string;
  hook_visual: string;
  body_beats: ScriptBeat[];
  cta: string;
  cta_visual: string;
  thumbnail_prompt: string;
  total_duration_seconds: number;
  video_style: string;
  caption_for_post: string;
  hashtags: string[];
  status: "script_ready";
  thumbnail_url?: string;
}

export interface GenerationOutput {
  id: string;
  platform: string;
  formatType: string;
  caption?: string;
  hashtags?: string[];
  imageUrl?: string;
  imagePromptUsed?: string;
  carouselImageUrls?: string[];
  blogContent?: BlogContent;
  newsletterContent?: NewsletterContent;
  videoScript?: VideoScript;
  status: "ready" | "partial" | "failed";
  warnings: string[];
}

export interface GeneratedContentRow {
  id: string;
  user_id: string;
  calendar_slot_id: string | null;
  platform: string;
  format_type: string;
  caption: string | null;
  hashtags: string[];
  image_url: string | null;
  image_prompt_used: string | null;
  carousel_image_urls: string[];
  blog_content: BlogContent | null;
  newsletter_content: NewsletterContent | null;
  video_script: VideoScript | null;
  thumbnail_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}
