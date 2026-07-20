import type { SupabaseClient } from "@supabase/supabase-js";

export const WEBSITE_IMAGES_BUCKET = "website-images";

/**
 * Ensure the public website-images storage bucket exists.
 * Migration 20260720_website_images_storage.sql creates it; production
 * often hasn't applied that migration yet → "Bucket not found" on upload.
 */
export async function ensureWebsiteImagesBucket(
  service: SupabaseClient
): Promise<{
  existed: boolean;
  created: boolean;
  bucketIds: string[];
  error: string | null;
}> {
  const listed = await service.storage.listBuckets();
  if (listed.error) {
    return {
      existed: false,
      created: false,
      bucketIds: [],
      error: listed.error.message,
    };
  }

  const bucketIds = (listed.data ?? []).map((b) => b.id);
  if (bucketIds.includes(WEBSITE_IMAGES_BUCKET)) {
    return { existed: true, created: false, bucketIds, error: null };
  }

  const created = await service.storage.createBucket(WEBSITE_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  if (created.error) {
    // Race: another request created it
    if (/already exists|duplicate/i.test(created.error.message)) {
      return { existed: true, created: false, bucketIds, error: null };
    }
    return {
      existed: false,
      created: false,
      bucketIds,
      error: created.error.message,
    };
  }

  return {
    existed: false,
    created: true,
    bucketIds: [...bucketIds, WEBSITE_IMAGES_BUCKET],
    error: null,
  };
}
