import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  isCloudinaryConfigured,
  uploadImageToCloudinary,
} from "@/lib/website/cloudinary";
import { errorResponse } from "@/lib/security/sanitize-response";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/security/rate-limit";
import {
  getClientIp,
  hashForRateLimit,
} from "@/lib/onboarding/anonymous-session";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/agencies/apply/upload
 * Public (no auth) — IP rate-limited. Used for agency logo + portfolio images
 * during the public application flow.
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorResponse(400, "Invalid form data");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return errorResponse(400, "Missing file");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return errorResponse(400, "Please upload a JPEG, PNG, or WebP image.");
  }
  if (file.size > MAX_BYTES) {
    return errorResponse(400, "This image is too large. Please use one under 10MB.");
  }

  if (!isCloudinaryConfigured()) {
    console.error(
      "[agency-apply-upload] Cloudinary env vars missing — cannot upload"
    );
    return errorResponse(
      503,
      "Image upload is temporarily unavailable. Please try again later or skip for now."
    );
  }

  const supabase = createServiceClient();
  const ip = getClientIp(req.headers);
  const rateKey = hashForRateLimit(ip ?? "unknown");
  const rate = await checkRateLimit(supabase, rateKey, "agency:apply_upload");
  if (!rate.allowed) {
    return rateLimitExceededResponse(rate.resetIn);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadImageToCloudinary(
      buffer,
      "zuri-agency-applications"
    );

    return NextResponse.json({
      success: true,
      publicId: result.publicId,
      url: result.url,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error("[agency-apply-upload] Cloudinary upload failed:", err);
    return errorResponse(
      500,
      "Upload failed. Please try again or skip for now."
    );
  }
}
