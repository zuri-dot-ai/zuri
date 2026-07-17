export const ONBOARDING_STORAGE_KEY = "zuri_onboarding";

export interface OnboardingState {
  step: number;
  firstName: string;
  businessName: string;
  handle: string;
  businessType: string;
  services: string[];
  audienceTypes: string[];
  location: string;
  locationCity?: string;
  brandVibe: string;
  platforms: string[];
  startedAt: string;
}

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  step: 1,
  firstName: "",
  businessName: "",
  handle: "",
  businessType: "",
  services: [],
  audienceTypes: [],
  location: "",
  locationCity: undefined,
  brandVibe: "",
  platforms: [],
  startedAt: new Date().toISOString(),
};

export const VALID_BUSINESS_TYPES = [
  "food-hospitality",
  "beauty-wellness",
  "professional-services",
  "creative-portfolio",
  "retail-fashion",
  "technology",
  "health-medical",
  "events-booking",
  "other",
  // Unsupported branches (§1) — show CustomSiteCTA, do not generate
  "ecommerce",
  "blog-publication",
  "nonprofit-community",
] as const;

/** Branch 2 / 4 / 7 — redirect to custom build team, never AI-generate. */
export const UNSUPPORTED_BUSINESS_TYPES = [
  "ecommerce",
  "blog-publication",
  "nonprofit-community",
] as const;

export type UnsupportedBusinessType =
  (typeof UNSUPPORTED_BUSINESS_TYPES)[number];

export const UNSUPPORTED_FEATURE_LABELS: Record<
  UnsupportedBusinessType,
  string
> = {
  ecommerce: "E-commerce",
  "blog-publication": "Blog / Content",
  "nonprofit-community": "Nonprofit / Community",
};

export function isUnsupportedBusinessType(
  value: string
): value is UnsupportedBusinessType {
  return (UNSUPPORTED_BUSINESS_TYPES as readonly string[]).includes(value);
}

export const VALID_LOCATIONS = [
  "lagos",
  "abuja",
  "port-harcourt",
  "ibadan",
  "kano",
  "other-city",
  "nationwide",
  "international",
] as const;

export const VALID_PLATFORMS = [
  "instagram",
  "facebook",
  "linkedin",
  "x",
  "tiktok",
] as const;

export const VALID_BRAND_VIBES = [
  "bold-vibrant",
  "clean-modern",
  "warm-friendly",
  "elegant-luxurious",
  "professional-trustworthy",
  "creative-artistic",
] as const;

export const SERVICE_SUGGESTIONS: Record<string, string[]> = {
  "food-hospitality": [
    "Dine-in",
    "Takeaway",
    "Catering",
    "Event catering",
    "Delivery",
    "Private dining",
    "Baking classes",
    "Custom cakes",
  ],
  "beauty-wellness": [
    "Haircuts",
    "Braiding",
    "Makeup",
    "Facials",
    "Manicure",
    "Pedicure",
    "Massage",
    "Personal training",
  ],
  "professional-services": [
    "Consulting",
    "Strategy sessions",
    "Business advisory",
    "Financial planning",
    "Legal advice",
    "Coaching",
    "Auditing",
  ],
  "creative-portfolio": [
    "Photography",
    "Videography",
    "Graphic design",
    "Brand identity",
    "Music production",
    "Illustration",
    "Film production",
  ],
  "retail-fashion": [
    "Ready-to-wear",
    "Custom tailoring",
    "Accessories",
    "Footwear",
    "Streetwear",
    "Corporate wear",
  ],
  technology: [
    "Web development",
    "Mobile apps",
    "UI/UX design",
    "Digital marketing",
    "SEO",
    "SaaS products",
    "IT support",
  ],
  "health-medical": [
    "General consultation",
    "Dental care",
    "Physiotherapy",
    "Pharmacy",
    "Lab tests",
    "Home visits",
  ],
  "events-booking": [
    "Event planning",
    "Venue hire",
    "DJ services",
    "Photography",
    "Decoration",
    "Class bookings",
    "Workshop facilitation",
  ],
  ecommerce: [],
  "blog-publication": [],
  "nonprofit-community": [],
  other: [],
};
