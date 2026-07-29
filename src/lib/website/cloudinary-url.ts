/**
 * Client-safe Cloudinary URL helpers (no Node `cloudinary` SDK / `fs`).
 * Upload APIs live in `@/lib/website/cloudinary` (server-only).
 */

// Named transform presets — defined as code constants (NOT Cloudinary
// console named transformations). See docs/00_SESSION_PROMPT_PREMIUM_OVERHAUL.md §5.
export const ZURI_TRANSFORMS = {
  hero: "c_fill,g_auto,w_1600,h_900,f_auto,q_auto:good",
  hero_mobile: "c_fill,g_auto,w_800,h_1000,f_auto,q_auto:good",
  square: "c_fill,g_auto,w_1200,h_1200,f_auto,q_auto:good",
  card: "c_fill,g_auto,w_600,h_450,f_auto,q_auto:good",
  thumb: "c_fill,g_auto,w_300,h_300,f_auto,q_auto:eco",
} as const;

export function cloudinaryUrl(
  publicId: string,
  transform: keyof typeof ZURI_TRANSFORMS
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${ZURI_TRANSFORMS[transform]}/${publicId}`;
}
