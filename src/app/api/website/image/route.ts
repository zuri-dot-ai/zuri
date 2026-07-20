import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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
import type { ActiveTheme, DesignArchetype, ResolvedImage } from "@/types/website";

const MAX_BYTES = MAX_FILE_SIZE_BYTES;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const { data: website } = await supabase
    .from("websites")
    .select(
      "id, template_id, archetype, filled_placeholders, filled_images, active_theme"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!website?.template_id) {
    return NextResponse.json({ error: "No website found" }, { status: 404 });
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

    resolved = {
      url: row.public_url,
      source: "curated",
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
    const { error: uploadErr } = await service.storage
      .from("website-images")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: pub } = service.storage
      .from("website-images")
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

  try {
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
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slot = new URL(req.url).searchParams.get("slot");
  const archetype = new URL(req.url).searchParams.get("archetype");

  let query = supabase.from("category_images").select("*").limit(48);

  if (archetype) query = query.eq("archetype", archetype);
  if (slot) query = query.eq("slot_type", normalizeSlotType(slot));

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ images: data ?? [] });
}
