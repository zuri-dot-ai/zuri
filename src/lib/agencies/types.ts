// docs/07_AGENCY_MARKETPLACE.md §2 — agency directory data model.

export interface Agency {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  tagline: string;
  description: string;
  location_city: string;
  services: AgencyService[];
  price_range: "budget" | "mid" | "premium";
  team_size: "solo" | "small" | "medium" | "large";
  portfolio_items: PortfolioItem[];
  contact_email: string;
  contact_whatsapp: string | null;
  response_time: "under_24h" | "1_2_days" | "3_5_days";
  is_featured: boolean;
  is_verified: boolean;
  is_zuri_certified: boolean;
  is_active: boolean;
  inquiries_count: number;
  created_at: string;
}

export type AgencyService =
  | "social_media_management"
  | "content_creation"
  | "photography_videography"
  | "paid_advertising"
  | "branding"
  | "digital_pr"
  | "email_marketing"
  | "seo"
  | "website_design"
  | "graphic_design"
  | "influencer_marketing"
  | "copywriting";

export interface PortfolioItem {
  title: string;
  description: string;
  url: string;
  image_url: string | null;
}

export const AGENCY_SERVICE_LABELS: Record<AgencyService, string> = {
  social_media_management: "Social Media Management",
  content_creation: "Content Creation",
  photography_videography: "Photography & Videography",
  paid_advertising: "Paid Advertising",
  branding: "Branding & Identity",
  digital_pr: "Digital PR",
  email_marketing: "Email Marketing",
  seo: "SEO",
  website_design: "Website Design",
  graphic_design: "Graphic Design",
  influencer_marketing: "Influencer Marketing",
  copywriting: "Copywriting",
};

export const PRICE_RANGE_LABELS: Record<string, string> = {
  budget: "₦ Budget-friendly",
  mid: "₦₦ Mid-range",
  premium: "₦₦₦ Premium",
};

export const RESPONSE_TIME_LABELS: Record<string, string> = {
  under_24h: "Responds within 24 hours",
  "1_2_days": "Responds in 1–2 days",
  "3_5_days": "Responds in 3–5 days",
};

export const TEAM_SIZE_LABELS: Record<string, string> = {
  solo: "Solo / Freelancer",
  small: "Small team (2–10)",
  medium: "Medium team (11–50)",
  large: "Large agency (50+)",
};

export interface AgencyInquiry {
  id: string;
  agency_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_business_name: string;
  user_industry: string | null;
  user_location: string | null;
  service_needed: string | null;
  message: string;
  budget: string | null;
  status: "sent" | "responded" | "not_responded" | "hired";
  created_at: string;
  updated_at: string;
}

export interface AgencyApplication {
  id: string;
  agency_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  location_city: string;
  services: AgencyService[];
  team_size: string | null;
  price_range: string | null;
  portfolio_urls: string[];
  description: string;
  referral_source: string | null;
  status: "pending" | "approved" | "rejected";
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}
