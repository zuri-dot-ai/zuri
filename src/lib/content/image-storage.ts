import type { SupabaseClient } from "@supabase/supabase-js";

export const GENERATED_IMAGES_BUCKET = "generated-images";

export async function ensureGeneratedImagesBucket(
  service: SupabaseClient
): Promise<{
  existed: boolean;
  created: boolean;
  error: string | null;
}> {
  const listed = await service.storage.listBuckets();
  if (listed.error) {
    return { existed: false, created: false, error: listed.error.message };
  }

  const bucketIds = (listed.data ?? []).map((b) => b.id);
  if (bucketIds.includes(GENERATED_IMAGES_BUCKET)) {
    return { existed: true, created: false, error: null };
  }

  const created = await service.storage.createBucket(GENERATED_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  if (created.error) {
    if (/already exists|duplicate/i.test(created.error.message)) {
      return { existed: true, created: false, error: null };
    }
    return { existed: false, created: false, error: created.error.message };
  }

  return { existed: false, created: true, error: null };
}

export async function uploadImageToStorage(
  supabase: SupabaseClient,
  userId: string,
  base64Image: string,
  formatType: string
): Promise<string> {
  const buffer = Buffer.from(base64Image, "base64");

  if (buffer.byteLength > 10 * 1024 * 1024) {
    throw new Error("Generated image exceeds 10MB storage limit");
  }

  const ensure = await ensureGeneratedImagesBucket(supabase);
  if (ensure.error) {
    console.error("generated-images bucket missing:", ensure.error);
    throw new Error("Image storage is temporarily unavailable");
  }

  const fileName = `${userId}/generated/${formatType}-${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from(GENERATED_IMAGES_BUCKET)
    .upload(fileName, buffer, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "31536000",
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from(GENERATED_IMAGES_BUCKET).getPublicUrl(data.path);

  return publicUrl;
}
