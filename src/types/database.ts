// ════════════════════════════════════════════════════════
//  ZURI — Database Types (row shapes + re-exports from website.ts)
//  Website/template types: docs/02_WEBSITE_BUILDER.md §3, §11
// ════════════════════════════════════════════════════════

import type { AgencyBrief, ServiceEntry } from "./brand";

export type { ServiceEntry } from "./brand";
export { normalizeServices, serviceNames, serviceLines } from "./brand";

export type {
  ActiveTheme,
  CategoryImageRow,
  ColorTheme,
  DesignArchetype,
  ResolvedImage,
  TemplateMetadata,
  TemplateRow,
  WebsiteImageRow,
  WebsiteRow,
  WebsiteStatus,
} from "./website";
export type { AgencyBrief } from "./brand";

/** Canonical plan IDs — free | pro | growth | premium */
export type SubscriptionPlan = "free" | "pro" | "growth" | "premium";
export type SubscriptionStatus =
  | "inactive" | "active" | "past_due" | "cancelled" | "trialing" | "grace_period" | "expired";
export type OnboardingMethod = "voice" | "typed" | "form";
export type WebsiteType =
  | "portfolio" | "business" | "ecommerce" | "restaurant" | "salon_spa"
  | "consultant" | "creative" | "realestate" | "fitness" | "event"
  | "nonprofit" | "professional_services";
export type Platform =
  | "instagram" | "linkedin" | "facebook" | "tiktok" | "email"
  | "twitter" | "whatsapp" | "x";
export type PostType =
  | "educational" | "promotional" | "behind_scenes" | "story"
  | "testimonial" | "engagement";
export type ContentStatus =
  | "draft" | "approved" | "generated" | "posted" | "skipped";
export type ContentFormatType =
  | "static_image" | "carousel" | "reel" | "story" | "text_post"
  | "article" | "thread" | "poll" | "short_video" | "video"
  | "blog_post" | "newsletter";

export type {
  BlogContent,
  GeneratedContentRow,
  NewsletterContent,
  VideoScript,
} from "@/lib/content/types";

export type TaskType = "website" | "content" | "engagement" | "setup";
export type MatchStatus =
  | "pending" | "contacted" | "hired" | "completed" | "declined";

/** Legacy v1 motion tokens (still used by motion helpers / old block comps) */
export type MotionStyle = "slow_elegant" | "crisp_modern" | "bold_energetic";

/** Identity row from `profiles` (not legacy `users`) */
export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use ProfileRow — kept as alias for gradual migration */
export type UserRow = ProfileRow;

/** Settings/billing view model: profile + active subscription */
export interface AccountView {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
}

export interface BusinessProfileRow {
  id: string;
  user_id: string;
  business_name: string | null;
  industry: string | null;
  services: ServiceEntry[];
  target_audience: string | null;
  brand_tone: string | null;
  unique_value: string | null;
  location: string | null;
  tagline: string | null;
  primary_color: string;
  logo_url: string | null;
  onboarding_transcript: string | null;
  onboarding_method: OnboardingMethod | null;
  pitch_line: string | null;
  primary_goal: string | null;
  tone_sample_choice: string | null;
  social_handle: string | null;
  reference_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrendSource {
  topic: string;
  angle: string;
  fetched_at: string;
}

export interface ContentCalendarRow {
  id: string;
  user_id: string;
  pillar_id: string | null;
  platform: string;
  scheduled_date: string;
  scheduled_time: string | null;
  format_type: ContentFormatType | string;
  topic: string;
  hook: string | null;
  brief: string | null;
  status: ContentStatus;
  content_id: string | null;
  is_cultural_moment: boolean;
  cultural_moment_name: string | null;
  coming_soon: boolean;
  is_series: boolean;
  series_title: string | null;
  series_part: number | null;
  series_total: number | null;
  repurposed_from: string | null;
  needs_review?: boolean;
  trend_source?: TrendSource | null;
  generation_source?: "ai" | "fallback";
  created_at: string;
  updated_at?: string;
}

export interface ContentRatingRow {
  id: string;
  user_id: string;
  generated_content_id: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface BrandVoiceExampleRow {
  id: string;
  user_id: string;
  text: string;
  source: "edited" | "rated" | "manual" | string;
  platform: string | null;
  created_at: string;
}

export interface ContentPillarRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ActionPlanTaskRow {
  id: string;
  user_id: string;
  day_number: number;
  task_title: string;
  task_description: string | null;
  why_this_matters: string | null;
  task_type: TaskType;
  ai_asset: string | null;
  estimated_minutes: number;
  platform: Platform | null;
  is_completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  created_at: string;
}

export interface UserProgressRow {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_tasks_completed: number;
  total_content_created: number;
  last_active_date: string | null;
  week_completion_rate: number;
  badges_earned: string[];
  updated_at: string;
}

export interface AgencyRow {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  specialties: string[];
  location: string | null;
  price_range: string | null;
  response_time_hours: number;
  rating: number;
  review_count: number;
  portfolio_url: string | null;
  contact_email: string | null;
  is_verified: boolean;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AgencyMatchRequestRow {
  id: string;
  user_id: string;
  agency_id: string;
  brief_json: AgencyBrief | null;
  status: MatchStatus;
  created_at: string;
}

export interface PlatformConnectionRow {
  id: string;
  user_id: string;
  platform: Platform;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  account_type: string | null;
  account_name: string | null;
  created_at: string;
}

// Return shape of the complete_task() RPC
export interface CompleteTaskResult {
  status: "completed" | "already_completed";
  current_streak?: number;
  longest_streak?: number;
  total_completed?: number;
  week_rate?: number;
  new_badges?: string[];
}

