// src/lib/website/module-selector.ts
// docs/TEMPLATE_PROMPTS_V2.md §2.4 — data-driven module selection.
//
// This was previously spec'd but never implemented (confirmed by the
// 2026-08 pipeline audit). Given what data actually exists for a business,
// pick the best-fitting subset of the template's *declared* supportedModules
// (stored on the templates row — see migration
// 20260811_templates_v2_module_selector.sql), in the template's authored
// order. This is a small, cheap, deterministic decision — no Gemini call,
// no creative copywriting, matches the spec's "near-zero-latency" framing.
//
// Module inclusion is always data-driven, never random or purely stylistic
// (Session Prompt principle, restated in TEMPLATE_PROMPTS_V2.md §2.4).
// A module never half-renders with insufficient data — fully included with
// real content, or excluded entirely.

export type ModuleId =
  | "gallery"
  | "masonry-work"
  | "before-after"
  | "stats-strip"
  | "credentials-bar"
  | "class-schedule"
  | "opening-hours-cta"
  | "featured-property"
  | "case-study-spotlight"
  | "faq-accordion"
  | "founder-split";

export interface ModuleAvailableData {
  imageCount: number;
  hasBeforeAfterPair: boolean;
  hasScheduleData: boolean;
  hasPropertyData: boolean;
}

/**
 * Modules that are "always eligible" because Gemini can generate plausible
 * content for them from business context alone (no uploaded-data dependency).
 * Matches the `default: return true` branch in the spec pseudocode.
 */
const ALWAYS_ELIGIBLE: ReadonlySet<ModuleId> = new Set([
  "stats-strip",
  "credentials-bar",
  "faq-accordion",
  "founder-split",
  "opening-hours-cta",
]);

function isModuleEligible(
  moduleId: string,
  availableData: ModuleAvailableData
): boolean {
  switch (moduleId as ModuleId) {
    case "gallery":
      return availableData.imageCount >= 3;
    case "masonry-work":
      return availableData.imageCount >= 4;
    case "before-after":
      // NEVER true from stock — real uploaded pair only.
      // TEMPLATE_PROMPTS_V2.md §5.3 hard exception, enforced upstream in
      // resolveTemplateImages() as well; this is the second enforcement
      // point (module inclusion), not a substitute for the image-level fix.
      return availableData.hasBeforeAfterPair;
    case "class-schedule":
      return availableData.hasScheduleData;
    case "featured-property":
      return availableData.hasPropertyData;
    case "case-study-spotlight":
      return availableData.imageCount >= 1;
    default:
      return ALWAYS_ELIGIBLE.has(moduleId as ModuleId) || true;
  }
}

/**
 * Given a template's declared supportedModules (from the `templates` row)
 * and what real data exists for this business, return the eligible subset
 * in the template's original authored order.
 *
 * Never blocks generation — if zero modules are eligible, the template still
 * renders with a leaner section order (Graceful Degradation principle,
 * Session Prompt §4).
 */
export function selectModules(
  supportedModules: string[],
  availableData: ModuleAvailableData
): ModuleId[] {
  if (!Array.isArray(supportedModules) || supportedModules.length === 0) {
    return [];
  }

  return supportedModules.filter((moduleId) =>
    isModuleEligible(moduleId, availableData)
  ) as ModuleId[];
}

/**
 * Derives ModuleAvailableData from what the pipeline already knows at
 * Stage 2 time (before image resolution has run — this uses onboarding /
 * business-profile signals, not resolved category_images results, since
 * category_images are stock and must never satisfy hasBeforeAfterPair).
 */
export function deriveAvailableData(input: {
  uploadedImageCount: number;
  hasUploadedBeforeAfterPair: boolean;
  scheduleData?: unknown;
  propertyData?: unknown;
}): ModuleAvailableData {
  return {
    imageCount: input.uploadedImageCount,
    hasBeforeAfterPair: input.hasUploadedBeforeAfterPair === true,
    hasScheduleData: Boolean(input.scheduleData),
    hasPropertyData: Boolean(input.propertyData),
  };
}
