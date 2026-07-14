# ZURI — WEBSITE BUILDER SYSTEM
# Complete specification for the AI website generation pipeline, block registry,
# editor, publishing, deployment, and all error handling

---

## 1. SUPPORTED vs UNSUPPORTED BRANCHES

Zuri generates websites for branches that need minimal backend — content-display sites where "Contact us" is the primary conversion action. Complex CMS or transaction-heavy sites are redirected to the Zuri team for a custom build.

### Supported (AI-generated)
| Branch | Types | Notes |
|---|---|---|
| 1 | Business / Service | Consultants, agencies, local services, professional firms |
| 3 | Portfolio / Personal Brand | Designers, photographers, freelancers, artists |
| 5 | Restaurant / Hospitality | Restaurants, cafés, bakeries, catering |
| 6 | Events / Booking-Based | Venues, class instructors, appointment services — contact-us redirect for booking, no integrated booking module |
| 8 | Landing Page | Product launch, waitlist, campaign, app promotion |

### Unsupported → Custom Site CTA
| Branch | Types | Reason |
|---|---|---|
| 2 | E-commerce | Requires CMS, inventory, payment checkout, order management |
| 4 | Blog / Content / Publication | Requires CMS, author management, SEO taxonomy |
| 7 | Nonprofit / Community | Requires donation module, membership gating, event calendar |
| Any | Complex multi-location chains, franchise systems, SaaS platforms | Too much backend |

When a user asks for an unsupported type anywhere in the app, show the Custom Site CTA:
```
"This type of site is built by our team.
 We specialise in complex builds — e-commerce, blogs, CMS, and more.
 [Get in touch →]  (mailto:build@zuri.com or /contact form)
```
Never say "Zuri can't do this." Always say "Our team handles this."

---

## 2. ARCHETYPE SYSTEM

Archetypes are the design DNA of every generated website. The resolver is fully deterministic — no AI involved. It maps business input to a spec that locks all downstream AI calls into appropriate visual and copy decisions.

### 2.1 Archetype Definitions

```typescript
// src/lib/website/archetypes.ts

export type DesignArchetype =
  | "warm-sensory"         // food, restaurant, bakery, catering
  | "authority-minimal"    // consultant, lawyer, accountant, coach
  | "luxury-aspirational"  // beauty, spa, salon, fashion, jewellery
  | "editorial-bold"       // retail, streetwear, creative agency
  | "clean-modern"         // tech, SaaS, fintech, logistics
  | "portfolio-dramatic"   // photography, videography, music, art
  | "community-vibrant"    // fitness, gym, sports, wellness
  | "trust-professional";  // medical, dental, pharmacy, real estate

export interface ArchetypeSpec {
  archetype: DesignArchetype;
  hero_variant_pool: string[];
  about_variant: string;
  services_variant: string;
  social_proof_variant: string;
  required_blocks: string[];
  optional_blocks: string[];
  forbidden_blocks: string[];
  palette_rules: {
    prefer_warm: boolean;
    accent_intensity: "subtle" | "bold" | "minimal";
    bg_range: "dark" | "light" | "either";
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
  contact_cta_label: string;
}

export const ARCHETYPES: Record<DesignArchetype, ArchetypeSpec> = {
  "warm-sensory": {
    archetype: "warm-sensory",
    hero_variant_pool: ["HeroFullscreen", "HeroSplit"],
    about_variant: "AboutFounder",
    services_variant: "ServicesCardGrid",
    social_proof_variant: "TestimonialsCarousel",
    required_blocks: ["HeroFullscreen", "AboutFounder", "ServicesCardGrid", "TestimonialsCarousel", "CTASimple", "FooterSimple"],
    optional_blocks: ["GalleryGrid", "FAQAccordion", "MapEmbed"],
    forbidden_blocks: ["PricingTable", "HeroTypographic", "LogoWall", "AboutStats", "CaseStudySpotlight"],
    palette_rules: { prefer_warm: true, accent_intensity: "bold", bg_range: "either" },
    typography_pairing: { heading: "Playfair Display", body: "Lato", heading_weight: 700, body_weight: 400 },
    image_style_keywords: ["golden hour", "warm", "vibrant", "close-up food", "artisan"],
    image_location_keywords: ["Nigerian", "African", "Lagos"],
    motion_style_bias: "bold_energetic",
    copy_tone_modifier: "warm, sensory, appetite-stimulating. Use words that evoke taste, smell, and warmth. Make the reader feel hungry.",
    contact_cta_label: "Make a Reservation",
  },
  "authority-minimal": {
    archetype: "authority-minimal",
    hero_variant_pool: ["HeroTypographic", "HeroMinimal"],
    about_variant: "AboutMission",
    services_variant: "ServicesListElegant",
    social_proof_variant: "TestimonialsCarousel",
    required_blocks: ["HeroTypographic", "AboutMission", "ServicesListElegant", "TestimonialsCarousel", "CTASimple", "FooterSimple"],
    optional_blocks: ["AboutStats", "LogoWall", "FAQAccordion"],
    forbidden_blocks: ["HeroFullscreen", "PricingTable", "GalleryGrid", "MapEmbed", "AboutFounder"],
    palette_rules: { prefer_warm: false, accent_intensity: "subtle", bg_range: "dark" },
    typography_pairing: { heading: "Cormorant Garamond", body: "Montserrat", heading_weight: 600, body_weight: 400 },
    image_style_keywords: ["professional", "minimal", "office", "clean", "monochrome"],
    image_location_keywords: ["Lagos", "Nigeria", "professional African"],
    motion_style_bias: "slow_elegant",
    copy_tone_modifier: "authoritative, precise, results-focused. Lead with specific outcomes and credentials. Avoid vague claims.",
    contact_cta_label: "Book a Consultation",
  },
  "luxury-aspirational": {
    archetype: "luxury-aspirational",
    hero_variant_pool: ["HeroFullscreen", "HeroFloatingCard"],
    about_variant: "AboutFounder",
    services_variant: "ServicesCardGrid",
    social_proof_variant: "TestimonialsCarousel",
    required_blocks: ["HeroFullscreen", "AboutFounder", "ServicesCardGrid", "TestimonialsCarousel", "CTASimple", "FooterSimple"],
    optional_blocks: ["GalleryGrid", "CTASplit"],
    forbidden_blocks: ["PricingTable", "HeroTypographic", "AboutStats", "LogoWall", "MapEmbed"],
    palette_rules: { prefer_warm: false, accent_intensity: "subtle", bg_range: "dark" },
    typography_pairing: { heading: "Cormorant Garamond", body: "Raleway", heading_weight: 400, body_weight: 300 },
    image_style_keywords: ["luxury", "editorial", "beauty", "aspirational", "elegant"],
    image_location_keywords: ["African beauty", "Nigerian fashion", "Lagos style"],
    motion_style_bias: "slow_elegant",
    copy_tone_modifier: "luxurious, aspirational, exclusive. Evoke transformation and premium experience. Never use the word 'cheap' or 'affordable'.",
    contact_cta_label: "Book Your Experience",
  },
  "editorial-bold": {
    archetype: "editorial-bold",
    hero_variant_pool: ["HeroSplit", "HeroFullscreen"],
    about_variant: "AboutFounder",
    services_variant: "ServicesCardGrid",
    social_proof_variant: "LogoWall",
    required_blocks: ["HeroSplit", "AboutFounder", "ServicesCardGrid", "CTASimple", "FooterSimple"],
    optional_blocks: ["LogoWall", "GalleryGrid", "TestimonialsCarousel"],
    forbidden_blocks: ["HeroMinimal", "ServicesListElegant", "AboutTimeline", "MapEmbed", "PricingTable"],
    palette_rules: { prefer_warm: true, accent_intensity: "bold", bg_range: "dark" },
    typography_pairing: { heading: "Bebas Neue", body: "DM Sans", heading_weight: 400, body_weight: 400 },
    image_style_keywords: ["bold", "vibrant", "urban", "editorial", "fashion"],
    image_location_keywords: ["Lagos street", "African fashion", "Nigerian culture"],
    motion_style_bias: "bold_energetic",
    copy_tone_modifier: "bold, confident, cultural. Reference Nigerian identity and local pride. Short sentences. Maximum impact.",
    contact_cta_label: "Work With Us",
  },
  "clean-modern": {
    archetype: "clean-modern",
    hero_variant_pool: ["HeroGradient", "HeroTypographic"],
    about_variant: "AboutStats",
    services_variant: "ServicesCardGrid",
    social_proof_variant: "LogoWall",
    required_blocks: ["HeroGradient", "AboutStats", "ServicesCardGrid", "CTASimple", "FooterSimple"],
    optional_blocks: ["TestimonialsCarousel", "FAQAccordion", "LogoWall"],
    forbidden_blocks: ["HeroFullscreen", "AboutFounder", "GalleryGrid", "MapEmbed", "PricingTable"],
    palette_rules: { prefer_warm: false, accent_intensity: "minimal", bg_range: "dark" },
    typography_pairing: { heading: "Inter", body: "Inter", heading_weight: 700, body_weight: 400 },
    image_style_keywords: ["technology", "minimal", "digital", "clean", "modern"],
    image_location_keywords: ["African tech", "Lagos startup", "Nigeria business"],
    motion_style_bias: "crisp_modern",
    copy_tone_modifier: "clear, benefit-driven, technical but accessible. Lead with outcomes. Avoid jargon unless the audience is technical.",
    contact_cta_label: "Get Started",
  },
  "portfolio-dramatic": {
    archetype: "portfolio-dramatic",
    hero_variant_pool: ["HeroFullscreen", "HeroSplit"],
    about_variant: "AboutFounder",
    services_variant: "ServicesCardGrid",
    social_proof_variant: "CaseStudySpotlight",
    required_blocks: ["HeroFullscreen", "AboutFounder", "ServicesCardGrid", "CaseStudySpotlight", "CTASimple", "FooterSimple"],
    optional_blocks: ["GalleryGrid", "TestimonialsCarousel"],
    forbidden_blocks: ["PricingTable", "HeroGradient", "AboutStats", "LogoWall", "MapEmbed"],
    palette_rules: { prefer_warm: false, accent_intensity: "bold", bg_range: "dark" },
    typography_pairing: { heading: "Fraunces", body: "Work Sans", heading_weight: 600, body_weight: 400 },
    image_style_keywords: ["dramatic", "artistic", "high contrast", "creative", "portfolio"],
    image_location_keywords: ["African creative", "Nigerian art", "Lagos photography"],
    motion_style_bias: "slow_elegant",
    copy_tone_modifier: "artistic, evocative, story-driven. Let the work speak; copy is minimal but powerful. Avoid clichés.",
    contact_cta_label: "Start a Project",
  },
  "community-vibrant": {
    archetype: "community-vibrant",
    hero_variant_pool: ["HeroFullscreen", "HeroSplit"],
    about_variant: "AboutFounder",
    services_variant: "ServicesCardGrid",
    social_proof_variant: "TestimonialsCarousel",
    required_blocks: ["HeroFullscreen", "AboutFounder", "ServicesCardGrid", "TestimonialsCarousel", "CTASimple", "FooterSimple"],
    optional_blocks: ["AboutStats", "GalleryGrid"],
    forbidden_blocks: ["HeroTypographic", "ServicesListElegant", "PricingTable", "CaseStudySpotlight"],
    palette_rules: { prefer_warm: true, accent_intensity: "bold", bg_range: "either" },
    typography_pairing: { heading: "Nunito", body: "Nunito", heading_weight: 800, body_weight: 400 },
    image_style_keywords: ["energetic", "fitness", "community", "active", "transformation"],
    image_location_keywords: ["African fitness", "Lagos gym", "Nigerian wellness"],
    motion_style_bias: "bold_energetic",
    copy_tone_modifier: "energetic, motivational, inclusive. Use action words and community language. Make people feel they belong.",
    contact_cta_label: "Join Us Today",
  },
  "trust-professional": {
    archetype: "trust-professional",
    hero_variant_pool: ["HeroSplit", "HeroTypographic"],
    about_variant: "AboutStats",
    services_variant: "ServicesListElegant",
    social_proof_variant: "TestimonialsCarousel",
    required_blocks: ["HeroSplit", "AboutStats", "ServicesListElegant", "TestimonialsCarousel", "CTASimple", "FooterSimple"],
    optional_blocks: ["FAQAccordion", "MapEmbed"],
    forbidden_blocks: ["HeroFullscreen", "GalleryGrid", "AboutFounder", "LogoWall", "PricingTable"],
    palette_rules: { prefer_warm: false, accent_intensity: "subtle", bg_range: "light" },
    typography_pairing: { heading: "Source Serif 4", body: "Source Sans 3", heading_weight: 600, body_weight: 400 },
    image_style_keywords: ["professional", "trustworthy", "clinical", "clean", "reassuring"],
    image_location_keywords: ["Nigerian medical", "Lagos professional", "African healthcare"],
    motion_style_bias: "crisp_modern",
    copy_tone_modifier: "reassuring, credentialed, clear. Lead with trust signals and professional outcomes. Never make medical or legal guarantees.",
    contact_cta_label: "Book an Appointment",
  },
};
```

