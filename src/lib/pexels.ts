/** Search Pexels for a single short video clip URL (for animated content) */
export async function pexelsVideoSearch(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(
        query
      )}&per_page=1&orientation=portrait`,
      {
        headers: { Authorization: process.env.PEXELS_API_KEY! },
        next: { revalidate: 86400 },
      }
    );
    const data = await res.json();
    const files = data?.videos?.[0]?.video_files ?? [];
    // Prefer an HD-ish mp4
    const file =
      files.find((f: { quality: string }) => f.quality === "hd") ?? files[0];
    return file?.link ?? null;
  } catch {
    return null;
  }
}