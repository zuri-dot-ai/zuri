/**
 * Onboarding V2 (docs/01_ONBOARDING_V2.md) — anonymous-first, 12
 * user-navigable steps + a 13th generation step. Supersedes the v3
 * auth-gated, 7-step flow.
 */
export const ONBOARDING_STORAGE_KEY = "zuri_onboarding_v2";

export const ONBOARDING_TOTAL_STEPS = 11;

export const ONBOARDING_STEP_LABELS: Record<number, string> = {
  1: "What you do",
  2: "What you offer",
  3: "Photos",
  4: "Your customers",
  5: "Where they are",
  6: "Brand feel",
  7: "Business name",
  8: "Web address",
  9: "Where you show up",
  10: "Your name",
  11: "Create account",
};

export interface ServiceEntry {
  name: string;
  description: string;
}

export interface UploadedImageRef {
  slotType: string;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  pairIndex?: number;
}

export interface OnboardingState {
  step: number;
  /** Mirrors the anonymous session cookie value (docs/01_ONBOARDING_V2.md §2.2). */
  sessionToken: string;

  // Step 1 — Business category
  businessType: string;
  /** Pre-resolved the moment Step 1 is answered — category always wins on archetype. */
  resolvedArchetype: string;

  // Step 2 — Services (structured, name + description)
  services: ServiceEntry[];

  // Step 3 — Conditional photo upload
  uploadedImages: UploadedImageRef[];
  photoStepSkipped: boolean;

  // Step 4-5 — Audience + location
  audienceTypes: string[];
  location: string;
  locationCity?: string;

  // Step 6 — Brand vibe
  brandVibe: string;

  // Step 7-8 — Business name + handle
  businessName: string;
  handle: string;

  // Step 9 — Platforms
  platforms: string[];

  // Step 10 — Your name (last question, personalizes the signup gateway)
  firstName: string;

  startedAt: string;
}

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  step: 1,
  sessionToken: "",
  businessType: "",
  resolvedArchetype: "",
  services: [],
  uploadedImages: [],
  photoStepSkipped: false,
  audienceTypes: [],
  location: "",
  locationCity: undefined,
  brandVibe: "",
  businessName: "",
  handle: "",
  platforms: [],
  firstName: "",
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

/** Step 1 — Business category cards (docs/01_ONBOARDING_V2.md §4 Step 1). */
export const BUSINESS_CATEGORIES: Array<{
  id: string;
  label: string;
  icon: string;
}> = [
  { id: "food-hospitality", label: "Food & Hospitality", icon: "UtensilsCrossed" },
  { id: "beauty-wellness", label: "Beauty & Wellness", icon: "Scissors" },
  { id: "professional-services", label: "Professional Services", icon: "Briefcase" },
  { id: "creative-portfolio", label: "Creative & Portfolio", icon: "Camera" },
  { id: "retail-fashion", label: "Retail & Fashion", icon: "ShoppingBag" },
  { id: "technology", label: "Technology", icon: "Zap" },
  { id: "health-medical", label: "Health & Medical", icon: "Stethoscope" },
  { id: "events-booking", label: "Events & Booking", icon: "Calendar" },
  { id: "other", label: "Other", icon: "MoreHorizontal" },
];

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

/** Step 2 — tappable name suggestions, keyed by Step 1's business category. */
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
