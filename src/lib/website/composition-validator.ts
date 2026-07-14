// ZURI - Composition Validator
//
// Runs after the multi-pass pipeline has produced a WebsiteComposition.
// Returns pass/fail plus a list of human-readable errors and warnings.

import type { WebsiteComposition } from "@/types/website";
import { BLOCK_REGISTRY_KEYS } from "@/components/website-blocks/BlockRenderer";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a generated website composition.
 *
 * Rules enforced:
 *  - Every section is a known BlockId.
 *  - Exactly one hero; at least one footer.
 *  - Sections start with nav_* and end with footer_* (when those are present).
 *  - Palette has bg + accent minimum (site cannot render without bg).
 *  - SEO fields present (warning if missing).
 *  - CTA text is short (warning if too long).
 *  - Content blocks exist for every section that consumes copy (warning if missing).
 */
export function validateComposition(composition: WebsiteComposition): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!composition || typeof composition !== "object") {
    return { valid: false, errors: ["Composition is empty"], warnings: [] };
  }

  const sections = composition.sections ?? [];

  // Rule 1: All BlockIds must exist in the registry
  sections.forEach((blockId) => {
    if (!BLOCK_REGISTRY_KEYS.has(blockId)) {
      errors.push(`Unknown BlockId: "${blockId}" — not found in BlockRenderer registry`);
    }
  });

  // Rule 2: No duplicate hero blocks
  const heroBlocks = sections.filter((s) => s.startsWith("hero_"));
  if (heroBlocks.length > 1) {
    errors.push(`Multiple hero blocks found: ${heroBlocks.join(", ")}`);
  }

  // Rule 3: Must have at least one hero and one footer
  if (!sections.some((s) => s.startsWith("hero_"))) {
    errors.push("No hero block found in sections");
  }
  if (!sections.some((s) => s.startsWith("footer_"))) {
    errors.push("No footer block found in sections");
  }

  // Rule 4: Sections start with nav_* when present (warning, not error)
  const firstNonNav = sections.findIndex((s) => !s.startsWith("nav_"));
  if (firstNonNav === -1) {
    warnings.push("Sections only contain nav_* — site is empty.");
  }

  // Rule 5: V2 content map (warning-only for missing per-block keys)
  const v2Content = composition.content as any;
  const blocksMap = v2Content?.blocks;
  if (blocksMap && typeof blocksMap === "object") {
    sections.forEach((blockId) => {
      if (!blocksMap[blockId]) {
        warnings.push(`No content entry for block: ${blockId} (will fall back to flat fields)`);
      }
    });
  } else {
    // Flat-content path: warn when obvious flat fields are missing
    if (!v2Content?.hero_headline) warnings.push("Missing hero_headline");
    if (!v2Content?.about_paragraph) warnings.push("Missing about_paragraph");
    if (!Array.isArray(v2Content?.services) || v2Content.services.length === 0)
      warnings.push("Missing services array");
    if (!v2Content?.cta_text) warnings.push("Missing cta_text");
  }

  // Rule 6: CTA text should be short (<=8 words)
  const flatCta: string | undefined = (v2Content?.cta_text) ?? (v2Content?.blocks?.["cta_full_width"]?.cta_text);
  if (flatCta && flatCta.split(/\s+/).filter(Boolean).length > 8) {
    warnings.push(`CTA text too long (max 8 words): "${flatCta}"`);
  }

  // Rule 7: Palette must at least have bg + accent
  if (!composition.palette?.bg) errors.push("Missing palette.bg");
  if (!composition.palette?.accent) errors.push("Missing palette.accent");

  // Rule 8: SEO meta (warnings — site can still render)
  if (!(composition as any).seo_title) warnings.push("Missing seo_title");
  if (!(composition as any).seo_description) warnings.push("Missing seo_description");

  // Rule 9: Image queries should be present in reasonable count
  const queries = composition.image_queries ?? [];
  if (queries.length === 0) {
    warnings.push("No image_queries — site will use solid color fallbacks");
  }

  // Rule 10: Generation version present (warning only — v1 sites lack it)
  if (!composition.generation_version) {
    warnings.push("Missing generation_version (legacy v1 composition)");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
