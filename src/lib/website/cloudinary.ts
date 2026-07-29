import { v2 as cloudinaryApi } from "cloudinary";

// Re-export URL helpers for server callers that already import from this module.
export {
  ZURI_TRANSFORMS,
  cloudinaryUrl,
} from "@/lib/website/cloudinary-url";

/** True when all Cloudinary credentials needed for uploads are present. */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

let configured = false;
function getCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured");
  }
  if (!configured) {
    cloudinaryApi.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinaryApi;
}

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  width: number;
  height: number;
}

/**
 * Server-side upload — used by `POST /api/onboarding/upload-image` (user
 * uploads, pre- and post-signup) and by the offline stock-seeding scripts
 * (kept outside this repo per docs §5, referenced here only for the shared
 * folder-naming convention).
 */
export async function uploadImageToCloudinary(
  fileBuffer: Buffer,
  folder: string
): Promise<CloudinaryUploadResult> {
  const cloudinary = getCloudinary();

  const result = await new Promise<{
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
  }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve({
          public_id: uploadResult.public_id,
          secure_url: uploadResult.secure_url,
          width: uploadResult.width,
          height: uploadResult.height,
        });
      }
    );
    uploadStream.end(fileBuffer);
  });

  return {
    publicId: result.public_id,
    url: result.secure_url,
    width: result.width,
    height: result.height,
  };
}
