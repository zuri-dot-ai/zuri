/** Search Unsplash for a single best-fit landscape photo URL */
export async function unsplashSearch(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query
      )}&orientation=landscape&per_page=1`,
      {
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        },
        next: { revalidate: 86400 },
      }
    );
    const data = await res.json();
    return data?.results?.[0]?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

/** Resolve an array of image queries → array of image URLs */
export async function resolveImageQueries(queries: string[]): Promise<string[]> {
  const results = await Promise.all(queries.map((q) => unsplashSearch(q)));
  return results.filter((u): u is string => !!u);
}