### 2.2 Archetype Resolver

```typescript
// Deterministic — zero AI. Maps business_type + industry + services to archetype.
export function resolveArchetype(
  businessType: string,      // from onboarding Step 3
  industry: string,          // from Gemini brand extraction
  services: string[],        // from onboarding Step 4
  brandVibe: string          // from onboarding Step 6
): DesignArchetype {
  const combined = `${businessType} ${industry} ${services.join(" ")}`.toLowerCase();

  if (/food|restaurant|bakery|cater|cake|chef|kitchen|cuisine|café|cafe/.test(combined))
    return "warm-sensory";
  if (/beauty|salon|spa|hair|nail|makeup|skin|fashion|luxury|jewel|perfume/.test(combined))
    return "luxury-aspirational";
  if (/gym|fitness|sport|wellness|yoga|trainer|health coach|crossfit/.test(combined))
    return "community-vibrant";
  if (/photo|video|music|art|creative|design|film|record|content creator/.test(combined))
    return "portfolio-dramatic";
  if (/retail|shop|store|streetwear|clothing|brand/.test(combined))
    return "editorial-bold";
  if (/tech|software|app|digital|startup|saas|fintech|logistics|developer/.test(combined))
    return "clean-modern";
  if (/medical|doctor|dental|pharmacy|clinic|hospital|therapist|optician/.test(combined))
    return "trust-professional";
  if (/consult|lawyer|legal|account|finance|coach|advisor|strategy|audit|real estate/.test(combined))
    return "authority-minimal";

  // Fallback: use brand vibe to decide
  if (brandVibe === "elegant-luxurious") return "luxury-aspirational";
  if (brandVibe === "bold-vibrant" || brandVibe === "warm-friendly") return "editorial-bold";
  if (brandVibe === "clean-modern" || brandVibe === "creative-artistic") return "portfolio-dramatic";

  return "authority-minimal"; // final fallback
}
```

---

## 3. BLOCK REGISTRY

Every block has a BlockId (string), content schema, and rendering component. The validator uses this registry to ensure no unknown blocks are used.

