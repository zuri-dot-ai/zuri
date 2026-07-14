"use client";

import type { WebsiteComposition, BlockId } from "@/types/website";
import type { BlockProps } from "./shared";
import { NavStandard, NavCentered, NavMinimal } from "./navigation";
import {
  HeroFullscreen, HeroSplit, HeroTypographic,
  HeroGradient, HeroFloatingCard, HeroMinimal,
} from "./heroes";
import { AboutFounder, AboutStats, AboutTimeline, AboutMission } from "./about";
import { ServicesCardGrid, ServicesListElegant, ServicesTabs, PricingTable } from "./services";
import { TestimonialsCarousel, LogoWall, CaseStudySpotlight } from "./social-proof";
import {
  CtaFullWidth, CtaSplitVisual, CtaCardCentered,
  ContactFormCard, ContactMapEmbed, WhatsappCta,
  FooterStandard, FooterMinimal, FooterColumns,
} from "./cta-contact-footer";

const REGISTRY: Record<BlockId, React.ComponentType<BlockProps>> = {
  nav_standard: NavStandard, nav_centered: NavCentered, nav_minimal: NavMinimal,
  hero_fullscreen: HeroFullscreen, hero_split: HeroSplit, hero_typographic: HeroTypographic,
  hero_gradient: HeroGradient, hero_floating_card: HeroFloatingCard, hero_minimal: HeroMinimal,
  about_founder: AboutFounder, about_stats: AboutStats, about_timeline: AboutTimeline, about_mission: AboutMission,
  services_card_grid: ServicesCardGrid, services_tabs: ServicesTabs,
  services_list_elegant: ServicesListElegant, pricing_table: PricingTable,
  testimonials_carousel: TestimonialsCarousel, logo_wall: LogoWall, case_study_spotlight: CaseStudySpotlight,
  cta_full_width: CtaFullWidth, cta_split_visual: CtaSplitVisual, cta_card_centered: CtaCardCentered,
  contact_form_card: ContactFormCard, contact_map_embed: ContactMapEmbed, whatsapp_cta: WhatsappCta,
  footer_standard: FooterStandard, footer_minimal: FooterMinimal, footer_columns: FooterColumns,
};

/** Blocks that consume a background/foreground image (used to assign image indices) */
const IMAGE_CONSUMING = new Set<string>([
  "hero_fullscreen", "hero_split", "hero_floating_card",
  "about_founder", "cta_split_visual",
]);

/**
 * Exported set of every BlockId the renderer knows about.
 * The composition validator imports this to reject unknown blocks.
 */
export const BLOCK_REGISTRY_KEYS = new Set<string>(Object.keys(REGISTRY));

/**
 * Resolve the effective content for a block. v2 compositions carry per-block
 * content under `content.blocks[blockId]`; v1 compositions used flat fields.
 * This helper produces a merged view that every block component can read
 * transparently, regardless of pipeline version.
 */
export function resolveBlockContent(
  composition: WebsiteComposition,
  blockId: string
): WebsiteComposition["content"] {
  const c: any = (composition as any).content ?? {};
  const perBlock = c.blocks?.[blockId];
  if (!perBlock) return c;
  // Per-block content overrides the flat fields when they overlap
  return { ...c, ...perBlock } as any;
}

/** Wrap a BlockProps with effective-content lookup. */
function withEffectiveContent<P extends { composition: WebsiteComposition }>(
  props: P,
  blockId: string
): P {
  const effective = resolveBlockContent(props.composition, blockId);
  return { ...props, composition: { ...props.composition, content: effective } };
}

export function BlockRenderer({ composition }: { composition: WebsiteComposition }) {
  const images = composition.images ?? [];
  let imgCursor = 0;

  return (
    <div style={{ background: composition.palette.bg, color: "#F0EEE9" }}
      className="min-h-screen font-sans">
      {composition.sections.map((id, i) => {
        const Block = REGISTRY[id];
        if (!Block) return null;
        const imageIndex = IMAGE_CONSUMING.has(id) ? imgCursor++ : 0;
        const props = withEffectiveContent({ composition, images, imageIndex }, id);
        return <Block key={`${id}-${i}`} {...props} />;
      })}
    </div>
  );
}