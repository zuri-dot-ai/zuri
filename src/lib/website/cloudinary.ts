import { v2 as cloudinaryApi } from "cloudinary";

// Named transform presets — defined as code constants (NOT Cloudinary
// console named transformations, which were unavailable/inaccessible on
// this account tier). See docs/00_SESSION_PROMPT_PREMIUM_OVERHAUL.md §5.
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

let configured = false;
function getCloudinary() {
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