```typescript
// src/components/website-blocks/block-registry.ts

export const BLOCK_REGISTRY: Record<string, BlockDefinition> = {
  // ── HERO BLOCKS ────────────────────────────────────────────
  "HeroFullscreen": {
    category: "hero",
    consumes_image: true,
    content_schema: {
      headline: { type: "string", required: true, max: 60 },
      subheadline: { type: "string", required: false, max: 120 },
      cta_text: { type: "string", required: true, max: 40 },
      cta_url: { type: "string", required: false, default: "#contact" },
      cta_secondary_text: { type: "string", required: false, max: 40 },
      cta_secondary_url: { type: "string", required: false },
      overlay_opacity: { type: "number", required: false, default: 0.5, min: 0.3, max: 0.85 },
    },
  },
  "HeroSplit": {
    category: "hero",
    consumes_image: true,
    content_schema: {
      headline: { type: "string", required: true, max: 60 },
      subheadline: { type: "string", required: false, max: 150 },
      cta_text: { type: "string", required: true, max: 40 },
      cta_url: { type: "string", required: false, default: "#contact" },
      image_side: { type: "enum", values: ["left", "right"], default: "right" },
    },
  },
  "HeroTypographic": {
    category: "hero",
    consumes_image: false,
    content_schema: {
      eyebrow: { type: "string", required: false, max: 40 },
      headline: { type: "string", required: true, max: 80 },
      subheadline: { type: "string", required: false, max: 150 },
      cta_text: { type: "string", required: true, max: 40 },
      cta_url: { type: "string", required: false, default: "#contact" },
    },
  },
  "HeroGradient": {
    category: "hero",
    consumes_image: false,
    content_schema: {
      headline: { type: "string", required: true, max: 70 },
      subheadline: { type: "string", required: false, max: 150 },
      cta_text: { type: "string", required: true, max: 40 },
      cta_url: { type: "string", required: false, default: "#contact" },
      cta_secondary_text: { type: "string", required: false, max: 40 },
    },
  },
  "HeroMinimal": {
    category: "hero",
    consumes_image: false,
    content_schema: {
      headline: { type: "string", required: true, max: 60 },
      cta_text: { type: "string", required: true, max: 40 },
      cta_url: { type: "string", required: false, default: "#contact" },
    },
  },
  "HeroFloatingCard": {
    category: "hero",
    consumes_image: true,
    content_schema: {
      headline: { type: "string", required: true, max: 50 },
      subheadline: { type: "string", required: false, max: 100 },
      card_headline: { type: "string", required: true, max: 40 },
      card_body: { type: "string", required: true, max: 80 },
      cta_text: { type: "string", required: true, max: 40 },
      cta_url: { type: "string", required: false, default: "#contact" },
    },
  },

  // ── ABOUT BLOCKS ───────────────────────────────────────────
  "AboutFounder": {
    category: "about",
    consumes_image: true,
    content_schema: {
      headline: { type: "string", required: true, max: 50, default: "Our Story" },
      body: { type: "string", required: true, max: 600 },
      founder_name: { type: "string", required: false, max: 60 },
      founder_title: { type: "string", required: false, max: 60 },
    },
  },
  "AboutMission": {
    category: "about",
    consumes_image: false,
    content_schema: {
      headline: { type: "string", required: true, max: 50 },
      mission_statement: { type: "string", required: true, max: 200 },
      body: { type: "string", required: false, max: 400 },
    },
  },
  "AboutStats": {
    category: "about",
    consumes_image: false,
    content_schema: {
      headline: { type: "string", required: true, max: 50 },
      subheadline: { type: "string", required: false, max: 100 },
      stats: {
        type: "array",
        required: true,
        min_items: 2,
        max_items: 4,
        item_schema: {
          value: { type: "string", required: true, max: 15 },
          label: { type: "string", required: true, max: 40 },
        },
      },
    },
  },
  "AboutTimeline": {
    category: "about",
    consumes_image: false,
    content_schema: {
      headline: { type: "string", required: true, max: 50 },
      events: {
        type: "array",
        required: true,
        min_items: 2,
        max_items: 6,
        item_schema: {
          year: { type: "string", required: true, max: 10 },
          title: { type: "string", required: true, max: 60 },
          description: { type: "string", required: true, max: 150 },
        },
      },
    },
  },

  // ── SERVICES BLOCKS ────────────────────────────────────────
  "ServicesCardGrid": {
    category: "services",
    consumes_image: false,
    content_schema: {
      headline: { type: "string", required: true, max: 50 },
      subheadline: { type: "string", required: false, max: 100 },
      cards: {
        type: "array",
        required: true,
        min_items: 2,
        max_items: 9,
        item_schema: {
          title: { type: "string", required: true, max: 40 },
          description: { type: "string", required: true, max: 120 },
          icon: { type: "string", required: false },
        },
      },
    },
  },
  "ServicesListElegant": {
    category: "services",
    consumes_image: false,
    content_schema: {
      headline: { type: "string", required: true, max: 50 },
      subheadline: { type: "string", required: false, max: 100 },
      items: {
        type: "array",
        required: true,
        min_items: 2,
        max_items: 8,
        item_schema: {
          title: { type: "string", required: true, max: 60 },
          description: { type: "string", required: true, max: 200 },
        },
      },
    },
  },

  // ── SOCIAL PROOF BLOCKS ────────────────────────────────────
  "TestimonialsCarousel": {
    category: "social_proof",
    consumes_image: false,
    content_schema: {
      headline: { type: "string", required: false, max: 50, default: "What Our Clients Say" },
      testimonials: {
        type: "array",
        required: true,
        min_items: 2,
        max_items: 6,
        item_schema: {
          quote: { type: "string", required: true, max: 200 },
          author_name: { type: "string", required: true, max: 50 },
          author_title: { type: "string", required: false, max: 60 },
        },
      },
    },
  },
  "CaseStudySpotlight": {
    category: "social_proof",
    consumes_image: true,
    content_schema: {
      label: { type: "string", required: false, max: 20, default: "Featured Work" },
      headline: { type: "string", required: true, max: 80 },
      body: { type: "string", required: true, max: 300 },
      result: { type: "string", required: false, max: 100 },
      cta_text: { type: "string", required: false, max: 40 },
      cta_url: { type: "string", required: false },
    },
  },
  "LogoWall": {
    category: "social_proof",
    consumes_image: false,
    content_schema: {
      headline: { type: "string", required: false, max: 50, default: "Trusted by" },
      logos: {
        type: "array",
        required: true,
        min_items: 3,
        max_items: 8,
        item_schema: {
          name: { type: "string", required: true, max: 40 },
          logo_url: { type: "string", required: false },
        },
      },
    },
  },

  // ── CTA BLOCKS ─────────────────────────────────────────────
  "CTASplit": {
    category: "cta",
    consumes_image: true,
    content_schema: {
      headline: { type: "string", required: true, max: 60 },
      body: { type: "string", required: false, max: 150 },
      cta_text: { type: "string", required: true, max: 40 },
      cta_url: { type: "string", required: false, default: "#contact" },
    },
  },
  "CTASimple": {
    category: "cta",
    consumes_image: false,
    content_schema: {
      headline: { type: "string", required: true, max: 70 },
      subheadline: { type: "string", required: false, max: 120 },
      cta_text: { type: "string", required: true, max: 40 },
      cta_url: { type: "string", required: false, default: "#contact" },
      show_contact_form: { type: "boolean", required: false, default: true },
      contact_fields: {
        type: "array",
        required: false,
        default: ["name", "email", "message"],
        item_schema: {
          field: { type: "enum", values: ["name", "email", "phone", "message", "service"] },
        },
      },
    },
  },

  // ── UTILITY BLOCKS ─────────────────────────────────────────
  "FAQAccordion": {
    category: "utility",
    consumes_image: false,
    content_schema: {
      headline: { type: "string", required: false, max: 50, default: "Frequently Asked Questions" },
      faqs: {
        type: "array",
        required: true,
        min_items: 3,
        max_items: 10,
        item_schema: {
          question: { type: "string", required: true, max: 120 },
          answer: { type: "string", required: true, max: 400 },
        },
      },
    },
  },
  "GalleryGrid": {
    category: "utility",
    consumes_image: true,
    content_schema: {
      headline: { type: "string", required: false, max: 50, default: "Our Work" },
      columns: { type: "number", required: false, default: 3, min: 2, max: 4 },
      images: { type: "array", required: true, min_items: 4, max_items: 12 },
    },
  },
  "MapEmbed": {
    category: "utility",
    consumes_image: false,
    content_schema: {
      headline: { type: "string", required: false, max: 50, default: "Find Us" },
      address: { type: "string", required: true, max: 200 },
      hours: { type: "string", required: false, max: 200 },
      phone: { type: "string", required: false, max: 30 },
      embed_url: { type: "string", required: false },
    },
  },

  // ── FOOTER BLOCKS ──────────────────────────────────────────
  "FooterSimple": {
    category: "footer",
    consumes_image: false,
    content_schema: {
      tagline: { type: "string", required: false, max: 80 },
      social_links: {
        type: "array",
        required: false,
        max_items: 5,
        item_schema: {
          platform: { type: "enum", values: ["instagram", "facebook", "linkedin", "x", "tiktok", "whatsapp"] },
          url: { type: "string", required: true },
        },
      },
      show_zuri_badge: { type: "boolean", required: false, default: true },
    },
  },
  "FooterFull": {
    category: "footer",
    consumes_image: false,
    content_schema: {
      tagline: { type: "string", required: false, max: 80 },
      links: {
        type: "array",
        required: false,
        max_items: 10,
        item_schema: {
          label: { type: "string", required: true, max: 30 },
          url: { type: "string", required: true },
        },
      },
      contact_email: { type: "string", required: false },
      contact_phone: { type: "string", required: false },
      social_links: { type: "array", required: false, max_items: 5 },
      show_zuri_badge: { type: "boolean", required: false, default: true },
    },
  },
};

export const BLOCK_REGISTRY_KEYS = new Set(Object.keys(BLOCK_REGISTRY));
```

### 3.1 Forbidden Blocks (Global — apply to every archetype)

```typescript
// NEVER generate these for any supported branch
// PricingTable is forbidden globally — Zuri sites use "contact us" as the conversion action,
// not a self-serve pricing grid
export const GLOBALLY_FORBIDDEN_BLOCKS = new Set(["PricingTable"]);
```

---

## 4. THREE-PASS COMPOSITION PIPELINE

### 4.1 Pipeline Entry Point

