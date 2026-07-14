// ════════════════════════════════════════════════════════
//  ZURI — Database Types (mirrors supabase/schema.sql)
// ════════════════════════════════════════════════════════

import type { WebsiteComposition } from "./website";
import type { AgencyBrief } from "./brand";

export type { WebsiteComposition } from "./website";
export type { AgencyBrief } from "./brand";

export type SubscriptionPlan = "free" | "starter" | "growth";
export type SubscriptionStatus =
  | "inactive" | "active" | "past_due" | "cancelled" | "trialing";
export type OnboardingMethod = "voice" | "typed" | "form";
export type WebsiteType =
  | "portfolio" | "business" | "ecommerce" | "restaurant" | "salon_spa"
  | "consultant" | "creative" | "realestate" | "fitness" | "event"
  | "nonprofit" | "professional_services";
export type MotionStyle = "slow_elegant" | "crisp_modern" | "bold_energetic";
export type Platform =
  | "instagram" | "linkedin" | "facebook" | "tiktok" | "email"
  | "twitter" | "whatsapp";
export type PostType =
  | "educational" | "promotional" | "behind_scenes" | "story"
  | "testimonial" | "engagement";
export type ContentStatus = "briefed" | "drafted" | "approved" | "posted";
export type TaskType = "website" | "content" | "engagement" | "setup";
export type MatchStatus =
  | "pending" | "contacted" | "hired" | "completed" | "declined";

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  flutterwave_customer_id: string | null;
  is_early_adopter: boolean;
  has_onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfileRow {
  id: string;
  user_id: string;
  business_name: string | null;
  industry: string | null;
  services: string[];
  target_audience: string | null;
  tone: string | null;
  unique_value: string | null;
  location: string | null;
  tagline: string | null;
  primary_color: string;
  logo_url: string | null;
  onboarding_transcript: string | null;
  onboarding_method: OnboardingMethod | null;
  created_at: string;
  updated_at: string;
}

export interface WebsiteRow {
  id: string;
  user_id: string;
  business_profile_id: string | null;
  website_type: WebsiteType | null;
  style_preference: string | null;
  motion_style: MotionStyle;
  composition_json: WebsiteComposition | null;
  published_slug: string | null;
  is_published: boolean;
  last_edited: string;
  created_at: string;
}

export interface ContentCalendarRow {
  id: string;
  user_id: string;
  slot_date: string;
  platform: Platform;
  post_type: PostType | null;
  theme: string | null;
  brief: string | null;
  ai_draft: string | null;
  hashtags: string[];
  status: ContentStatus;
  canva_url: string | null;
  video_url: string | null;
  created_at: string;
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

