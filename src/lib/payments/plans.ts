// Single source of truth for all plan limits. Used by feature gating, UI, and API routes.
//
// CHANGED (2026-08): website_regenerations caps updated per product decision —
// pro 1→2, growth stays 4, premium unlimited(null)→7. Full site regeneration
// is a real Gemini Pro cost per run, so even the top plan gets a cap now
// rather than true unlimited.

export type PlanId = "free" | "pro" | "growth" | "premium";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price_monthly: number; // NGN, full units (not kobo)
  price_annual: number; // NGN, full annual amount
  limits: PlanLimits;
}

export interface PlanLimits {
  websites: number;
  can_publish: boolean;
  custom_domain: boolean;
  max_pages_per_site: number | null;
  website_regenerations: number | null; // null = unlimited
  priority_queue: boolean;
  remove_branding: boolean;
  social_platforms: number | null;
  calendar_posts_per_month: number | null;
  images_per_month: number;
  blog_posts_per_month: number | null;
  newsletters_per_month: number | null;
  analytics_enabled: boolean;
  analytics_retention_days: number | null;
  meta_analytics: boolean;
  search_console: boolean;
  email_analytics: boolean;
  agency_listed: boolean;
  agency_featured: boolean;
  can_contact_agencies: boolean;
  storage_mb: number;
  seats: number;
  api_access: boolean;
  video_generation: boolean;
  content_ideas_per_month: number | null;
  supported_branches: number[];
}

export const PLAN_CONFIG: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    price_monthly: 0,
    price_annual: 0,
    limits: {
      websites: 1,
      can_publish: false,
      custom_domain: false,
      max_pages_per_site: 5,
      website_regenerations: 0,
      priority_queue: false,
      remove_branding: false,
      social_platforms: 0,
      calendar_posts_per_month: 0,
      images_per_month: 0,
      blog_posts_per_month: 0,
      newsletters_per_month: 0,
      analytics_enabled: false,
      analytics_retention_days: null,
      meta_analytics: false,
      search_console: false,
      email_analytics: false,
      agency_listed: false,
      agency_featured: false,
      can_contact_agencies: false,
      storage_mb: 50,
      seats: 1,
      api_access: false,
      video_generation: false,
      content_ideas_per_month: 5,
      supported_branches: [],
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    price_monthly: 23000,
    price_annual: 230000,
    limits: {
      websites: 1,
      can_publish: true,
      custom_domain: false,
      max_pages_per_site: 5,
      website_regenerations: 2, // was 1
      priority_queue: false,
      remove_branding: false,
      social_platforms: 4,
      calendar_posts_per_month: 30,
      images_per_month: 50,
      blog_posts_per_month: 6,
      newsletters_per_month: 4,
      analytics_enabled: true,
      analytics_retention_days: 30,
      meta_analytics: false,
      search_console: false,
      email_analytics: false,
      agency_listed: false,
      agency_featured: false,
      can_contact_agencies: false,
      storage_mb: 500,
      seats: 1,
      api_access: false,
      video_generation: false,
      content_ideas_per_month: null,
      supported_branches: [1, 3, 5, 8],
    },
  },
  growth: {
    id: "growth",
    name: "Growth",
    price_monthly: 51000,
    price_annual: 510000,
    limits: {
      websites: 1,
      can_publish: true,
      custom_domain: true,
      max_pages_per_site: null,
      website_regenerations: 4, // unchanged
      priority_queue: false,
      remove_branding: true,
      social_platforms: 4,
      calendar_posts_per_month: 30,
      images_per_month: 80,
      blog_posts_per_month: 20,
      newsletters_per_month: 20,
      analytics_enabled: true,
      analytics_retention_days: 90,
      meta_analytics: true,
      search_console: true,
      email_analytics: false,
      agency_listed: true,
      agency_featured: false,
      can_contact_agencies: true,
      storage_mb: 2048,
      seats: 1,
      api_access: false,
      video_generation: false,
      content_ideas_per_month: null,
      supported_branches: [1, 3, 5, 6, 8],
    },
  },
  premium: {
    id: "premium",
    name: "Premium",
    price_monthly: 73000,
    price_annual: 730000,
    limits: {
      websites: 3,
      can_publish: true,
      custom_domain: true,
      max_pages_per_site: null,
      website_regenerations: 7, // was null (unlimited)
      priority_queue: true,
      remove_branding: true,
      social_platforms: null,
      calendar_posts_per_month: null,
      images_per_month: 200,
      blog_posts_per_month: null,
      newsletters_per_month: null,
      analytics_enabled: true,
      analytics_retention_days: 365,
      meta_analytics: true,
      search_console: true,
      email_analytics: true,
      agency_listed: true,
      agency_featured: true,
      can_contact_agencies: true,
      storage_mb: 10240,
      seats: 3,
      api_access: true,
      video_generation: true,
      content_ideas_per_month: null,
      supported_branches: [1, 3, 5, 6, 8],
    },
  },
};

export const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  pro: 1,
  growth: 2,
  premium: 3,
};

export const PAID_PLAN_IDS: PlanId[] = ["pro", "growth", "premium"];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLAN_CONFIG;
}