```typescript
// src/lib/website/composition-pipeline.ts

export async function runCompositionPipeline(
  brand: BusinessProfile,
  userId: string,
  jobId: string
): Promise<{ composition: WebsiteComposition; needsReview: boolean }> {

  const supabase = createServiceClient(); // service role — bypasses RLS

  // Mark job as processing
  await supabase.from("website_generation_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    // Stage 1: Resolve archetype (deterministic, no AI)
    const archetype = resolveArchetype(brand.business_type, brand.industry, brand.services, brand.brand_vibe);
    const spec = ARCHETYPES[archetype];

    // Stage 2: Pass 1 — Structure (Gemini Flash, ~3-5s)
    const structure = await pass1_structure(brand, spec);

    // Stage 3: Pass 2 — Copy (Gemini Pro, ~8-15s)
    const withCopy = await pass2_copy(brand, spec, structure);

    // Stage 4: Image resolution (parallel, ~5-10s)
    const withImages = await resolveImages(withCopy, spec);

    // Stage 5: Pass 3 — Critique (Gemini Flash, ~2-4s)
    const { composition, patches } = await pass3_critique(brand, withImages, spec);

    // Stage 6: Apply patches if needed
    const finalComposition = patches.length > 0
      ? await applyPatches(composition, patches, brand, spec)
      : composition;

    // Stage 7: Validate
    const { valid, errors, warnings } = validateComposition(finalComposition);

    // Stage 8: Save to DB
    const { data: website, error: dbError } = await supabase
      .from("websites")
      .upsert({
        user_id: userId,
        handle: brand.handle, // from profiles table
        composition_json: finalComposition,
        archetype,
        needs_review: !valid || patches.length > 3,
        generation_version: 2,
        status: "preview",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (dbError) throw dbError;

    // Mark job as completed
    await supabase.from("website_generation_jobs")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    return { composition: finalComposition, needsReview: !valid || patches.length > 3 };

  } catch (err) {
    // Mark job as failed
    await supabase.from("website_generation_jobs")
      .update({
        status: "failed",
        error_message: String(err),
        retry_count: supabase.rpc("increment", { table: "website_generation_jobs", id: jobId, column: "retry_count" }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    throw err;
  }
}
```

### 4.2 Pass 1 — Structure (Gemini Flash)

Decides: which blocks to use, palette, typography, motion style, image query strings. No copy generated here.

```typescript
async function pass1_structure(
  brand: BusinessProfile,
  spec: ArchetypeSpec
): Promise<Partial<WebsiteComposition>> {
  const prompt = `
You are a website architect for an African business platform.
Output ONLY structural decisions. NO copy. NO text content. ONLY structure.

BRAND:
- Business: ${brand.business_name}
- Industry: ${brand.industry}
- Services: ${brand.services.join(", ")}
- Brand vibe: ${brand.brand_vibe}
- Location: ${brand.location_city ?? brand.location}, Nigeria

ARCHETYPE: ${spec.archetype}
REQUIRED BLOCKS (use all of these in this order, may add optional ones): ${spec.required_blocks.join(", ")}
OPTIONAL BLOCKS (add 0-2 if they add value): ${spec.optional_blocks.join(", ")}
FORBIDDEN BLOCKS (never use): ${spec.forbidden_blocks.join(", ")}
PREFER WARM PALETTE: ${spec.palette_rules.prefer_warm}
ACCENT INTENSITY: ${spec.palette_rules.accent_intensity}
BG RANGE: ${spec.palette_rules.bg_range}

Output ONLY valid JSON with this exact shape (no markdown, no explanation):
{
  "sections": ["BlockId1", "BlockId2", ...],
  "palette": {
    "bg": "#hex",
    "surface": "#hex",
    "text": "#hex",
    "accent": "#hex",
    "muted": "#hex"
  },
  "typography": {
    "heading": "${spec.typography_pairing.heading}",
    "body": "${spec.typography_pairing.body}",
    "heading_weight": ${spec.typography_pairing.heading_weight},
    "body_weight": ${spec.typography_pairing.body_weight}
  },
  "motion_style": "${spec.motion_style_bias}",
  "image_queries": ["specific query 1", "specific query 2"]
}

PALETTE RULES:
- bg must be ${spec.palette_rules.bg_range === "dark" ? "dark (#0A0A0A to #1A1A2E)" : spec.palette_rules.bg_range === "light" ? "light (#F5F5F5 to #FFFFFF)" : "either dark or light — choose what fits the archetype best"}
- accent must have strong contrast against bg
- text must have at least 4.5:1 contrast ratio against bg
- image_queries: one per image-consuming block in sections, must be specific to THIS business and location
- sections array must use ONLY exact BlockId strings listed above
- sections must include ALL required blocks, in logical order
- motion_style must be exactly: "${spec.motion_style_bias}"
`;

  return geminiJSON<Partial<WebsiteComposition>>(prompt, "flash");
}
```

### 4.3 Pass 2 — Copy (Gemini Pro)

Generates ALL website text. This is the most important pass.

```typescript
async function pass2_copy(
  brand: BusinessProfile,
  spec: ArchetypeSpec,
  structure: Partial<WebsiteComposition>
): Promise<Partial<WebsiteComposition>> {
  const prompt = `
You are a world-class copywriter specialising in African small business brands.
Generate ALL website copy for this specific Nigerian business.

BUSINESS:
- Name: ${brand.business_name}
- Industry: ${brand.industry}
- Services: ${brand.services.join(", ")}
- Unique value: ${brand.unique_value}
- Target audience: ${brand.target_audience}
- Location: ${brand.location_city ?? brand.location}, Nigeria
- Brand tone: ${brand.brand_tone}
- Tone modifier: ${spec.copy_tone_modifier}
- Tagline from brand extraction: ${brand.tagline}

SECTIONS TO WRITE COPY FOR: ${JSON.stringify((structure as any).sections)}

COPY RULES (strictly follow all of these):
1. Every piece of copy MUST be SPECIFIC to ${brand.business_name} — zero generic text
2. The business name "${brand.business_name}" must appear in the hero headline or subheadline
3. Services must be named EXACTLY as provided: ${brand.services.join(", ")}
4. CTAs must be action-specific ("Book your appointment" not "Contact us")
5. Location: reference ${brand.location_city ?? brand.location} / Nigeria where it adds local trust
6. Tone: ${spec.copy_tone_modifier}
7. NEVER use placeholder text, lorem ipsum, or [brackets]
8. Testimonials: use realistic Nigerian names. Do NOT fabricate specific dates, revenue numbers, or unverifiable statistics
9. Stats (if AboutStats block): use plausible round numbers appropriate to a growing African SMB
10. FAQ (if FAQAccordion block): write questions real customers would ask about this specific business
11. CTA text: max 5 words. Never just "Click Here" or "Submit"

