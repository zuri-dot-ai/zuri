// ════════════════════════════════════════════════════════
//  ZURI — Website Composition Types
// ════════════════════════════════════════════════════════

export type BlockId =
  // Navigation (prefix `nav_`)
  | "nav_standard" | "nav_centered" | "nav_minimal"
  // Heroes
  | "hero_fullscreen" | "hero_split" | "hero_typographic"
  | "hero_gradient" | "hero_floating_card" | "hero_minimal"
  // About
  | "about_founder" | "about_stats" | "about_timeline" | "about_mission"
  // Services
  | "services_card_grid" | "services_tabs" | "services_list_elegant" | "pricing_table"
  // Social proof
  | "testimonials_carousel" | "logo_wall" | "case_study_spotlight"
  // CTA
  | "cta_full_width" | "cta_split_visual" | "cta_card_centered"
  // Contact
  | "contact_form_card" | "contact_map_embed" | "whatsapp_cta"
  // Footer (prefix `footer_`)
  | "footer_standard" | "footer_minimal" | "footer_columns";

// ═══ Business archetype (drives pipeline constraints) ═══
export type DesignArchetype =
  | "warm-sensory"
  | "authority-minimal"
  | "luxury-aspirational"
  | "editorial-bold"
  | "clean-modern"
  | "portfolio-dramatic"
  | "community-vibrant"
  | "trust-professional";

export interface CompositionPalette {
  primary: string;
  accent: string;
  bg: string;
  /** Extended palette (v2+); legacy sites may not have these. */
  surface?: string;
  text?: string;
  muted?: string;
}

export interface CompositionTypography {
  heading: string;
  body: string;
  /** Optional weights for richer pairing */
  heading_weight?: number;
  body_weight?: number;
}

export interface ServiceItem {
  name: string;
  description: string;
}

export interface StatItem { value: string; label: string; }
export interface Testimonial { quote: string; author: string; role?: string; }

/** Per-block copy slot — one entry per BlockId used in the composition. */
export interface BlockContent {
  /** H1/headline for this block (hero, section headers, CTA headlines, etc.) */
  headline?: string;
  /** Supporting paragraph or sub-headline */
  subheadline?: string;
  /** Body copy (about paragraph, mission, descriptive paragraph) */
  body?: string;
  /** Primary CTA label (e.g. "Book your appointment") */
  cta_text?: string;
  /** Secondary CTA label (optional) */
  cta_secondary?: string;
  /** Short tagline (used on nav or about) */
  tagline?: string;
  /** Service cards (services blocks) */
  services?: ServiceItem[];
  /** Stat tiles (about_stats) */
  stats?: StatItem[];
  /** Testimonials (blocks that render quotes) */
  testimonials?: Testimonial[];
  /** Contact details for footer / contact blocks */
  contact_email?: string;
  whatsapp_number?: string;
  /** Free-form extras a block may consume (image alt, link hrefs, etc.) */
  [extra: string]: unknown;
}

/**
 * Legacy flat content shape (v1). Kept here so older compositions still render.
 */
export interface CompositionContentFlat {
  hero_headline: string;
  hero_subheadline: string;
  about_paragraph: string;
  services: ServiceItem[];
  cta_text: string;
  stats?: StatItem[];
  testimonials?: Testimonial[];
  contact_email?: string;
  whatsapp_number?: string;
}

/**
 * v2 content: per-block keyed map. The renderer falls back to v1 fields if
 * a block has no entry here.
 */
export interface CompositionContentV2 {
  /** Per-block content, keyed by BlockId e.g. `hero_fullscreen`, `about_founder` */
  blocks?: Partial<Record<BlockId, BlockContent>>;
  /** Convenience flat fields (used by older blocks) */
  hero_headline?: string;
  hero_subheadline?: string;
  about_paragraph?: string;
  services?: ServiceItem[];
  cta_text?: string;
  stats?: StatItem[];
  testimonials?: Testimonial[];
  contact_email?: string;
  whatsapp_number?: string;
}

export interface ResolvedImage {
  url: string;
  blur_url?: string;
  alt: string;
  credit: string;
  source: "unsplash" | "pexels" | "zuri-curated" | "fallback";
  width: number;
  height: number;
}

/** Patch instruction emitted by the critique pass. */
export interface CompositionPatch {
  field: string;
  reason: string;
  /** When the patch is applied, replaces the field at this path with newValue */
  newValue?: unknown;
}

/**
 * Full Gemini website-composition output → stored in websites.composition_json
 *
 * Always render-safe: every site must include nav_* → hero → … → footer_*.
 */
export interface WebsiteComposition {
  sections: BlockId[];
  palette: CompositionPalette;
  typography: CompositionTypography;
  motion_style: "slow_elegant" | "crisp_modern" | "bold_energetic";
  content: CompositionContentV2 | CompositionContentFlat;
  image_queries: string[];
  /** Populated after image resolution (URLs) */
  images?: string[];
  /** v2 resolved images with quality metadata */
  resolved_images?: ResolvedImage[];
  /** Resolved archetype name (v2+) */
  archetype?: DesignArchetype;
  /** Short business tagline (6–10 words) */
  tagline?: string;
  /** SEO meta */
  seo_title?: string;
  seo_description?: string;
  /** Open Graph */
  og_title?: string;
  /** Pipeline generation version: 1 = legacy single-pass, 2 = multi-stage */
  generation_version?: 1 | 2;
}
