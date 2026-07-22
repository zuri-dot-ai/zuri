import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import {
  generateStoragePath,
  validateUploadedFile,
} from "@/lib/security/file-validation";
import { createClient } from "@/lib/supabase/server";

const LOGOS_BUCKET = "logos";
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(req: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();
  const rateLimit = await checkRateLimit(supabase, user.id, "api:general");
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "File is too large. Please use an image under 2MB." },
      { status: 413 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json(
      { error: "Logo must be smaller than 2MB." },
      { status: 413 }
    );
  }

  const validation = await validateUploadedFile(file);
  if (!validation.valid || !validation.sanitizedName) {
    return NextResponse.json(
      { error: validation.error ?? "Invalid file" },
      { status: 400 }
    );
  }

  try {
    const storagePath = generateStoragePath(
      user.id,
      "logo",
      validation.sanitizedName
    );
    const buffer = Buffer.from(await file.arrayBuffer());
    const service = createServiceClient();

    const { error: uploadErr } = await service.storage
      .from(LOGOS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: pub } = service.storage
      .from(LOGOS_BUCKET)
      .getPublicUrl(storagePath);

    return NextResponse.json({ success: true, logoUrl: pub.publicUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