Output ONLY valid JSON (no markdown, no explanation):
{
  "content": {
    "BlockId1": { ...block-specific content matching the block's schema },
    "BlockId2": { ... },
    ...
  },
  "tagline": "5-9 word business tagline",
  "seo_title": "60 chars max — business name + main service + city",
  "seo_description": "155 chars max — what this business does, for whom, and where",
  "og_title": "Open Graph title for social sharing"
}
`;

  const copyResult = await geminiJSON<{
    content: Record<string, unknown>;
    tagline: string;
    seo_title: string;
    seo_description: string;
    og_title: string;
  }>(prompt, "pro");

  return { ...structure, ...copyResult };
}
```

### 4.4 Pass 3 — Critique (Gemini Flash)

Quality gate. Returns confidence score and specific patch requests.

```typescript
async function pass3_critique(
  brand: BusinessProfile,
  composition: Partial<WebsiteComposition>,
  spec: ArchetypeSpec
): Promise<{ composition: WebsiteComposition; patches: Array<{ field: string; reason: string }> }> {
  const comp = composition as any;
  const prompt = `
You are a senior UX and copy reviewer. Evaluate this website composition for quality issues.

BRAND: ${brand.business_name} — ${brand.industry}
ARCHETYPE: ${spec.archetype}
HERO HEADLINE: ${comp.content?.HeroFullscreen?.headline ?? comp.content?.HeroTypographic?.headline ?? comp.content?.HeroSplit?.headline ?? "not found"}
TAGLINE: ${comp.tagline}
SECTIONS: ${JSON.stringify(comp.sections)}
FIRST CTA TEXT: ${comp.content?.[comp.sections?.[0]]?.cta_text ?? "not found"}

Check ONLY these issues:
1. Does the hero headline mention the business name "${brand.business_name}" or a clear reference to it?
2. Is the tagline specific (not a generic cliché like "Quality you can trust")?
3. Are CTAs specific and action-oriented (not just "Learn More" or "Contact Us")?
4. Is any forbidden block present? Forbidden: ${spec.forbidden_blocks.join(", ")}
5. Does any section have a headline longer than 80 characters? (too long)

Output ONLY valid JSON:
{
  "confidence": 0.0,
  "patches": [
    { "field": "content.HeroFullscreen.headline", "reason": "Does not mention business name" }
  ]
}

If confidence >= 0.82, patches must be empty [].
Confidence of 1.0 = perfect. Flag only real problems, not stylistic preferences.
`;

  const critique = await geminiJSON<{
    confidence: number;
    patches: Array<{ field: string; reason: string }>;
  }>(prompt, "flash");

  return { composition: composition as WebsiteComposition, patches: critique.patches };
}
```

### 4.5 Patch Application

```typescript
async function applyPatches(
  composition: WebsiteComposition,
  patches: Array<{ field: string; reason: string }>,
  brand: BusinessProfile,
  spec: ArchetypeSpec
): Promise<WebsiteComposition> {
  if (patches.length === 0) return composition;

  const patchSummary = patches.map(p => `Field: ${p.field}\nIssue: ${p.reason}`).join("\n\n");

  const prompt = `
Fix the following issues in this website composition.

BUSINESS: ${brand.business_name}
CURRENT COMPOSITION CONTENT (only the fields needing fixes):
${JSON.stringify((composition as any).content, null, 2)}

ISSUES TO FIX:
${patchSummary}

Output ONLY the fixed fields as JSON patches. For each field path (e.g. "content.HeroFullscreen.headline"),
output the corrected value. Format:
{
  "patches": [
    { "field": "content.HeroFullscreen.headline", "value": "corrected headline here" }
  ]
}
`;

  const { patches: appliedPatches } = await geminiJSON<{
    patches: Array<{ field: string; value: unknown }>;
  }>(prompt, "flash");

  let updated = { ...composition } as any;
  for (const patch of appliedPatches) {
    const parts = patch.field.split(".");
    let obj = updated;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
      if (!obj) break;
    }
    if (obj) obj[parts[parts.length - 1]] = patch.value;
  }

  return updated as WebsiteComposition;
}
```

### 4.6 Gemini Call Retry Logic

Both `geminiJSON` calls must have retry logic built in for JSON parse failures.

```typescript
// src/lib/gemini.ts (additions)

export async function geminiJSON<T>(prompt: string, model: "flash" | "pro"): Promise<T> {
  const modelId = model === "pro" ? "gemini-1.5-pro" : "gemini-1.5-flash";
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await geminiGenerate(prompt, modelId);
      const text = response.trim();

      // Strip markdown code fences if present
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      return JSON.parse(cleaned) as T;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      // On parse failure, add strictness hint to the next attempt
      console.warn(`Gemini JSON parse attempt ${attempt} failed. Retrying...`);
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }

  throw new Error("geminiJSON: all retry attempts exhausted");
}
```

---

## 5. IMAGE RESOLVER

```typescript
// src/lib/website/image-resolver.ts

const IMAGE_CONSUMING_BLOCKS = new Set([
  "HeroFullscreen", "HeroSplit", "HeroFloatingCard", "CTASplit",
  "AboutFounder", "CaseStudySpotlight", "GalleryGrid",
]);

export async function resolveImages(
  composition: Partial<WebsiteComposition>,
  spec: ArchetypeSpec
): Promise<Partial<WebsiteComposition>> {
  const queries = (composition as any).image_queries as string[] ?? [];
  const imageSections = ((composition as any).sections as string[]).filter(
    s => IMAGE_CONSUMING_BLOCKS.has(s)
  );

  // Ensure we have enough queries for all image-consuming blocks
  const effectiveQueries = imageSections.map((section, i) => {
    const rawQuery = queries[i] ?? `${spec.image_style_keywords[0]} ${spec.image_location_keywords[0]}`;
    return enrichQuery(rawQuery, spec);
  });

  // Resolve all in parallel
  const resolved = await Promise.all(
    effectiveQueries.map(q => resolveImage(q, spec))
  );

  // Map images to their sections
  const sectionImageMap: Record<string, ResolvedImage> = {};
  imageSections.forEach((section, i) => {
    if (resolved[i]) sectionImageMap[section] = resolved[i];
  });

  return { ...composition, resolved_images: resolved, section_image_map: sectionImageMap };
}

function enrichQuery(query: string, spec: ArchetypeSpec): string {
  const location = spec.image_location_keywords[0] ?? "Nigeria";
  const style = spec.image_style_keywords[0] ?? "";
  // Avoid redundant keywords — only add if not already in query
  const needsLocation = !query.toLowerCase().includes("nigeria") &&
    !query.toLowerCase().includes("lagos") &&
    !query.toLowerCase().includes("african");
  const enriched = needsLocation ? `${query} ${location} ${style}` : `${query} ${style}`;
  return enriched.replace(/\s+/g, " ").trim();
}

async function resolveImage(query: string, spec: ArchetypeSpec): Promise<ResolvedImage> {
  // 1. Try Unsplash
  const unsplash = await queryUnsplash(query);
  if (unsplash) return unsplash;

  // 2. Try Pexels
  const pexels = await queryPexels(query);
  if (pexels) return pexels;

  // 3. Archetype fallback — never return null
  return getArchetypeFallback(spec.archetype);
}

async function queryUnsplash(query: string): Promise<ResolvedImage | null> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape&content_filter=high`,
      {
        headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(8000), // 8 second timeout
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results?.length) return null;

    // Quality filter: min width 1600px, some engagement (likes > 5)
    const qualified = data.results.filter(
      (p: any) => p.width >= 1600 && p.likes >= 5
    );

    const photo = qualified[0] ?? data.results[0]; // fallback to first if none qualify

    return {
      url: photo.urls.regular,
      blur_url: photo.urls.thumb,
      alt: photo.alt_description ?? query,
      credit: `Photo by ${photo.user.name} on Unsplash`,
      credit_url: `https://unsplash.com/@${photo.user.username}`,
      source: "unsplash",
      width: photo.width,
      height: photo.height,
    };
  } catch {
    return null;
  }
}

async function queryPexels(query: string): Promise<ResolvedImage | null> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      {
        headers: { Authorization: process.env.PEXELS_API_KEY! },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.photos?.length) return null;

    const photo = data.photos[0];
    return {
      url: photo.src.large2x,
      blur_url: photo.src.small,
      alt: photo.alt ?? query,
      credit: `Photo by ${photo.photographer} on Pexels`,
      credit_url: photo.photographer_url,
      source: "pexels",
      width: photo.width,
      height: photo.height,
    };
  } catch {
    return null;
  }
}

