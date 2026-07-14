// ZURI - Smart Image Resolver
//
// Given a composition's image queries + an archetype spec, resolves the best
// photo for each query through fallback chain:
//   1. Zuri curated library (Supabase — Phase 2)
//   2. Unsplash (with quality filters)
//   3. Pexels
//   4. Archetype fallback (solid color image)

import type { ArchetypeSpec } from "./archetypes";
import type { WebsiteComposition, ResolvedImage } from "@/types/website";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || "";
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";

/** Blocks that typically pull a feature/background image. */
const IMAGE_CONSUMING_BLOCKS = new Set<string>([
  "hero_fullscreen",
  "hero_split",
  "hero_floating_card",
  "about_founder",
  "case_study_spotlight",
  "cta_split_visual",
]);

/**
 * Append a small style + location variation to a raw image query
 * to keep results on-brief and African-context aware.
 */
function enrichQuery(query: string, spec: ArchetypeSpec): string {
  const location = spec.image_location_keywords[0] || "African";
  const style = spec.image_style_keywords[0] || "";
  const cleaned = query.replace(/\s+/g, " ").trim();
  // Cap to 5 components to avoid suffocating Unsplash
  return [cleaned, location, style].filter(Boolean).join(" ").slice(0, 200);
}

/**
 * Resolve every image query in a composition in parallel.
 * Always returns the same number of images as queries (using fallback when
 * a source returns null).
 */
export async function resolveImages(
  composition: Partial<WebsiteComposition>,
  spec: ArchetypeSpec
): Promise<Partial<WebsiteComposition>> {
  const sections = (composition.sections as string[]) || [];
  const imageBlocks = sections.filter((s) => IMAGE_CONSUMING_BLOCKS.has(s));
  const queries = (composition.image_queries as string[]) || [];

  // If composition provides no queries, synthesize one per image block
  const effectiveQueries =
    queries.length > 0 ? queries : imageBlocks.map(() => `${spec.archetype} background`);

  const enrichedQueries = effectiveQueries.map((q) => enrichQuery(q, spec));

  // Resolve in parallel
  const resolved = await Promise.all(
    enrichedQueries.map((q) => resolveImage(q, spec))
  );

  // Flat URL list (legacy site.images compatibility)
  const urls = resolved.map((r) => r.url);

  return {
    ...composition,
    resolved_images: resolved,
    images: urls,
  } as Partial<WebsiteComposition>;
}

async function resolveImage(query: string, spec: ArchetypeSpec): Promise<ResolvedImage> {
  // 1. Curated library (no-op stub for now)
  const curated = await queryCuratedLibrary(query, spec.archetype);
  if (curated) return curated;

  // 2. Unsplash (with quality filters)
  if (UNSPLASH_ACCESS_KEY) {
    const unsplash = await queryUnsplash(query, spec);
    if (unsplash) return unsplash;
  }

  // 3. Pexels
  if (PEXELS_API_KEY) {
    const pexels = await queryPexels(query);
    if (pexels) return pexels;
  }

  // 4. Archetype fallback (solid color)
  return getArchetypeFallback(spec.archetype, query);
}

async function queryUnsplash(query: string, spec: ArchetypeSpec): Promise<ResolvedImage | null> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&content_filter=high`,
      {
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
        next: { revalidate: 86400 },
      }
    );
    const data = await res.json();
    if (!Array.isArray(data.results) || data.results.length === 0) return null;

    const qualified = data.results.filter(
      (p: any) => (p.width || 0) >= 2000 && (p.likes || 0) >= 5
    );
    const pool = qualified.length ? qualified : data.results;
    const photo = pool[0];
    return {
      url: photo.urls?.regular || photo.urls?.small || "",
      blur_url: photo.urls?.thumb || photo.urls?.small || "",
      alt: photo.alt_description || query,
      credit: photo.user?.name ? `Photo by ${photo.user.name} on Unsplash` : "Unsplash",
      source: "unsplash",
      width: photo.width || 2400,
      height: photo.height || 1600,
    };
  } catch {
    return null;
  }
}

async function queryPexels(query: string): Promise<ResolvedImage | null> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
      {
        headers: { Authorization: PEXELS_API_KEY },
        next: { revalidate: 86400 },
      }
    );
    const data = await res.json();
    if (!Array.isArray(data.photos) || data.photos.length === 0) return null;
    const photo = data.photos[0];
    return {
      url: photo.src?.large2x || photo.src?.large || photo.src?.original || "",
      blur_url: photo.src?.small || photo.src?.tiny || "",
      alt: photo.alt || query,
      credit: `Photo by ${photo.photographer} on Pexels`,
      source: "pexels",
      width: photo.width || 2400,
      height: photo.height || 1600,
    };
  } catch {
    return null;
  }
}

async function queryCuratedLibrary(
  _query: string,
  _archetype: string
): Promise<ResolvedImage | null> {
  // TODO: Query Supabase curated_images table once the curated library is built.
  // For now, returns null — falls through to Unsplash.
  return null;
}

function getArchetypeFallback(archetype: string, query: string): ResolvedImage {
  return {
    url: `/images/fallbacks/${archetype}.jpg`,
    blur_url: `/images/fallbacks/${archetype}-blur.jpg`,
    alt: query || `${archetype} background`,
    credit: "Zuri",
    source: "fallback",
    width: 2400,
    height: 1600,
  };
}
