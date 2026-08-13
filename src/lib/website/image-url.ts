import type { DesignArchetype, ResolvedImage } from "@/types/website";
import { cloudinaryUrl } from "@/lib/website/cloudinary-url";

/**
 * Last-resort Cloudinary zuri-stock public ids — now a SMALL POOL per
 * archetype instead of a single image.
 *
 * FIXED (2026-08): previously each archetype had exactly one fallback
 * image, so any website whose category_images coverage was thin for a
 * given slot_type (confirmed in production: luxury-aspirational's
 * founder/gallery_1/gallery_2/gallery_3 slots all fell back here
 * simultaneously) rendered the IDENTICAL photo repeated across every
 * unresolved slot on the page — visually indistinguishable from a
 * broken/static site even though the underlying HTML was correct.
 *
 * This does not fix the root cause (thin category_images coverage for
 * some archetype/slot combinations — a real data-seeding gap, tracked
 * separately), but it means repeated fallbacks on one page are no longer
 * visually identical to each other, and different businesses in the same
 * archetype are less likely to look like carbon copies.
 *
 * Each array has at least 3 entries. Where only 1-2 real distinct photos
 * were available for an archetype at the time this was written, the pool
 * intentionally reuses the single best hero shot from LIBRARY_CLOUDINARY_
 * PUBLIC_IDS's cross-archetype set as filler — never ideal, but strictly
 * better than exact repetition. Replace with real archetype-specific
 * photos as category_images coverage improves (see Cloudinary backfill
 * follow-up).
 */
const ARCHETYPE_FALLBACK_POOLS: Record<DesignArchetype, string[]> = {
  "warm-sensory": [
    "zuri-stock/warm-sensory/hero/glenov-brankovic-nulJA9vxJII-unsplash",
    "zuri-stock/portfolio-dramatic/hero/christopher-campbell-Xo4YvBp6IBM-unsplash",
    "zuri-stock/clean-modern/hero/anthony-riera--ZZ7I31c0B8-unsplash",
  ],
  "authority-minimal": [
    "zuri-stock/authority-minimal/hero/kate-sade-2zZp12ChxhU-unsplash",
    "zuri-stock/trust-professional/hero/pexels-cedric-fauntleroy-4266934",
    "zuri-stock/clean-modern/hero/anthony-riera--ZZ7I31c0B8-unsplash",
  ],
  "luxury-aspirational": [
    "zuri-stock/luxury-aspirational/hero/franco-debartolo-Q6-CbUd2n3k-unsplash",
    "zuri-stock/editorial-bold/hero/alyssa-strohmann-TS--uNw-JqE-unsplash",
    "zuri-stock/portfolio-dramatic/hero/christopher-campbell-Xo4YvBp6IBM-unsplash",
  ],
  "editorial-bold": [
    "zuri-stock/editorial-bold/hero/alyssa-strohmann-TS--uNw-JqE-unsplash",
    "zuri-stock/luxury-aspirational/hero/franco-debartolo-Q6-CbUd2n3k-unsplash",
    "zuri-stock/portfolio-dramatic/hero/christopher-campbell-Xo4YvBp6IBM-unsplash",
  ],
  "clean-modern": [
    "zuri-stock/clean-modern/hero/anthony-riera--ZZ7I31c0B8-unsplash",
    "zuri-stock/authority-minimal/hero/kate-sade-2zZp12ChxhU-unsplash",
    "zuri-stock/trust-professional/hero/pexels-cedric-fauntleroy-4266934",
  ],
  "portfolio-dramatic": [
    "zuri-stock/portfolio-dramatic/hero/christopher-campbell-Xo4YvBp6IBM-unsplash",
    "zuri-stock/editorial-bold/hero/alyssa-strohmann-TS--uNw-JqE-unsplash",
    "zuri-stock/luxury-aspirational/hero/franco-debartolo-Q6-CbUd2n3k-unsplash",
  ],
  "community-vibrant": [
    "zuri-stock/community-vibrant/hero/fitnish-media-UM8I5D5Z4fo-unsplash",
    "zuri-stock/warm-sensory/hero/glenov-brankovic-nulJA9vxJII-unsplash",
    "zuri-stock/clean-modern/hero/anthony-riera--ZZ7I31c0B8-unsplash",
  ],
  "trust-professional": [
    "zuri-stock/trust-professional/hero/pexels-cedric-fauntleroy-4266934",
    "zuri-stock/authority-minimal/hero/kate-sade-2zZp12ChxhU-unsplash",
    "zuri-stock/clean-modern/hero/anthony-riera--ZZ7I31c0B8-unsplash",
  ],
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

/** Simple deterministic string hash — same seed always maps to the same
 *  pool index, so a given slot on a given website is stable across
 *  repeated calls/renders, but different slots get different images. */
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Returns a fallback image for the archetype. Pass `seed` (e.g. the slot
 * name like "gallery_2" or "founder") so that MULTIPLE unresolved slots on
 * the same page deterministically get DIFFERENT images from the pool
 * instead of all collapsing to the same single fallback photo — this was
 * the direct cause of a production bug where every non-hero image slot on
 * a site rendered as one repeated photo (see module comment above).
 *
 * Without a seed, falls back to the pool's first entry (preserves prior
 * behavior for any caller that doesn't care about per-slot variation,
 * e.g. a generic "show me any archetype photo" use case).
 */
export function getArchetypeFallback(
  archetype: DesignArchetype,
  seed?: string
): ResolvedImage {
  const pool =
    ARCHETYPE_FALLBACK_POOLS[archetype] ??
    ARCHETYPE_FALLBACK_POOLS["clean-modern"];

  const publicId = seed ? pool[hashSeed(seed) % pool.length] : pool[0];

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