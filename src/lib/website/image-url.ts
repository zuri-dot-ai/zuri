import type { DesignArchetype, ResolvedImage } from "@/types/website";

/** Last-resort static fallback — Unsplash URLs allowed by CSP (never picsum). */
const ARCHETYPE_FALLBACK_URLS: Record<DesignArchetype, string> = {
  "warm-sensory":
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=800&fit=crop",
  "authority-minimal":
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=800&fit=crop",
  "luxury-aspirational":
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&h=800&fit=crop",
  "editorial-bold":
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=800&fit=crop",
  "clean-modern":
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&h=800&fit=crop",
  "portfolio-dramatic":
    "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&h=800&fit=crop",
  "community-vibrant":
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=800&fit=crop",
  "trust-professional":
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=800&fit=crop",
};

/** Extra Unsplash pool for curated library display when DB rows still use picsum. */
const LIBRARY_UNSPLASH_POOL = [
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&h=700&fit=crop",
  "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=900&h=700&fit=crop",
];

export function getArchetypeFallback(archetype: DesignArchetype): ResolvedImage {
  return {
    url:
      ARCHETYPE_FALLBACK_URLS[archetype] ??
      ARCHETYPE_FALLBACK_URLS["clean-modern"],
    source: "fallback",
    width: 1200,
    height: 800,
    alt: `${archetype} fallback`,
  };
}

/** True when a URL is empty, picsum, or a missing local fallback path. */
export function isBrokenImageUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true;
  const u = url.trim().toLowerCase();
  if (u.includes("picsum.photos")) return true;
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
 * Library/curated rows were often seeded with picsum — blocked by app CSP.
 * Rewrite to Unsplash so the editor Library tab can render thumbnails.
 */
export function sanitizeLibraryImageUrl(
  url: string | null | undefined,
  archetype: DesignArchetype | string | null | undefined,
  index = 0
): string {
  if (!isBrokenImageUrl(url)) return String(url);
  const arch = (archetype as DesignArchetype) || "clean-modern";
  if (index <= 0) return getArchetypeFallback(arch).url;
  return LIBRARY_UNSPLASH_POOL[index % LIBRARY_UNSPLASH_POOL.length];
}
