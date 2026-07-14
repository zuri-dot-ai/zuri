// ZURI - Business Archetype System (deterministic lookup, no AI here)
//
// This file is a PURE lookup table. Zero AI calls happen here.
// Resolves a business's industry + services to a design archetype that
// constrains every downstream AI call. This is the single source of truth
// for "what a business of type X is allowed to look like."

import type { BlockId } from "@/types/website";

/** All supported design archetypes. */
export type DesignArchetype =
  | "warm-sensory"         // food, restaurant, bakery, catering
  | "authority-minimal"    // consultant, lawyer, accountant, coach
  | "luxury-aspirational"  // beauty, spa, salon, fashion, jewellery
  | "editorial-bold"       // retail, streetwear, creative agency
  | "clean-modern"         // tech, SaaS, fintech, logistics
  | "portfolio-dramatic"   // photography, videography, music, art
  | "community-vibrant"    // fitness, gym, sports, wellness
  | "trust-professional";  // medical, dental, pharmacy, real estate

/**
 * Full design specification bound to an archetype.
 */
export interface ArchetypeSpec {
  archetype: DesignArchetype;
  hero_variant_pool: string[];
  about_variant: string;
  services_variant: string;
  social_proof_variant: string;
  nav_variant: string;
  footer_variant: string;
  required_blocks: string[];
  forbidden_blocks: string[];
  palette_rules: {
    prefer_warm: boolean;
    accent_intensity: "subtle" | "bold" | "minimal";
  };
  typography_pairing: {
    heading: string;
    body: string;
    heading_weight: number;
    body_weight: number;
  };
  image_style_keywords: string[];
  image_location_keywords: string[];
  motion_style_bias: "slow_elegant" | "crisp_modern" | "bold_energetic";
  copy_tone_modifier: string;
  default_accent: string;
}

const BLOCK_IDS: readonly BlockId[] = [
  "nav_standard", "nav_centered", "nav_minimal",
  "hero_fullscreen", "hero_split", "hero_typographic",
  "hero_gradient", "hero_floating_card", "hero_minimal",
  "about_founder", "about_stats", "about_timeline", "about_mission",
  "services_card_grid", "services_tabs", "services_list_elegant", "pricing_table",
  "testimonials_carousel", "logo_wall", "case_study_spotlight",
  "cta_full_width", "cta_split_visual", "cta_card_centered",
  "contact_form_card", "contact_map_embed", "whatsapp_cta",
  "footer_standard", "footer_minimal", "footer_columns",
];

const BLOCK_ID_SET: Set<string> = new Set(BLOCK_IDS);

export function isBlockId(s: string): s is BlockId {
  return BLOCK_ID_SET.has(s);
}

export function allBlockIds(): readonly BlockId[] {
  return BLOCK_IDS;
}

