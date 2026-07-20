// Curated category_images library helpers (docs/02_WEBSITE_BUILDER.md §3.3)

import type { DesignArchetype } from "@/lib/website/archetypes";

export const CATEGORY_IMAGES_BUCKET = "category-images";

export const DESIGN_ARCHETYPES = [
  "warm-sensory",
  "authority-minimal",
  "luxury-aspirational",
  "editorial-bold",
  "clean-modern",
  "portfolio-dramatic",
  "community-vibrant",
  "trust-professional",
] as const satisfies readonly DesignArchetype[];

export const CATEGORY_SLOT_TYPES = [
  "hero",
  "about",
  "gallery",
  "work",
  "before_after",
  "property",
  "founder",
  "case_study",
] as const;

export type CategorySlotType = (typeof CATEGORY_SLOT_TYPES)[number];

export function isDesignArchetype(value: string): value is DesignArchetype {
  return (DESIGN_ARCHETYPES as readonly string[]).includes(value);
}

export function isCategorySlotType(value: string): value is CategorySlotType {
  return (CATEGORY_SLOT_TYPES as readonly string[]).includes(value);
}

/** e.g. "gallery_1" → "gallery", "before_after_2" → "before_after", "hero" → "hero" */
export function normalizeSlotType(slot: string): CategorySlotType | string {
  const raw = slot.trim().toLowerCase();
  if (isCategorySlotType(raw)) return raw;

  if (
    raw === "before" ||
    raw === "after" ||
    raw.startsWith("before_") ||
    raw.startsWith("after_")
  ) {
    return "before_after";
  }

  const withoutIndex = raw.replace(/_\d+$/, "");
  if (isCategorySlotType(withoutIndex)) return withoutIndex;

  const sorted = [...CATEGORY_SLOT_TYPES].sort((a, b) => b.length - a.length);
  for (const known of sorted) {
    if (raw === known || raw.startsWith(`${known}_`)) return known;
  }

  return withoutIndex || raw;
}

/** Object path inside the `category-images` bucket. */
export function buildCategoryImagePath(
  archetype: DesignArchetype,
  slotType: CategorySlotType,
  filename: string
): string {
  return `${archetype}/${slotType}/${filename}`;
}

export function parseTags(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(/[,#\n]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 40)
    ),
  ];
}
