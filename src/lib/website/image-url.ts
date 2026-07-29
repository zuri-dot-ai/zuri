import type { DesignArchetype, ResolvedImage } from "@/types/website";
import { cloudinaryUrl } from "@/lib/website/cloudinary-url";

/** Last-resort Cloudinary zuri-stock public ids (one hero per archetype). */
const ARCHETYPE_FALLBACK_PUBLIC_IDS: Record<DesignArchetype, string> = {
  "warm-sensory":
    "zuri-stock/warm-sensory/hero/glenov-brankovic-nulJA9vxJII-unsplash",
  "authority-minimal":
    "zuri-stock/authority-minimal/hero/kate-sade-2zZp12ChxhU-unsplash",
  "luxury-aspirational":
    "zuri-stock/luxury-aspirational/hero/franco-debartolo-Q6-CbUd2n3k-unsplash",
  "editorial-bold":
    "zuri-stock/editorial-bold/hero/alyssa-strohmann-TS--uNw-JqE-unsplash",
  "clean-modern":
    "zuri-stock/clean-modern/hero/anthony-riera--ZZ7I31c0B8-unsplash",
  "portfolio-dramatic":
    "zuri-stock/portfolio-dramatic/hero/christopher-campbell-Xo4YvBp6IBM-unsplash",
  "community-vibrant":
    "zuri-stock/community-vibrant/hero/fitnish-media-UM8I5D5Z4fo-unsplash",
  "trust-professional":
    "zuri-stock/trust-professional/hero/pexels-cedric-fauntleroy-4266934",
};

/** Extra Cloudinary pool for curated library display when DB rows still use picsum/Unsplash. */
const LIBRARY_CLOUDINARY_PUBLIC_IDS = [
  "zuri-stock/clean-modern/hero/anthony-riera--ZZ7I31c0B8-unsplash",
  "zuri-stock/authority-minimal/hero/kate-sade-2zZp12ChxhU-unsplash",
  "zuri-stock/luxury-aspirational/hero/franco-debartolo-Q6-CbUd2n3k-unsplash",
  "zuri-stock/editorial-bold/hero/alyssa-strohmann-TS--uNw-JqE-unsplash",
  "zuri-stock/warm-sensory/hero/glenov-brankovic-nulJA9vxJII-unsplash",
  "zuri-stock/portfolio-dramatic/hero/christopher-campbell-Xo4YvBp6IBM-unsplash",
];

function stockUrl(publicId: string, transform: "hero" | "card" = "hero"): string {
  const url = cloudinaryUrl(publicId, transform);
  // Dev/misconfig safety — templates ship against this cloud.
  if (url.includes("res.cloudinary.com/undefined/")) {
    return url.replace(
      "res.cloudinary.com/undefined/",
      "res.cloudinary.com/dzuvmw4l/"
    );
  }
  return url;
}

export function getArchetypeFallback(archetype: DesignArchetype): ResolvedImage {
  const publicId =
    ARCHETYPE_FALLBACK_PUBLIC_IDS[archetype] ??
    ARCHETYPE_FALLBACK_PUBLIC_IDS["clean-modern"];
  return {
    url: stockUrl(publicId, "hero"),
    source: "fallback",
    width: 1600,
    height: 900,
    alt: `${archetype} fallback`,
  };
}

/** True when a URL is empty, picsum, Unsplash, or a missing local fallback path. */
export function isBrokenImageUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true;
  const u = url.trim().toLowerCase();
  if (u.includes("picsum.photos")) return true;
  if (u.includes("images.unsplash.com") || u.includes("source.unsplash.com")) {
    return true;
  }
  if (u.includes("/images/fallbacks/")) return true;
  if (
    !/^https?:\/\//i.test(u) &&
    !u.startsWith("data:") &&
    !u.startsWith("blob:")
  ) {
    return true;
  }
  return false;
}

/**
 * Library/curated rows were often seeded with picsum or Unsplash — rewrite to
 * Cloudinary so the editor Library tab can render thumbnails under CSP.
 */
export function sanitizeLibraryImageUrl(
  url: string | null | undefined,
  archetype: DesignArchetype | string | null | undefined,
  index = 0
): string {
  if (!isBrokenImageUrl(url)) return String(url);
  const arch = (archetype as DesignArchetype) || "clean-modern";
  if (index <= 0) return getArchetypeFallback(arch).url;
  const publicId =
    LIBRARY_CLOUDINARY_PUBLIC_IDS[index % LIBRARY_CLOUDINARY_PUBLIC_IDS.length];
  return stockUrl(publicId, "card");
}