function getArchetypeFallback(archetype: string): ResolvedImage {
  return {
    url: `/images/fallbacks/${archetype}.jpg`,
    blur_url: `/images/fallbacks/${archetype}-blur.jpg`,
    alt: "Business background",
    credit: "Zuri",
    credit_url: null,
    source: "fallback",
    width: 2400,
    height: 1600,
  };
}
```

---

## 6. COMPOSITION VALIDATOR

```typescript
// src/lib/website/composition-validator.ts

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateComposition(composition: WebsiteComposition): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const content = (composition as any).content ?? {};

  // Rule 1: All BlockIds must exist in registry
  composition.sections.forEach(blockId => {
    if (!BLOCK_REGISTRY_KEYS.has(blockId)) {
      errors.push(`Unknown BlockId: "${blockId}" — not in registry`);
    }
  });

  // Rule 2: No globally forbidden blocks
  composition.sections.forEach(blockId => {
    if (GLOBALLY_FORBIDDEN_BLOCKS.has(blockId)) {
      errors.push(`Forbidden block used: "${blockId}"`);
    }
  });

  // Rule 3: Exactly one hero block, and it must be first
  const heroBlocks = composition.sections.filter(s => BLOCK_REGISTRY[s]?.category === "hero");
  if (heroBlocks.length === 0) errors.push("No hero block found");
  if (heroBlocks.length > 1) errors.push(`Multiple hero blocks: ${heroBlocks.join(", ")}`);
  if (heroBlocks.length === 1 && composition.sections[0] !== heroBlocks[0]) {
    errors.push("Hero block must be the first section");
  }

  // Rule 4: Must have exactly one footer, and it must be last
  const footerBlocks = composition.sections.filter(s => BLOCK_REGISTRY[s]?.category === "footer");
  if (footerBlocks.length === 0) errors.push("No footer block found");
  if (footerBlocks.length > 1) errors.push("Multiple footer blocks found");
  const lastSection = composition.sections[composition.sections.length - 1];
  if (footerBlocks.length === 1 && lastSection !== footerBlocks[0]) {
    errors.push("Footer block must be the last section");
  }

  // Rule 5: All content fields must be non-empty strings / valid arrays
  composition.sections.forEach(blockId => {
    if (!content[blockId]) {
      warnings.push(`No content for block: ${blockId}`);
      return;
    }
    const blockDef = BLOCK_REGISTRY[blockId];
    if (!blockDef) return;
    Object.entries(blockDef.content_schema).forEach(([field, schema]: [string, any]) => {
      if (schema.required && !content[blockId][field]) {
        errors.push(`Missing required field "${field}" in block "${blockId}"`);
      }
    });
  });

  // Rule 6: CTA text must be 8 words or fewer
  composition.sections.forEach(blockId => {
    const cta = content[blockId]?.cta_text;
    if (cta && typeof cta === "string" && cta.split(" ").length > 8) {
      warnings.push(`CTA text too long in ${blockId}: "${cta}" (max 8 words)`);
    }
  });

  // Rule 7: No placeholder text
  const placeholderPatterns = [/lorem ipsum/i, /\[.*?\]/, /placeholder/i, /your business/i, /insert/i];
  composition.sections.forEach(blockId => {
    if (!content[blockId]) return;
    const contentStr = JSON.stringify(content[blockId]);
    placeholderPatterns.forEach(pattern => {
      if (pattern.test(contentStr)) {
        errors.push(`Placeholder text detected in block "${blockId}"`);
      }
    });
  });

  // Rule 8: Palette completeness
  ["bg", "surface", "text", "accent", "muted"].forEach(key => {
    if (!(composition.palette as any)[key]) {
      errors.push(`Missing palette key: ${key}`);
    }
  });

  // Rule 9: SEO fields
  if (!(composition as any).seo_title) warnings.push("Missing seo_title");
  if (!(composition as any).seo_description) warnings.push("Missing seo_description");
  if ((composition as any).seo_title?.length > 60) warnings.push("seo_title exceeds 60 characters");
  if ((composition as any).seo_description?.length > 155) warnings.push("seo_description exceeds 155 characters");

  // Rule 10: Tagline
  if (!(composition as any).tagline) warnings.push("Missing tagline");
  const taglineWords = (composition as any).tagline?.split(" ").length ?? 0;
  if (taglineWords > 10) warnings.push(`Tagline too long: ${taglineWords} words (max 10)`);

  return { valid: errors.length === 0, errors, warnings };
}
```

---

## 7. WEBSITE RENDERING ARCHITECTURE

### 7.1 Website Status States

```typescript
type WebsiteStatus =
  | "generating"   // Job is queued or processing
  | "preview"      // Generated successfully, not published
  | "published"    // Live on handle.zuri.com or custom domain
  | "suspended"    // Plan expired — site hidden, not deleted (30-day recovery)
  | "failed"       // Generation failed, retry available
  | "deleted";     // User deleted the website
```

### 7.2 Subdomain Middleware

```typescript
// middleware.ts (at project root — applies to all requests)

import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "zuri.com";

