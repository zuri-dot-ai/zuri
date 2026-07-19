export const BRAND = {
  name: "Zuri",
  /** Short headline — matches marketing hero */
  tagline: "The operating system for modern businesses.",
  /** Supporting sentence under the headline */
  description:
    "Launch your business online with Zuri. Instantly create a premium website, unlock a personalized 90-day content plan, and accelerate growth with AI.",
  colors: {
    background: "#0A0A0B",
    surface: "#131315",
    border: "rgba(255,255,255,0.08)",
    foreground: "#F5F5F4",
    muted: "#A1A1AA",
    gold: "#C9A227",
    goldHover: "#D4B03A",
    success: "#3D9970",
    error: "#C0392B",
  },
} as const;

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface PricingPlan {
  id: "pro" | "growth" | "premium";
  name: string;
  ngnMonthly: number;
  usdMonthly: number;
  ngnAnnual: number;
  usdAnnual: number;
  highlight: boolean;
  description: string;
  features: PlanFeature[];
}

export const PRICING: PricingPlan[] = [
  {
    id: "pro",
    name: "Pro",
    ngnMonthly: 23000,
    usdMonthly: 15,
    ngnAnnual: 230000,
    usdAnnual: 150,
    highlight: false,
    description: "Publish your site and run a consistent content cadence.",
    features: [
      { text: "AI-generated premium website", included: true },
      { text: "Publish to your Zuri subdomain", included: true },
      { text: "90-day content action plan", included: true },
      { text: "Weekly AI content drafts", included: true },
      { text: "Progress tracker & streaks", included: true },
      { text: "Agency marketplace access", included: false },
      { text: "Custom domain", included: false },
    ],
  },
  {
    id: "growth",
    name: "Growth",
    ngnMonthly: 51000,
    usdMonthly: 33,
    ngnAnnual: 510000,
    usdAnnual: 330,
    highlight: true,
    description: "For owners ready to scale with daily content and partners.",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Daily AI content drafts", included: true },
      { text: "Custom domain", included: true },
      { text: "Agency marketplace access", included: true },
      { text: "Deeper analytics", included: true },
      { text: "Priority support", included: true },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    ngnMonthly: 99000,
    usdMonthly: 65,
    ngnAnnual: 990000,
    usdAnnual: 650,
    highlight: false,
    description: "Full stack — advanced analytics and unlimited regenerations.",
    features: [
      { text: "Everything in Growth", included: true },
      { text: "Unlimited regenerations", included: true },
      { text: "Advanced analytics retention", included: true },
      { text: "Priority generation queue", included: true },
    ],
  },
];

export const EARLY_ADOPTER = {
  ngnMonthly: 25000,
  maxCustomers: 10,
  note: "Locked for life — first 10 customers only.",
} as const;

export const FREE_LIMITS = {
  websitePreviewOnly: true,
  contentVisibleDays: 3,
  planVisibleDays: 7,
} as const;

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const BADGES: Record<string, Badge> = {
  first_post: {
    id: "first_post",
    label: "First Post",
    emoji: "🏅",
    description: "Completed your very first task.",
  },
  streak_7: {
    id: "streak_7",
    label: "7-Day Streak",
    emoji: "🔥",
    description: "Seven days in a row.",
  },
  streak_30: {
    id: "streak_30",
    label: "30 Days Strong",
    emoji: "💪",
    description: "A full month of consistency.",
  },
  content_30: {
    id: "content_30",
    label: "Content Machine",
    emoji: "✨",
    description: "Completed 30 content tasks.",
  },
  graduate_90: {
    id: "graduate_90",
    label: "90-Day Graduate",
    emoji: "🏆",
    description: "You finished the full 90-day journey.",
  },
};

export const WEBSITE_TYPES = [
  { id: "professional_services", label: "Professional Services", emoji: "💼" },
  { id: "business", label: "Business", emoji: "🏢" },
  { id: "portfolio", label: "Portfolio", emoji: "🎨" },
  { id: "ecommerce", label: "Online Store", emoji: "🛍️" },
  { id: "restaurant", label: "Restaurant / Food", emoji: "🍽️" },
  { id: "salon_spa", label: "Salon / Spa", emoji: "💇" },
  { id: "consultant", label: "Consultant", emoji: "📊" },
  { id: "creative", label: "Creative / Studio", emoji: "📸" },
  { id: "realestate", label: "Real Estate", emoji: "🏠" },
  { id: "fitness", label: "Fitness / Wellness", emoji: "🏋️" },
  { id: "event", label: "Events", emoji: "🎉" },
  { id: "nonprofit", label: "Nonprofit", emoji: "🤝" },
] as const;

export const MOTION_STYLES = {
  slow_elegant: {
    label: "Slow & Elegant",
    duration: 0.8,
    ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    bestFor: ["luxury", "portfolio", "consultant"],
  },
  crisp_modern: {
    label: "Crisp & Modern",
    duration: 0.4,
    ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
    bestFor: ["tech", "saas", "professional_services"],
  },
  bold_energetic: {
    label: "Bold & Energetic",
    duration: 0.3,
    ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
    bestFor: ["creative", "restaurant", "fitness"],
  },
} as const;

export const PLATFORMS = [
  { id: "instagram", label: "Instagram", emoji: "📷" },
  { id: "linkedin", label: "LinkedIn", emoji: "💼" },
  { id: "facebook", label: "Facebook", emoji: "👥" },
  { id: "tiktok", label: "TikTok", emoji: "🎵" },
  { id: "email", label: "Email", emoji: "✉️" },
] as const;

export const APP_NAV = [
  { href: "/dashboard", label: "Home", icon: "Home" },
  { href: "/website", label: "Website", icon: "Globe" },
  { href: "/content", label: "Content", icon: "PenLine" },
  { href: "/plan", label: "Plan", icon: "CalendarCheck" },
  { href: "/agencies", label: "Agencies", icon: "Users" },
] as const;