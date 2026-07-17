/**
 * One-shot e2e check for category_images seeding path.
 * Creates bucket if needed, uploads 3 tiny test PNGs, verifies DB rows + public URLs.
 *
 * Usage: npx tsx scripts/seed-category-images-smoke.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const BUCKET = "category-images";

function loadEnv() {
  const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

/** Minimal valid 1×1 PNG */
function tinyPng(r: number, g: number, b: number): Buffer {
  // Prebuilt 1x1 PNGs with different RGB via IHDR+IDAT is complex;
  // use three identical valid PNGs with distinct filenames instead.
  void r;
  void g;
  void b;
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const sb = createClient(url, key);

  // 1) Ensure table exists
  const { error: tableErr } = await sb.from("category_images").select("id").limit(1);
  if (tableErr) {
    console.error("FAIL: category_images table missing or unreachable:", tableErr.message);
    console.error(
      "Apply supabase/migrations/20260716_website_builder_v2_templates.sql and\n" +
        "supabase/migrations/20260716_category_images_storage.sql in the Supabase SQL Editor, then re-run."
    );
    process.exit(1);
  }
  console.log("OK: category_images table reachable");

  // 2) Ensure bucket
  const { data: buckets, error: listErr } = await sb.storage.listBuckets();
  if (listErr) throw listErr;
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error: createErr } = await sb.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    if (createErr && !/already exists/i.test(createErr.message)) {
      throw createErr;
    }
    console.log("OK: created bucket", BUCKET);
  } else {
    console.log("OK: bucket exists", BUCKET);
  }

  const archetype = "warm-sensory";
  const slotType = "hero";
  const tags = ["smoke-test", "warm", "food"];
  const uploaded: { id: string; path: string; publicUrl: string }[] = [];

  for (let i = 0; i < 3; i++) {
    const filename = `${randomUUID()}.png`;
    const storagePath = `${archetype}/${slotType}/${filename}`;
    const body = tinyPng(200 + i * 20, 100, 50);

    const { error: upErr } = await sb.storage.from(BUCKET).upload(storagePath, body, {
      contentType: "image/png",
      upsert: false,
      cacheControl: "31536000",
    });
    if (upErr) throw new Error(`upload ${i}: ${upErr.message}`);

    const {
      data: { publicUrl },
    } = sb.storage.from(BUCKET).getPublicUrl(storagePath);

    const { data: row, error: insErr } = await sb
      .from("category_images")
      .insert({
        archetype,
        slot_type: slotType,
        storage_path: storagePath,
        public_url: publicUrl,
        tags,
        width: 1,
        height: 1,
      })
      .select("id, storage_path, public_url")
      .single();

    if (insErr || !row) {
      await sb.storage.from(BUCKET).remove([storagePath]);
      throw new Error(`insert ${i}: ${insErr?.message ?? "no row"}`);
    }

    // Fetch public URL to confirm accessibility
    const head = await fetch(publicUrl, { method: "GET" });
    if (!head.ok) {
      throw new Error(`public URL not reachable (${head.status}): ${publicUrl}`);
    }

    uploaded.push({ id: row.id, path: row.storage_path, publicUrl: row.public_url });
    console.log(`OK: uploaded [${i + 1}/3]`, storagePath);
  }

  const outDir = join(process.cwd(), "tmp");
  if (!existsSync(outDir)) mkdirSync(outDir);
  writeFileSync(
    join(outDir, "category-images-smoke.json"),
    JSON.stringify({ uploaded, at: new Date().toISOString() }, null, 2)
  );

  console.log("\nE2E PASS — 3 test images in warm-sensory/hero");
  console.log(JSON.stringify(uploaded, null, 2));
}

main().catch((err) => {
  console.error("E2E FAIL:", err);
  process.exit(1);
});