export function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;

  // Skip middleware for internal paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Subdomain detection: handle.zuri.com
  if (hostname.endsWith(`.${ROOT_DOMAIN}`) && !hostname.startsWith("www.")) {
    const handle = hostname.split(`.${ROOT_DOMAIN}`)[0];

    // Protect reserved app subdomains
    const APP_SUBDOMAINS = new Set(["app", "api", "www", "mail", "admin", "staging"]);
    if (APP_SUBDOMAINS.has(handle)) return NextResponse.next();

    // Rewrite to internal site rendering route
    return NextResponse.rewrite(new URL(`/sites/${handle}${pathname}`, req.url));
  }

  // Custom domain detection: user's own domain
  if (
    !hostname.includes(ROOT_DOMAIN) &&
    !hostname.includes("localhost") &&
    !hostname.includes("vercel.app")
  ) {
    return NextResponse.rewrite(new URL(`/sites/custom-domain/${hostname}${pathname}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### 7.3 Site Rendering Page

```typescript
// src/app/sites/[handle]/page.tsx
// Renders the full generated website for a given handle

import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { BlockRenderer } from "@/components/website-blocks/BlockRenderer";
import type { Metadata } from "next";

interface Props {
  params: { handle: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServiceClient();
  const { data: website } = await supabase
    .from("websites")
    .select("composition_json")
    .eq("handle", params.handle)
    .eq("status", "published")
    .single();

  if (!website) return { title: "Zuri" };

  const comp = website.composition_json as any;
  return {
    title: comp.seo_title ?? comp.tagline ?? params.handle,
    description: comp.seo_description,
    openGraph: { title: comp.og_title ?? comp.seo_title },
  };
}

export default async function SitePage({ params }: Props) {
  const supabase = createServiceClient();

  const { data: website } = await supabase
    .from("websites")
    .select("composition_json, status, user_id")
    .eq("handle", params.handle)
    .single();

  if (!website) return notFound();

  if (website.status === "suspended") {
    return <SiteSuspendedPage />;
  }

  if (website.status !== "published") {
    // Preview requests require auth — handled in /preview/[handle]
    return notFound();
  }

  return (
    <BlockRenderer
      composition={website.composition_json}
      isPublished={true}
    />
  );
}
```

### 7.4 Internal Preview Route (auth required)

```typescript
// src/app/preview/[handle]/page.tsx
// For authenticated users previewing their unpublished site

export default async function PreviewPage({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: website } = await supabase
    .from("websites")
    .select("composition_json, status")
    .eq("user_id", user.id) // Only the owner can preview their unpublished site
    .eq("handle", params.handle)
    .single();

  if (!website) return notFound();

  return (
    <div>
      <PreviewBanner status={website.status} handle={params.handle} />
      <BlockRenderer composition={website.composition_json} isPublished={false} />
    </div>
  );
}
```

---

## 8. WEBSITE EDITOR

### 8.1 Editor Architecture

The editor lives at `/dashboard/website/edit`. It has three zones:

```
┌─────────────────────────────────────────────────────┐
│  TopBar: "Editing [Business Name]"  [Preview] [Publish] │
├────────────┬────────────────────────────────────────┤
│            │                                         │
│  Section   │          Live Preview                   │
│  List      │       (scaled iframe of /preview/      │
│  (left     │        [handle], 80% zoom)              │
│  panel)    │                                         │
│            │                                         │
│            │                                         │
├────────────┴────────────────────────────────────────┤
│  Edit Panel (slides up from bottom when section     │
│  is selected)                                       │
└─────────────────────────────────────────────────────┘
```

Mobile layout: Section list hidden → preview fills screen → tap a section → edit panel slides up as a sheet.

### 8.2 Section Edit API

```typescript
// src/app/api/website/section/route.ts
// PATCH — edit a single field within a section, or regenerate the whole section

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { blockId, field, value, action } = await req.json();

  // action: "edit" (direct field update) | "regenerate" (AI regeneration of block copy)

  if (!blockId || !BLOCK_REGISTRY_KEYS.has(blockId)) {
    return NextResponse.json({ error: "Invalid blockId" }, { status: 400 });
  }

  const { data: website } = await supabase
    .from("websites")
    .select("composition_json")
    .eq("user_id", user.id)
    .single();

  if (!website) return NextResponse.json({ error: "No website found" }, { status: 404 });

  let updatedComposition = { ...(website.composition_json as any) };

  if (action === "regenerate") {
    // Check usage: website_regenerations limit
    const gate = await checkUsageLimit(supabase, user.id, "website_regenerations");
    if (!gate.allowed) {
      return NextResponse.json({
        error: "Regeneration limit reached",
        upgradeRequired: gate.upgradeRequired,
      }, { status: 403 });
    }

    const { data: brand } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const archetype = updatedComposition.archetype;
    const spec = ARCHETYPES[archetype];

    const newContent = await geminiJSON(`
Regenerate copy for the "${blockId}" block for ${brand?.business_name}.
Industry: ${brand?.industry}. Services: ${brand?.services?.join(", ")}.
Tone: ${spec?.copy_tone_modifier}
Return JSON with the same structure as the original content object.
Original content: ${JSON.stringify(updatedComposition.content?.[blockId])}
Rules: specific to this business, no placeholders, CTA max 5 words.
`, "flash");

    updatedComposition.content = {
      ...updatedComposition.content,
      [blockId]: newContent,
    };

    // Increment usage counter
    await supabase.rpc("increment_usage", { p_user_id: user.id, p_metric: "website_regenerations" });

  } else if (action === "edit") {
    // Direct field update — sanitize the value
    if (typeof value !== "string" && !Array.isArray(value) && typeof value !== "boolean" && typeof value !== "number") {
      return NextResponse.json({ error: "Invalid value type" }, { status: 400 });
    }

    const sanitizedValue = typeof value === "string" ? sanitizeText(value) : value;

    // Validate against block schema
    const blockDef = BLOCK_REGISTRY[blockId];
    const fieldSchema = blockDef?.content_schema[field];
    if (fieldSchema?.max && typeof sanitizedValue === "string" && sanitizedValue.length > fieldSchema.max) {
      return NextResponse.json({
        error: `Field "${field}" exceeds max length of ${fieldSchema.max}`,
      }, { status: 400 });
    }

    updatedComposition.content = {
      ...updatedComposition.content,
      [blockId]: {
        ...updatedComposition.content?.[blockId],
        [field]: sanitizedValue,
      },
    };
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await supabase
    .from("websites")
    .update({
      composition_json: updatedComposition,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  return NextResponse.json({ success: true, content: updatedComposition.content?.[blockId] });
}
```

### 8.3 Image Swap API

```typescript
// src/app/api/website/image/route.ts
// POST — swap an image for a section

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const blockId = formData.get("blockId") as string;
  const action = formData.get("action") as string; // "upload" | "unsplash"
  const unsplashQuery = formData.get("query") as string | null;
  const file = formData.get("file") as File | null;

  if (!blockId || !BLOCK_REGISTRY_KEYS.has(blockId)) {
    return NextResponse.json({ error: "Invalid blockId" }, { status: 400 });
  }

  if (!IMAGE_CONSUMING_BLOCKS.has(blockId)) {
    return NextResponse.json({ error: "Block does not consume images" }, { status: 400 });
  }

  let resolvedImage: ResolvedImage;

  if (action === "upload" && file) {
    // Validate file
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ error: "Image must be smaller than 10MB" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}/${blockId}-${Date.now()}.${file.type.split("/")[1]}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("website-images")
      .upload(fileName, file, { contentType: file.type, upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("website-images")
      .getPublicUrl(uploadData.path);

    resolvedImage = {
      url: publicUrl,
      blur_url: publicUrl,
      alt: `${blockId} image`,
      credit: "Uploaded by user",
      credit_url: null,
      source: "user-upload",
      width: 0,
      height: 0,
    };

  } else if (action === "unsplash" && unsplashQuery) {
    const result = await queryUnsplash(sanitizeText(unsplashQuery));
    if (!result) return NextResponse.json({ error: "No image found for that query" }, { status: 404 });
    resolvedImage = result;
  } else {
    return NextResponse.json({ error: "Invalid action or missing parameters" }, { status: 400 });
  }

  // Update the section_image_map in composition
  const { data: website } = await supabase
    .from("websites")
    .select("composition_json")
    .eq("user_id", user.id)
    .single();

  const updated = { ...(website!.composition_json as any) };
  updated.section_image_map = { ...updated.section_image_map, [blockId]: resolvedImage };

  await supabase.from("websites")
    .update({ composition_json: updated, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  return NextResponse.json({ success: true, image: resolvedImage });
}
```

---

## 9. PUBLISH FLOW

### 9.1 Publish API

```typescript
// src/app/api/website/publish/route.ts

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check plan — Free users cannot publish
  const gate = await checkFeatureAccess(supabase, user.id, "websites");
  if (!gate.allowed) {
    return NextResponse.json({
      error: "Upgrade required to publish your website",
      upgradeRequired: gate.upgradeRequired,
    }, { status: 403 });
  }

  const { data: website } = await supabase
    .from("websites")
    .select("composition_json, status, handle")
    .eq("user_id", user.id)
    .single();

  if (!website) return NextResponse.json({ error: "No website found" }, { status: 404 });
  if (website.status === "published") {
    return NextResponse.json({ success: true, message: "Already published", url: `https://${website.handle}.zuri.com` });
  }

  // Run validation before publish
  const { valid, errors } = validateComposition(website.composition_json as WebsiteComposition);
  if (!valid) {
    return NextResponse.json({
      error: "Website has validation errors and cannot be published",
      details: errors,
    }, { status: 422 });
  }

  // Publish
  await supabase.from("websites").update({
    status: "published",
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id);

  // Lock the handle
  await supabase.from("profiles").update({
    handle_locked: true,
  }).eq("id", user.id);

  const siteUrl = `https://${website.handle}.zuri.com`;

  // Send "your site is live" email
  const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", user.id).single();
  if (profile?.email) {
    await sendSitePublishedEmail({ to: profile.email, name: profile.full_name, siteUrl });
  }

  return NextResponse.json({ success: true, url: siteUrl });
}
```

### 9.2 Unpublish / Suspend

```typescript
// POST /api/website/unpublish
// Unpublish a site (user-initiated) — status goes back to "preview"
// Note: plan expiry suspension is handled by the cron job in MONETIZATION.md

export async function POST(req: Request) {
  // ... auth check ...
  await supabase.from("websites")
    .update({ status: "preview", updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  return NextResponse.json({ success: true });
}
```

---

## 10. DATABASE SCHEMA

```sql
-- ============================================================
-- WEBSITES
-- ============================================================
CREATE TABLE IF NOT EXISTS websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  handle text NOT NULL,
  custom_domain text UNIQUE,
  status text NOT NULL DEFAULT 'generating',
  -- status: generating | preview | published | suspended | failed | deleted
  composition_json jsonb,
  archetype text,
  needs_review boolean DEFAULT false,
  generation_version integer DEFAULT 2,
  published_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_websites_user_id ON websites(user_id);
CREATE INDEX idx_websites_handle ON websites(handle);
CREATE INDEX idx_websites_custom_domain ON websites(custom_domain);
CREATE INDEX idx_websites_status ON websites(status);

ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own website" ON websites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Published websites are public"
  ON websites FOR SELECT USING (status = 'published');

-- ============================================================
-- WEBSITE IMAGES (user-uploaded image tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS website_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  block_id text,
  file_size_bytes integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE website_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own images" ON website_images FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- CONTACT FORM SUBMISSIONS (from generated websites)
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  website_handle text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  service_interest text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
-- Website owners can read their own submissions
CREATE POLICY "Owners read own submissions"
  ON contact_submissions FOR SELECT USING (auth.uid() = website_owner_id);
-- Public insert for form submissions (no auth required)
CREATE POLICY "Public can insert submissions"
  ON contact_submissions FOR INSERT WITH CHECK (true);

-- ============================================================
-- WEBSITE ANALYTICS (basic — detailed spec in ANALYTICS.md)
-- ============================================================
CREATE TABLE IF NOT EXISTS website_pageviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_handle text NOT NULL,
  page_path text NOT NULL DEFAULT '/',
  referrer text,
  user_agent text,
  country text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pageviews_handle_date ON website_pageviews(website_handle, created_at);
-- No RLS on inserts — public tracking
-- Reads restricted to website owner (handled in API layer, not RLS for performance)
```

---

## 11. ALL API ROUTES

| Method | Route | Description | Auth | Plan Gate |
|---|---|---|---|---|
| POST | /api/ai/compose-website | Trigger full generation | Internal secret OR user auth | Any paid plan |
| GET | /api/website | Get user's website (status + composition) | Yes | Free+ |
| PATCH | /api/website/section | Edit a section field or regenerate copy | Yes | Pro+ |
| POST | /api/website/image | Swap image for a section | Yes | Pro+ |
| POST | /api/website/publish | Publish the website live | Yes | Pro+ |
| POST | /api/website/unpublish | Take website offline | Yes | Pro+ |
| POST | /api/website/regenerate | Full website regeneration | Yes | Pro+ (counts against regen limit) |
| DELETE | /api/website | Delete website (cannot be undone) | Yes | Any |
| POST | /api/website/custom-domain | Attach a custom domain | Yes | Growth+ |
| GET | /api/website/custom-domain/status | Check DNS propagation status | Yes | Growth+ |
| POST | /api/contact-form | Submit a contact form from a generated site | Public | — |

---

## 12. CUSTOM SITE CTA COMPONENT

Used everywhere a user requests an unsupported feature.

```tsx
// src/components/website/CustomSiteCTA.tsx
"use client";

import { ExternalLink } from "lucide-react";

interface Props {
  context?: "onboarding" | "dashboard" | "editor" | "general";
  requestedFeature?: string;
}

export function CustomSiteCTA({ context = "general", requestedFeature }: Props) {
  const subject = requestedFeature
    ? `Custom website enquiry — ${requestedFeature}`
    : "Custom website enquiry";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <p className="text-sm text-white/50 uppercase tracking-wide mb-2 font-medium">Built by our team</p>
      <h3 className="font-heading text-xl text-white mb-2">
        {requestedFeature
          ? `${requestedFeature} requires a custom build`
          : "Need something more complex?"}
      </h3>
      <p className="text-white/60 text-sm mb-4">
        E-commerce stores, blogs, membership sites, and custom backends are built
        by the Zuri team. We specialise in complex builds for African businesses.
      </p>
      <a
        href={`mailto:build@zuri.com?subject=${encodeURIComponent(subject)}`}
        className="inline-flex items-center gap-2 text-gold text-sm font-medium"
      >
        Contact our team <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}
```

---

## 13. CONTACT FORM API (from generated websites)

```typescript
// src/app/api/contact-form/route.ts
// Receives form submissions from published Zuri sites
// No auth required — this is a public endpoint

export async function POST(req: Request) {
  const body = await req.json();
  const { handle, name, email, phone, message, service_interest } = body;

  // Validate
  const errors: string[] = [];
  if (!handle || typeof handle !== "string") errors.push("Invalid handle");
  if (!name || sanitizeText(name).length < 2) errors.push("Name is required");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Valid email is required");
  if (!message || sanitizeText(message).length < 5) errors.push("Message is required");
  if (message && sanitizeText(message).length > 2000) errors.push("Message too long (max 2000 chars)");

  // Basic spam protection: block if message contains multiple URLs
  const urlCount = (message ?? "").match(/https?:\/\//g)?.length ?? 0;
  if (urlCount > 2) errors.push("Message appears to be spam");

  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Find the website owner
  const { data: website } = await supabase
    .from("websites")
    .select("user_id")
    .eq("handle", sanitizeText(handle))
    .eq("status", "published")
    .single();

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  // Rate limit: max 10 submissions per IP per hour
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  // (implement simple Supabase-based rate limiting or use Vercel KV if available)

  // Save submission
  await supabase.from("contact_submissions").insert({
    website_owner_id: website.user_id,
    website_handle: sanitizeText(handle),
    name: sanitizeText(name),
    email: email.toLowerCase().trim(),
    phone: phone ? sanitizeText(phone).slice(0, 30) : null,
    message: sanitizeText(message),
    service_interest: service_interest ? sanitizeText(service_interest).slice(0, 100) : null,
    ip_address: ip,
  });

  // Send email notification to website owner via Resend
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", website.user_id)
    .single();

  if (profile?.email) {
    await sendContactFormNotification({
      ownerEmail: profile.email,
      ownerName: profile.full_name,
      senderName: sanitizeText(name),
      senderEmail: email.toLowerCase().trim(),
      message: sanitizeText(message),
      handle: sanitizeText(handle),
    });
  }

  return NextResponse.json({ success: true });
}
```

---

## 14. PLAN-GATED FEATURES IN EDITOR

| Feature | Free | Pro | Growth | Premium |
|---|---|---|---|---|
| Preview website (internal URL) | Yes | Yes | Yes | Yes |
| Publish to handle.zuri.com | No | Yes | Yes | Yes |
| Custom domain | No | No | Yes | Yes |
| Edit section text | No | Yes | Yes | Yes |
| Swap images | No | Yes | Yes | Yes |
| Regenerate section copy | No | Yes (1/mo total) | Yes (3/mo total) | Yes (unlimited) |
| Reorder sections | No | No | Yes | Yes |
| Add/remove optional sections | No | No | Yes | Yes |
| Edit global palette | No | No | Yes | Yes |
| Full website regeneration | No | No (counts as regen) | Yes (counts as regen) | Yes (unlimited) |
| Remove Zuri footer badge | No | No | Yes | Yes |
| Multiple websites | No | 1 | 1 | 3 |

---

## 15. ERROR HANDLING — COMPLETE MAP

| Scenario | System Action | User-Facing Message |
|---|---|---|
| Pass 1 Gemini returns invalid JSON | Retry up to 3 times with stricter prompt | Silent retry |
| Pass 1 fails all 3 retries | Mark job as failed, set status = failed | "Website generation failed. [Retry]" on dashboard |
| Pass 2 fails all retries | Use Pass 1 structure + placeholder-free generic copy for this archetype | Website generates with fallback copy, needs_review = true, admin alerted |
| Pass 3 critique confidence < 0.5 | Apply all patches, needs_review = true | No message — admin reviews internally |
| Patch application fails | Skip patches, save composition as-is with needs_review = true | No message to user |
| Image resolver returns null (all sources failed) | Use archetype fallback image at /images/fallbacks/[archetype].jpg | No error shown — fallback renders |
| Unsplash API rate limit hit | Fall through to Pexels immediately | Silent |
| Pexels API rate limit hit | Use archetype fallback | Silent |
| Validation errors on compose | Save anyway with needs_review = true, log errors | Dashboard shows "Needs review" badge (internal) |
| Validation errors on publish | Block publish | "Your website has issues that need to be fixed before publishing. [View issues]" |
| Publish attempt on Free plan | Return 403 | "Upgrade to Pro to publish your website. [Upgrade]" |
| Publish attempt with no website | Return 404 | "No website found. Generate your website first." |
| Section edit with invalid blockId | Return 400 | "Something went wrong. Please refresh and try again." |
| Section edit value exceeds max length | Return 400 | "This field can be a maximum of [X] characters." |
| Image upload wrong file type | Return 400 | "Please upload a JPEG, PNG, or WebP image." |
| Image upload exceeds 10MB | Return 400 | "Image must be smaller than 10MB." |
| Image upload fails (Supabase Storage) | Return 500 | "Image upload failed. Please try again." |
| Custom domain: DNS not propagated | Return pending status | "DNS is propagating. This can take up to 48 hours." |
| Custom domain already used by another user | Return 409 | "This domain is already connected to another Zuri site." |
| Contact form: spam detected | Return 400 silently | "Message could not be sent. Please try again." |
| Contact form: website not published | Return 404 | "This website is not currently active." |
| Contact form: rate limit exceeded | Return 429 | "Too many submissions. Please wait and try again." |
| Website regeneration limit reached | Return 403 | "You've used all your regenerations this month. Upgrade for more or wait until [date]." |
| Handle already taken on publish | Should not happen (handle locked at creation) — if it does, return 409 | "Handle conflict. Please contact support." |
| Site suspended (plan expired) | Serve suspension page at the handle URL | "This website is temporarily unavailable. The owner needs to renew their plan." |
| Generation job times out (>90s) | Mark as failed, alert admin | "Website generation is taking longer than expected. We'll retry automatically." |
| Composition JSON too large (>500KB) | Trim resolved_images to blur_url only, strip image metadata | Silent optimisation |
| User tries to access another user's preview | Return 404 (not 403 — don't reveal existence) | 404 page |
| BlockId not in registry during render | Skip rendering that block, log error | Block simply doesn't render — site still shows |
| Placeholder text detected in validation | Set needs_review = true | "Some sections may need your review." in editor |
| XSS attempt in section edit | Sanitize server-side, save clean text | No error — clean text is saved |

---

## 16. ENVIRONMENT VARIABLES REQUIRED

```env
UNSPLASH_ACCESS_KEY=...
PEXELS_API_KEY=...
NEXT_PUBLIC_ROOT_DOMAIN=zuri.com
GEMINI_API_KEY=...
INTERNAL_API_SECRET=...  # from ONBOARDING.md
```

---

## 17. IMPLEMENTATION ORDER

1. `src/lib/website/archetypes.ts` — archetype definitions + resolver
2. `src/lib/website/composition-validator.ts` — validator + export BLOCK_REGISTRY_KEYS
3. `src/components/website-blocks/block-registry.ts` — full block registry
4. `src/lib/website/image-resolver.ts` — Unsplash + Pexels + fallback
5. `src/lib/website/composition-pipeline.ts` — full 3-pass pipeline
6. Database migration (schema section above)
7. `middleware.ts` — subdomain routing
8. `src/app/sites/[handle]/page.tsx` — published site renderer
9. `src/app/preview/[handle]/page.tsx` — internal preview
10. `src/app/api/ai/compose-website/route.ts` — updated pipeline endpoint
11. `src/app/api/website/section/route.ts` — section editor
12. `src/app/api/website/image/route.ts` — image swap
13. `src/app/api/website/publish/route.ts` — publish
14. `src/app/api/contact-form/route.ts` — contact form receiver
15. `src/components/website/CustomSiteCTA.tsx`
16. Dashboard "website" card showing generation status + preview link
17. Full website editor page at `/dashboard/website/edit`
18. Add fallback images to `/public/images/fallbacks/[archetype].jpg` (8 images needed)

## 18. FALLBACK IMAGES REQUIRED

Create or source 8 fallback images (2400×1600px, saved as JPEG, <500KB each):
```
/public/images/fallbacks/warm-sensory.jpg
/public/images/fallbacks/authority-minimal.jpg
/public/images/fallbacks/luxury-aspirational.jpg
/public/images/fallbacks/editorial-bold.jpg
/public/images/fallbacks/clean-modern.jpg
/public/images/fallbacks/portfolio-dramatic.jpg
/public/images/fallbacks/community-vibrant.jpg
/public/images/fallbacks/trust-professional.jpg
```
These must be sourced from Unsplash (licensed for commercial use, no attribution required on download) and committed to the repo. They are the last resort if all API calls fail.