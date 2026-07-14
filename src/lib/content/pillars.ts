// ════════════════════════════════════════════════════════
//  ZURI — Content Pillars by Brand Archetype
//  Static pillar definitions used by the seeding routine
//  after onboarding completes.
// ════════════════════════════════════════════════════════

import type { DesignArchetype } from "./cultural-calendar";

export interface PillarDefinition {
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface ContentPillar {
  id?: string;
  user_id?: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_PILLARS: Record<string, PillarDefinition[]> = {
  "warm-sensory": [
    { name: "Product Showcase", description: "Show off what you make or serve", icon: "Star", color: "#E2843A" },
    { name: "Behind the Scenes", description: "Let people see the process", icon: "Camera", color: "#C9A84C" },
    { name: "Customer Love", description: "Share reviews, testimonials, and reactions", icon: "Heart", color: "#D94F4F" },
    { name: "Tips & Recipes", description: "Educate and add value", icon: "Lightbulb", color: "#4FA8D9" },
    { name: "Local Stories", description: "Celebrate the community you serve", icon: "MapPin", color: "#4DA86E" },
  ],
  "authority-minimal": [
    { name: "Expert Insights", description: "Share your professional knowledge", icon: "Brain", color: "#C9A84C" },
    { name: "Client Success", description: "Results you have achieved for clients", icon: "Trophy", color: "#E2843A" },
    { name: "Industry News", description: "Commentary on what is happening in your field", icon: "Newspaper", color: "#4FA8D9" },
    { name: "Behind the Firm", description: "Team, culture, and process", icon: "Building2", color: "#4DA86E" },
    { name: "FAQs & Myth-busting", description: "Answer common questions authoritatively", icon: "HelpCircle", color: "#9B59B6" },
  ],
  "luxury-aspirational": [
    { name: "Service Glamour", description: "Aspirational shots of your work and space", icon: "Sparkles", color: "#C9A84C" },
    { name: "Transformation Stories", description: "Before and after, with permission", icon: "ArrowUpRight", color: "#E2843A" },
    { name: "Behind the Brand", description: "The craftsmanship and care that goes in", icon: "Gem", color: "#9B59B6" },
    { name: "Lifestyle Inspiration", description: "The world your brand belongs to", icon: "Sun", color: "#D94F4F" },
    { name: "Client Features", description: "Celebrate your clients", icon: "Users", color: "#4DA86E" },
  ],
  "editorial-bold": [
    { name: "Product Drops", description: "New arrivals, launches, restocks", icon: "ShoppingBag", color: "#E2843A" },
    { name: "Brand Story", description: "Why this brand exists and what it stands for", icon: "Flame", color: "#D94F4F" },
    { name: "Style Inspiration", description: "Looks, outfits, editorial shots", icon: "Palette", color: "#C9A84C" },
    { name: "Community", description: "Customers, supporters, collabs", icon: "Users", color: "#4DA86E" },
    { name: "Nigerian Culture", description: "Nigerian identity, pride, and culture", icon: "Globe", color: "#4FA8D9" },
  ],
  "clean-modern": [
    { name: "Product Features", description: "What your product or service does", icon: "Zap", color: "#C9A84C" },
    { name: "Tech Tips", description: "Helpful knowledge for your audience", icon: "Lightbulb", color: "#4FA8D9" },
    { name: "Team Stories", description: "The people behind the product", icon: "Users", color: "#4DA86E" },
    { name: "Industry Insights", description: "Trends and perspectives from your field", icon: "BarChart3", color: "#E2843A" },
    { name: "Customer Success", description: "Real outcomes your product delivered", icon: "Trophy", color: "#9B59B6" },
  ],
  "portfolio-dramatic": [
    { name: "Work Showcase", description: "Your best projects and outcomes", icon: "Camera", color: "#C9A84C" },
    { name: "Process", description: "How you think and how you work", icon: "PenLine", color: "#E2843A" },
    { name: "Client Collaboration", description: "Stories from working with clients", icon: "Handshake", color: "#4DA86E" },
    { name: "Creative Inspiration", description: "What influences your work", icon: "Palette", color: "#9B59B6" },
    { name: "Personal Brand", description: "Your story, your voice, your perspective", icon: "User", color: "#D94F4F" },
  ],
  "community-vibrant": [
    { name: "Transformations", description: "Real results from real members", icon: "ArrowUpRight", color: "#E2843A" },
    { name: "Motivation", description: "Energise and inspire your community", icon: "Flame", color: "#D94F4F" },
    { name: "Community Highlights", description: "Celebrate your members and community", icon: "Users", color: "#4DA86E" },
    { name: "Tips & Education", description: "Teach your audience something useful", icon: "Lightbulb", color: "#C9A84C" },
    { name: "Events & Classes", description: "Promote upcoming sessions and events", icon: "CalendarCheck", color: "#4FA8D9" },
  ],
  "trust-professional": [
    { name: "Health & Wellness Tips", description: "Educational content your audience needs", icon: "Heart", color: "#4DA86E" },
    { name: "Patient Education", description: "Explain what you do and why it matters", icon: "BookOpen", color: "#4FA8D9" },
    { name: "Team Profiles", description: "Introduce your qualified team", icon: "Users", color: "#C9A84C" },
    { name: "Community Health", description: "Local health news and initiatives", icon: "Globe", color: "#E2843A" },
    { name: "Services Overview", description: "Explain what you offer and who it is for", icon: "Briefcase", color: "#9B59B6" },
  ],
};

// Brand archetype resolver — derives archetype from business inputs
// Returns one of the 8 archetypes. Default is "authority-minimal".
export function resolveArchetype(args: {
  business_type?: string | null;
  industry?: string | null;
  services?: string[] | null;
  brand_vibe?: string | null;
  business_name?: string | null;
}): DesignArchetype {
  const { business_type, industry, services, brand_vibe, business_name } = args;

  const text = [
    business_type ?? "",
    industry ?? "",
    brand_vibe ?? "",
    (services ?? []).join(" "),
    business_name ?? "",
  ]
    .join(" ")
    .toLowerCase();

  // Portfolio / creative agency / personal brand
  if (
    /(portfolio|studio|creative|designer|photographer|filmmaker|writer|artist|freelance|consultant)/.test(text) &&
    /(portfolio|personal)/.test(text)
  ) {
    return "portfolio-dramatic";
  }

  // Editorial / fashion / streetwear / bold brands
  if (
    /(fashion|streetwear|apparel|wears|jersey|drop|sneaker|outfit|clothing)/.test(text) ||
    brand_vibe === "bold"
  ) {
    return "editorial-bold";
  }

  // Luxury / aspirational / spa / salon / beauty / premium
  if (
    /(spa|salon|beauty|luxury|premium|glamour|cosmetic|fragrance|jewel)/.test(text) ||
    brand_vibe === "luxury"
  ) {
    return "luxury-aspirational";
  }

  // Warm-sensory: restaurants, bakeries, food, art-craft
  if (
    /(restaurant|bakery|food|catering|kitchen|chef|cafe|cuisine|confection|pastry|wedding|craft|artisan)/.test(text)
  ) {
    return "warm-sensory";
  }

  // Community-vibrant: fitness, gym, wellness communities, memberships
  if (
    /(gym|fitness|training|workout|yoga|wellness community|membership|coaching community)/.test(text)
  ) {
    return "community-vibrant";
  }

  // Trust-professional: medical, dental, health, legal, finance
  if (
    /(hospital|clinic|medical|dentist|doctor|health|pharmacy|legal|lawyer|attorney|finance|account|tax|consulting)/.test(text)
  ) {
    return "trust-professional";
  }

  // Clean-modern: tech, SaaS, software, ecommerce
  if (
    /(tech|software|saas|app |digital|ecommerce|shop|store|retail)/.test(text) ||
    brand_vibe === "modern"
  ) {
    return "clean-modern";
  }

  // Default
  return "authority-minimal";
}
