/** Website image-slot aspect ratios for crop UI. */

import { normalizeSlotType } from "@/lib/website/category-images";

/** Returns width/height ratio for react-easy-crop (e.g. 9/7 ≈ 1.286). */
export function getSlotAspectRatio(slot: string): number {
  const base = normalizeSlotType(slot);

  switch (base) {
    case "hero":
      return 9 / 7;
    case "about":
      return 5 / 4;
    case "gallery":
      return 1;
    case "before_after":
      return 4 / 5;
    case "work":
    case "founder":
      return 1;
    case "property":
      return 4 / 3;
    case "case_study":
      return 16 / 9;
    default:
      return 4 / 3;
  }
}
