/** v3 = 7 data steps + building (step 8). Old key abandoned for clean remaps. */
export const ONBOARDING_STORAGE_KEY = "zuri_onboarding_v3";

export const ONBOARDING_TOTAL_STEPS = 7;

export const ONBOARDING_STEP_LABELS: Record<number, string> = {
  1: "Name",
  2: "Business identity",
  3: "Positioning",
  4: "Offerings & audience",
  5: "Brand feel",
  6: "Assets & reference",
  7: "Where you show up",
};

export interface OnboardingState {
  step: number;
  firstName: string;
  businessName: string;
  handle: string;
  businessType: string;
  pitchLine: string;
  primaryGoal: string;
  services: string[];
  audienceTypes: string[];
  location: string;
  locationCity?: string;
  brandVibe: string;
  toneSampleChoice: string;
  logoUrl: string;
  socialHandle: string;
  referenceUrl: string;
  platforms: string[];
  startedAt: string;
}

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  step: 1,
  firstName: "",
  businessName: "",
  handle: "",
  businessType: "",
  pitchLine: "",
  primaryGoal: "",
  services: [],
  audienceTypes: [],
  location: "",
  locationCity: undefined,
  brandVibe: "",
  toneSampleChoice: "",
  logoUrl: "",
  socialHandle: "",
  referenceUrl: "",
  platforms: [],
  startedAt: new Date().toISOString(),
};

export const VALID_PRIMARY_GOALS = [
  "leads",
  "sales",
  "bookings",
  "credibility",
] as const;

export const PRIMARY_GOALS: Array<{
  id: (typeof VALID_PRIMARY_GOALS)[number];
  label: string;
  descriptor: string;
}> = [
  { id: "leads", label: "Get leads", descriptor: "Inquiries, calls, DMs" },
  { id: "sales", label: "Sell products", descriptor: "Online or in-store purchases" },
  { id: "bookings", label: "Book appointments", descriptor: "Fill your calendar" },
  { id: "credibility", label: "Build credibility", descriptor: "Look established and trustworthy" },
];

/** Two contrasting sample sentences per category, used as a tone signal. */
export const TONE_SAMPLE_PAIRS: Record<string, [string, string]> = {
  "food-hospitality": [
    "Fresh food, made right, every time.",
    "We're obsessed with every bite you take.",
  ],
  "beauty-wellness": [
    "Look good. Feel better.",
    "We're obsessed with helping you feel like your best self.",
  ],
  "professional-services": [
    "We deliver results.",
    "We're obsessed with getting you results.",
  ],
  "creative-portfolio": [
    "Bold work. Clear vision.",
    "We're obsessed with telling your story right.",
  ],
  "retail-fashion": [
    "Style that fits you.",
    "We're obsessed with helping you look your best.",
  ],
  technology: [
    "We build what works.",
    "We're obsessed with solving your hardest problems.",
  ],
  "health-medical": [
    "Care you can count on.",
    "We're obsessed with your wellbeing.",
  ],
  "events-booking": [
    "Every detail, handled.",
    "We're obsessed with making your event unforgettable.",
  ],
  default: [
    "We deliver results.",
    "We're obsessed with getting you results.",
  ],
};

export function getToneSamplePair(businessType: string): [string, string] {
  return TONE_SAMPLE_PAIRS[businessType] ?? TONE_SAMPLE_PAIRS.default;
}

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