// ARCHETYPE RECORDS — each block-id is snake_case matching BlockRenderer
export const ARCHETYPES: Record<DesignArchetype, ArchetypeSpec> = {
  "warm-sensory": {
    archetype: "warm-sensory",
    hero_variant_pool: ["hero_fullscreen", "hero_split"],
    about_variant: "about_founder",
    services_variant: "services_card_grid",
    social_proof_variant: "testimonials_carousel",
    nav_variant: "nav_standard",
    footer_variant: "footer_columns",
    required_blocks: ["nav", "hero", "about", "services", "testimonials", "cta", "footer"],
    forbidden_blocks: ["pricing_table", "hero_typographic", "logo_wall"],
    palette_rules: { prefer_warm: true, accent_intensity: "bold" },
    typography_pairing: { heading: "Playfair Display", body: "Lato", heading_weight: 700, body_weight: 400 },
    image_style_keywords: ["golden hour", "warm", "vibrant", "close-up food", "artisan"],
    image_location_keywords: ["Nigerian", "African", "Lagos"],
    motion_style_bias: "bold_energetic",
    copy_tone_modifier: "warm, sensory, appetite-stimulating. Use words that evoke taste, smell, and warmth. Reference Nigerian/West African culinary culture where it fits naturally.",
    default_accent: "#C9A84C",
  },

  "authority-minimal": {
    archetype: "authority-minimal",
    hero_variant_pool: ["hero_typographic", "hero_minimal"],
    about_variant: "about_mission",
    services_variant: "services_list_elegant",
    social_proof_variant: "case_study_spotlight",
    nav_variant: "nav_minimal",
    footer_variant: "footer_minimal",
    required_blocks: ["nav", "hero", "about", "services", "social-proof", "cta", "footer"],
    forbidden_blocks: ["hero_fullscreen", "logo_wall", "pricing_table"],
    palette_rules: { prefer_warm: false, accent_intensity: "subtle" },
    typography_pairing: { heading: "Cormorant Garamond", body: "Montserrat", heading_weight: 600, body_weight: 400 },
    image_style_keywords: ["professional", "minimal", "office", "clean", "monochrome"],
    image_location_keywords: ["Lagos", "Nigeria", "professional African"],
    motion_style_bias: "slow_elegant",
    copy_tone_modifier: "authoritative, precise, results-focused. Use specific outcomes, credentials, numbers. Avoid jargon; lead with the value delivered.",
    default_accent: "#6B7C8D",
  },

  "luxury-aspirational": {
    archetype: "luxury-aspirational",
    hero_variant_pool: ["hero_fullscreen", "hero_floating_card"],
    about_variant: "about_founder",
    services_variant: "services_card_grid",
    social_proof_variant: "testimonials_carousel",
    nav_variant: "nav_centered",
    footer_variant: "footer_columns",
    required_blocks: ["nav", "hero", "about", "services", "testimonials", "cta", "footer"],
    forbidden_blocks: ["pricing_table", "hero_typographic", "about_stats"],
    palette_rules: { prefer_warm: false, accent_intensity: "subtle" },
    typography_pairing: { heading: "Cormorant Garamond", body: "Raleway", heading_weight: 400, body_weight: 300 },
    image_style_keywords: ["luxury", "editorial", "beauty", "aspirational", "elegant"],
    image_location_keywords: ["African beauty", "Nigerian fashion", "Lagos style"],
    motion_style_bias: "slow_elegant",
    copy_tone_modifier: "luxurious, aspirational, exclusive. Evoke transformation, premium experience, and meticulous craft. Sentences can be longer and more poetic.",
    default_accent: "#B8956A",
  },

  "editorial-bold": {
    archetype: "editorial-bold",
    hero_variant_pool: ["hero_split", "hero_fullscreen"],
    about_variant: "about_founder",
    services_variant: "services_card_grid",
    social_proof_variant: "logo_wall",
    nav_variant: "nav_standard",
    footer_variant: "footer_columns",
    required_blocks: ["nav", "hero", "about", "services", "cta", "footer"],
    forbidden_blocks: ["hero_minimal", "services_list_elegant", "pricing_table"],
    palette_rules: { prefer_warm: true, accent_intensity: "bold" },
    typography_pairing: { heading: "Bebas Neue", body: "DM Sans", heading_weight: 400, body_weight: 400 },
    image_style_keywords: ["bold", "vibrant", "urban", "editorial", "fashion"],
    image_location_keywords: ["Lagos street", "African fashion", "Nigerian culture"],
    motion_style_bias: "bold_energetic",
    copy_tone_modifier: "bold, confident, cultural. Reference Nigerian identity and local pride. Short, punchy sentences. Memorable singular statements are welcome.",
    default_accent: "#E63946",
  },

  "clean-modern": {
    archetype: "clean-modern",
    hero_variant_pool: ["hero_gradient", "hero_typographic"],
    about_variant: "about_stats",
    services_variant: "services_card_grid",
    social_proof_variant: "logo_wall",
    nav_variant: "nav_minimal",
    footer_variant: "footer_minimal",
    required_blocks: ["nav", "hero", "about", "services", "cta", "footer"],
    forbidden_blocks: ["hero_fullscreen", "about_founder", "testimonials_carousel"],
    palette_rules: { prefer_warm: false, accent_intensity: "minimal" },
    typography_pairing: { heading: "Inter", body: "Inter", heading_weight: 700, body_weight: 400 },
    image_style_keywords: ["technology", "minimal", "digital", "clean", "modern"],
    image_location_keywords: ["African tech", "Lagos startup", "Nigeria business"],
    motion_style_bias: "crisp_modern",
    copy_tone_modifier: "clear, benefit-driven, technical but accessible. Lead with outcomes, not features. Avoid buzzwords.",
    default_accent: "#3B82F6",
  },

  "portfolio-dramatic": {
    archetype: "portfolio-dramatic",
    hero_variant_pool: ["hero_fullscreen", "hero_split"],
    about_variant: "about_founder",
    services_variant: "services_card_grid",
    social_proof_variant: "case_study_spotlight",
    nav_variant: "nav_minimal",
    footer_variant: "footer_minimal",
    required_blocks: ["nav", "hero", "about", "services", "social-proof", "cta", "footer"],
    forbidden_blocks: ["pricing_table", "hero_gradient", "about_stats"],
    palette_rules: { prefer_warm: false, accent_intensity: "bold" },
    typography_pairing: { heading: "Fraunces", body: "Work Sans", heading_weight: 600, body_weight: 400 },
    image_style_keywords: ["dramatic", "artistic", "high contrast", "creative", "portfolio"],
    image_location_keywords: ["African creative", "Nigerian art", "Lagos photography"],
    motion_style_bias: "slow_elegant",
    copy_tone_modifier: "artistic, evocative, story-driven. Let the work speak; copy is minimal but powerful. Avoid adjectives like 'best' or 'leading'. Show, don't tell.",
    default_accent: "#9B5DE5",
  },

  "community-vibrant": {
    archetype: "community-vibrant",
    hero_variant_pool: ["hero_fullscreen", "hero_split"],
    about_variant: "about_founder",
    services_variant: "services_card_grid",
    social_proof_variant: "testimonials_carousel",
    nav_variant: "nav_standard",
    footer_variant: "footer_columns",
    required_blocks: ["nav", "hero", "about", "services", "testimonials", "cta", "footer"],
    forbidden_blocks: ["hero_typographic", "services_list_elegant", "pricing_table"],
    palette_rules: { prefer_warm: true, accent_intensity: "bold" },
    typography_pairing: { heading: "Nunito", body: "Nunito", heading_weight: 800, body_weight: 400 },
    image_style_keywords: ["energetic", "fitness", "community", "active", "transformation"],
    image_location_keywords: ["African fitness", "Lagos gym", "Nigerian wellness"],
    motion_style_bias: "bold_energetic",
    copy_tone_modifier: "energetic, motivational, inclusive. Use action verbs and community language. Second-person plural ('we', 'together', 'join us') is welcome.",
    default_accent: "#F77F00",
  },

  "trust-professional": {
    archetype: "trust-professional",
    hero_variant_pool: ["hero_split", "hero_typographic"],
    about_variant: "about_stats",
    services_variant: "services_list_elegant",
    social_proof_variant: "testimonials_carousel",
    nav_variant: "nav_standard",
    footer_variant: "footer_columns",
    required_blocks: ["nav", "hero", "about", "services", "testimonials", "cta", "footer"],
    forbidden_blocks: ["hero_fullscreen", "about_mission"],
    palette_rules: { prefer_warm: false, accent_intensity: "subtle" },
    typography_pairing: { heading: "Source Serif 4", body: "Source Sans 3", heading_weight: 600, body_weight: 400 },
    image_style_keywords: ["professional", "trustworthy", "clinical", "clean", "reassuring"],
    image_location_keywords: ["Nigerian medical", "Lagos professional", "African healthcare"],
    motion_style_bias: "crisp_modern",
    copy_tone_modifier: "reassuring, credentialed, clear. Lead with trust signals (years, certifications, outcomes). Avoid superlatives. Disclaimers are appropriate where required.",
    default_accent: "#0F766E",
  },
};

