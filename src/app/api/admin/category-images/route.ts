import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { validateUploadedFile } from "@/lib/security/file-validation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildCategoryImagePath,
  CATEGORY_IMAGES_BUCKET,
  isCategorySlotType,
  isDesignArchetype,
  parseTags,
} from "@/lib/website/category-images";
import type { CategoryImageRow } from "@/types/website";

export const runtime = "nodejs";

async function ensureCategoryImagesBucket(
  service: ReturnType<typeof createServiceClient>
) {
  const { data: buckets, error } = await service.storage.listBuckets();
  if (error) throw new Error(`Could not list storage buckets: ${error.message}`);

  const exists = buckets?.some((b) => b.name === CATEGORY_IMAGES_BUCKET);
  if (exists) return;

  const { error: createError } = await service.storage.createBucket(
    CATEGORY_IMAGES_BUCKET,
    {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    }
  );

  // Race: another request may have created it
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`Could not create ${CATEGORY_IMAGES_BUCKET} bucket: ${createError.message}`);
  }
}

function readImageDimensions(
  buffer: Buffer,
  mime: string
): { width: number | null; height: number | null } {
  try {
    if (mime === "image/png" && buffer.length >= 24) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      };
    }

    if (mime === "image/jpeg") {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          return {
            height: buffer.readUInt16BE(offset + 5),
            width: buffer.readUInt16BE(offset + 7),
          };
        }
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }

    if (mime === "image/webp" && buffer.length >= 30) {
      // RIFF....WEBPVP8 / VP8L / VP8X
      if (buffer.toString("ascii", 12, 16) === "VP8X") {
        const width =
          1 + buffer[24] + (buffer[25] << 8) + (buffer[26] << 16);
        const height =
          1 + buffer[27] + (buffer[28] << 8) + (buffer[29] << 16);
        return { width, height };
      }
    }
  } catch {
    // fall through
  }
  return { width: null, height: null };
}

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const isAdmin = await requireAdmin(supabase, user.id);
  if (!isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, supabase };
}

/** List recent curated images (optional filters). */
export async function GET(req: Request) {
  const auth = await requireAdminUser();
  if ("error" in auth && auth.error) return auth.error;

  const url = new URL(req.url);
  const archetype = url.searchParams.get("archetype");
  const slotType = url.searchParams.get("slot_type");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 48), 200);

  const service = createServiceClient();
  let query = service
    .from("category_images")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (archetype && isDesignArchetype(archetype)) {
    query = query.eq("archetype", archetype);
  }
  if (slotType && isCategorySlotType(slotType)) {
    query = query.eq("slot_type", slotType);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: `Failed to list images: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ images: (data ?? []) as CategoryImageRow[] });
}

/**
 * Bulk/single upload into category-images bucket + category_images rows.
 * Form fields: archetype, slot_type, tags (optional), files (1..n)
 */
export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if ("error" in auth && auth.error) return auth.error;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data." },
      { status: 400 }
    );
  }

  const archetypeRaw = String(form.get("archetype") ?? "");
  const slotTypeRaw = String(form.get("slot_type") ?? "");
  const tags = parseTags(String(form.get("tags") ?? ""));

  if (!isDesignArchetype(archetypeRaw)) {
    return NextResponse.json(
      { error: "Invalid archetype." },
      { status: 400 }
    );
  }
  if (!isCategorySlotType(slotTypeRaw)) {
    return NextResponse.json(
      { error: "Invalid slot_type." },
      { status: 400 }
    );
  }

  const files = form
    .getAll("files")
    .filter((f): f is File => typeof File !== "undefined" && f instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "No files provided. Use the `files` field (one or more)." },
      { status: 400 }
    );
  }

  if (files.length > 40) {
    return NextResponse.json(
      { error: "Maximum 40 files per batch." },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  try {
    await ensureCategoryImagesBucket(service);
  } catch (err) {
    console.error("[admin/category-images] bucket", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Storage bucket unavailable." },
      { status: 500 }
    );
  }

  const uploaded: CategoryImageRow[] = [];
  const failures: { name: string; error: string }[] = [];

  for (const file of files) {
    const validation = await validateUploadedFile(file);
    if (!validation.valid || !validation.sanitizedName) {
      failures.push({
        name: file.name,
        error: validation.error ?? "Invalid file.",
      });
      continue;
    }

    const storagePath = buildCategoryImagePath(
      archetypeRaw,
      slotTypeRaw,
      validation.sanitizedName
    );

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { width, height } = readImageDimensions(buffer, file.type);

    const { error: uploadError } = await service.storage
      .from(CATEGORY_IMAGES_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: "31536000",
      });

    if (uploadError) {
      failures.push({ name: file.name, error: uploadError.message });
      continue;
    }

    const {
      data: { publicUrl },
    } = service.storage.from(CATEGORY_IMAGES_BUCKET).getPublicUrl(storagePath);

    const { data: row, error: insertError } = await service
      .from("category_images")
      .insert({
        archetype: archetypeRaw,
        slot_type: slotTypeRaw,
        storage_path: storagePath,
        public_url: publicUrl,
        tags: tags.length ? tags : null,
        width,
        height,
      })
      .select("*")
      .single();

    if (insertError || !row) {
      // Roll back orphaned storage object
      await service.storage.from(CATEGORY_IMAGES_BUCKET).remove([storagePath]);
      failures.push({
        name: file.name,
        error: insertError?.message ?? "DB insert failed.",
      });
      continue;
    }

    uploaded.push(row as CategoryImageRow);
  }

  const status =
    uploaded.length === 0 ? 400 : failures.length > 0 ? 207 : 200;

  return NextResponse.json(
    {
      uploaded,
      failures,
      count: uploaded.length,
    },
    { status }
  );
}
