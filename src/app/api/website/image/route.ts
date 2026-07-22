import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { normalizeSlotType } from "@/lib/website/category-images";
import {
  normalizeFilledImages,
  persistRecomposedWebsite,
} from "@/lib/website/recompose-html";
import {
  generateStoragePath,
  MAX_FILE_SIZE_BYTES,
  validateUploadedFile,
} from "@/lib/security/file-validation";
import {
  ensureWebsiteImagesBucket,
  WEBSITE_IMAGES_BUCKET,
} from "@/lib/website/ensure-website-images-bucket";
import {
  isBrokenImageUrl,
  sanitizeLibraryImageUrl,
} from "@/lib/website/image-url";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import { classifySupabaseError } from "@/lib/errors/supabase-errors";
import { generateSupportRef } from "@/lib/errors/support-ref";
import { captureError } from "@/lib/monitoring/sentry";
import type { ActiveTheme, DesignArchetype, ResolvedImage } from "@/types/website";

const MAX_BYTES = MAX_FILE_SIZE_BYTES;

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
      { error: "File is too large. Please use an image under 4MB." },
      { status: 413 }
    );
  }

  const slot = String(form.get("slot") ?? "").trim();
  const action = String(form.get("action") ?? "upload");
  const file = form.get("file");
  const curatedId = String(form.get("curatedId") ?? "").trim();

  if (!slot) {
    return NextResponse.json({ error: "Missing slot" }, { status: 400 });
  }

  try {
    const { data: website } = await supabase
      .from("websites")
      .select(
        "id, template_id, archetype, filled_placeholders, filled_images, active_theme"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (!website?.template_id) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.WEBSITE_NOT_FOUND },
        { status: 404 }
      );
    }

    const placeholders =
      (website.filled_placeholders as Record<string, string>) ?? {};
    const images = normalizeFilledImages(website.filled_images);
    const activeTheme = (website.active_theme as ActiveTheme) ?? "theme-1";
    const archetype = (website.archetype as DesignArchetype) ?? "clean-modern";

    let resolved: ResolvedImage;

    if (action === "curated_pick") {
      if (!curatedId) {
        return NextResponse.json({ error: "Missing curatedId" }, { status: 400 });
      }
      const service = createServiceClient();
      const { data: row } = await service
        .from("category_images")
        .select("public_url, width, height")
        .eq("id", curatedId)
        .maybeSingle();

      if (!row?.public_url) {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
      }

      const safeUrl = sanitizeLibraryImageUrl(
        row.public_url,
        archetype,
        0
      );

      resolved = {
        url: safeUrl,
        source: isBrokenImageUrl(row.public_url) ? "fallback" : "curated",
        width: row.width,
        height: row.height,
      };
    } else {
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
      }

      const validation = await validateUploadedFile(file);
      if (!validation.valid || !validation.sanitizedName) {
        return NextResponse.json(
          { error: validation.error ?? "Invalid file" },
          { status: 400 }
        );
      }

      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "Image must be smaller than 4MB." },
          { status: 413 }
        );
      }

      const storagePath = generateStoragePath(
        user.id,
        `slot-${slot}`,
        validation.sanitizedName
      );
      const buffer = Buffer.from(await file.arrayBuffer());

      const service = createServiceClient();
      const ensure = await ensureWebsiteImagesBucket(service);

      // #region agent log
      const preUploadDebug = {
        sessionId: "21ff00",
        runId: "post-fix",
        hypothesisId: "A",
        location: "api/website/image/route.ts:ensure",
        message: "ensure website-images bucket",
        data: {
          bucket: WEBSITE_IMAGES_BUCKET,
          existed: ensure.existed,
          created: ensure.created,
          bucketIds: ensure.bucketIds,
          ensureError: ensure.error,
        },
        timestamp: Date.now(),
      };
      try {
        await fetch(
          "http://127.0.0.1:7419/ingest/076876bf-f6bf-42a9-9aff-97004d9bbbbe",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "21ff00",
            },
            body: JSON.stringify(preUploadDebug),
          }
        );
      } catch {
        /* ignore */
      }
      // #endregion

      if (ensure.error) {
        return NextResponse.json(
          {
            error: `Storage bucket unavailable: ${ensure.error}`,
            debug: preUploadDebug.data,
          },
          { status: 500 }
        );
      }

      const { error: uploadErr } = await service.storage
        .from(WEBSITE_IMAGES_BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadErr) {
        // #region agent log
        const debugPayload = {
          sessionId: "21ff00",
          runId: "post-fix",
          hypothesisId: "A",
          location: "api/website/image/route.ts:upload",
          message: "upload failed after ensure",
          data: {
            bucket: WEBSITE_IMAGES_BUCKET,
            uploadError: uploadErr.message,
            uploadStatus:
              (uploadErr as { statusCode?: string }).statusCode ?? null,
            storagePath,
            bucketIds: ensure.bucketIds,
            hasWebsiteImagesBucket: ensure.bucketIds.includes(
              WEBSITE_IMAGES_BUCKET
            ),
            created: ensure.created,
          },
          timestamp: Date.now(),
        };
        try {
          await fetch(
            "http://127.0.0.1:7419/ingest/076876bf-f6bf-42a9-9aff-97004d9bbbbe",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Debug-Session-Id": "21ff00",
              },
              body: JSON.stringify(debugPayload),
            }
          );
        } catch {
          /* ignore */
        }
        // #endregion
        return NextResponse.json(
          {
            error: uploadErr.message,
            debug: debugPayload.data,
          },
          { status: 500 }
        );
      }

      const { data: pub } = service.storage
        .from(WEBSITE_IMAGES_BUCKET)
        .getPublicUrl(storagePath);

      resolved = {
        url: pub.publicUrl,
        source: "user-upload",
        width: null,
        height: null,
      };

      await service.from("website_images").insert({
        user_id: user.id,
        storage_path: storagePath,
        public_url: pub.publicUrl,
        slot,
        file_size_bytes: file.size,
      });
    }

    const updatedImages = { ...images, [slot]: resolved };

    const result = await persistRecomposedWebsite(
      supabase,
      website.id,
      user.id,
      {
        templateId: website.template_id,
        filledPlaceholders: placeholders,
        filledImages: updatedImages,
        activeTheme,
        archetype,
      }
    );

    return NextResponse.json({
      success: true,
      slot,
      image: resolved,
      needsReview: result.needsReview,
    });
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, { supportRef: ref, userId: user?.id, route: "/api/website/image" });
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR, support_ref: ref },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const supabase = await createClient();

  try {
    const slot = new URL(req.url).searchParams.get("slot");
    const archetype = new URL(req.url).searchParams.get("archetype");

    let query = supabase.from("category_images").select("*").limit(48);

    if (archetype) query = query.eq("archetype", archetype);
    if (slot) query = query.eq("slot_type", normalizeSlotType(slot));

    const { data, error } = await query;
    if (error) {
      const { status, message } = classifySupabaseError(error);
      return NextResponse.json({ error: message }, { status });
    }

    const images = data ?? [];
    const arch = (archetype as DesignArchetype) || "clean-modern";
    const sanitized = images.map((row, i) => ({
      ...row,
      public_url: sanitizeLibraryImageUrl(row.public_url, arch, i),
    }));

    // #region agent log
    const sampleUrls = images.slice(0, 5).map((row, i) => ({
      id: row.id,
      original_host: (() => {
        try {
          return new URL(String(row.public_url ?? "")).host;
        } catch {
          return "invalid";
        }
      })(),
      sanitized_host: (() => {
        try {
          return new URL(sanitized[i]?.public_url ?? "").host;
        } catch {
          return "invalid";
        }
      })(),
      wasBroken: isBrokenImageUrl(row.public_url),
      slot_type: row.slot_type,
    }));
    try {
      await fetch(
        "http://127.0.0.1:7419/ingest/076876bf-f6bf-42a9-9aff-97004d9bbbbe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "21ff00",
          },
          body: JSON.stringify({
            sessionId: "21ff00",
            runId: "library-fix",
            hypothesisId: "C",
            location: "api/website/image/route.ts:GET",
            message: "library list sanitized",
            data: {
              slot,
              archetype,
              count: sanitized.length,
              sampleUrls,
              brokenCount: sampleUrls.filter((s) => s.wasBroken).length,
            },
            timestamp: Date.now(),
          }),
        }
      );
    } catch {
      /* ignore */
    }
    // #endregion

    return NextResponse.json({
      images: sanitized,
      debug: {
        sampleUrls,
        count: sanitized.length,
        brokenCount: sampleUrls.filter((s) => s.wasBroken).length,
      },
    });
  } catch (err) {
    const ref = generateSupportRef();
    captureError(err, { supportRef: ref, userId: user?.id, route: "/api/website/image" });
    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR, support_ref: ref },
      { status: 500 }
    );
  }
}