/**
 * Resolve a business to its archetype using keyword matching on the union of
 * businessType, industry, and service list. Returns authority-minimal as
 * a safe default.
 */
export function resolveArchetype(
  businessType: string,
  industry: string,
  services: readonly string[] = []
): DesignArchetype {
  const combined = [businessType, industry, ...services]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/food|restaurant|bakery|cater|cake|chef|kitchen|cuisine/.test(combined))
    return "warm-sensory";
  if (/consult|lawyer|legal|account|finance|coach|advisor|strategy/.test(combined))
    return "authority-minimal";
  if (/beauty|salon|spa|hair|nail|makeup|fashion|luxury|jewel/.test(combined))
    return "luxury-aspirational";
  if (/retail|shop|store|streetwear|clothing|brand|creative agency/.test(combined))
    return "editorial-bold";
  if (/tech|software|app|digital|startup|saas|fintech|logistic/.test(combined))
    return "clean-modern";
  if (/photo|video|music|art|creative|design|film|record/.test(combined))
    return "portfolio-dramatic";
  if (/gym|fitness|sport|wellness|yoga|trainer|health coach/.test(combined))
    return "community-vibrant";
  if (/medical|doctor|dental|pharmacy|clinic|hospital|real estate|property/.test(combined))
    return "trust-professional";

  return "authority-minimal";
}

