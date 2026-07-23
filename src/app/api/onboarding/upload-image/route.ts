import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { uploadImageToCloudinary } from "@/lib/website/cloudinary";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB — matches Cloudinary's own limit
const MAX_UPLOADS_PER_SESSION = 20;

/**
 * POST /api/onboarding/upload-image (docs/01_ONBOARDING_V2.md §5.2)
 * Public route (no auth) — protected by a valid, non-expired anonymous
 * session token, a per-session upload cap, and server-side file validation
 * (client-side checks in PhotoUploadZone are UX-only, never trusted alone).
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  const slot = form.get("slot");
  const sessionToken = form.get("sessionToken");
  const pairIndexRaw = form.get("pairIndex");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (typeof slot !== "string" || !slot.trim()) {
    return NextResponse.json({ error: "Missing slot" }, { status: 400 });
  }
  if (typeof sessionToken !== "string" || !sessionToken.trim()) {
    return NextResponse.json({ error: "Missing sessionToken" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Please upload a JPEG, PNG, or WebP image." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "This image is too large. Please use one under 10MB." },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  const { data: session, error: sessionError } = await service
    .from("anonymous_onboarding_sessions")
    .select("id, expires_at, upload_count")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (sessionError && sessionError.code !== "PGRST116") {
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json(
      { error: "Onboarding session not found or expired" },
      { status: 404 }
    );
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Onboarding session expired" }, { status: 410 });
  }
  if (session.upload_count >= MAX_UPLOADS_PER_SESSION) {
    return NextResponse.json(
      { error: "You've uploaded the maximum number of photos for now." },
      { status: 429 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadImageToCloudinary(
      buffer,
      `zuri-user-uploads/${sessionToken}`
    );

    const pairIndex =
      typeof pairIndexRaw === "string" && pairIndexRaw.trim()
        ? Number(pairIndexRaw)
        : undefined;

    const { error: insertError } = await service
      .from("onboarding_uploaded_images")
      .insert({
        anonymous_session_token: sessionToken,
        slot_type: slot,
        cloudinary_public_id: result.publicId,
        cloudinary_url: result.url,
        width: result.width,
        height: result.height,
        pair_index: Number.isFinite(pairIndex) ? pairIndex : null,
      });

    if (insertError) {
      console.error("[upload-image] insert failed:", insertError);
      return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
    }

    await service
      .from("anonymous_onboarding_sessions")
      .update({ upload_count: session.upload_count + 1 })
      .eq("session_token", sessionToken);

    return NextResponse.json({
      success: true,
      publicId: result.publicId,
      url: result.url,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error("[upload-image] Cloudinary upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again or skip for now." },
      { status: 500 }
    );
  }
}
