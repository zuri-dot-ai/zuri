#!/usr/bin/env node
/**
 * Upload template HTML to Supabase Storage (website-templates) and upsert
 * rows into the `templates` table from sibling .json metadata files.
 *
 * Excludes: trust-professional/light-modern (broken extraction).
 *
 * Usage: node --env-file=.env.local scripts/upload-templates.mjs
 *    or: set env vars then node scripts/upload-templates.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATES_DIR = path.join(ROOT, "templates");
const BUCKET = "website-templates";
const EXCLUDE = new Set(["trust-professional/light-modern"]);

function loadEnvFile() {
  const candidates = [
    path.join(ROOT, ".env.local"),
    path.join(ROOT, "src", "app", ".env.local"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function listJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...listJsonFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".json")) results.push(full);
  }
  return results;
}

function toDbRow(meta) {
  return {
    id: meta.template_id,
    archetype: meta.archetype,
    mode: meta.mode,
    lean: meta.lean,
    display_name: meta.display_name,
    storage_path: meta.storage_path,
    color_themes: meta.color_themes,
    placeholder_fields: meta.placeholder_fields,
    image_slots: meta.image_slots,
    needs_revision: false,
    revision_note: null,
  };
}

async function ensureBucket(supabase) {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) throw new Error(`listBuckets: ${listErr.message}`);

  const existing = (buckets ?? []).find((b) => b.name === BUCKET);
  if (existing) {
    console.log(`Bucket "${BUCKET}" exists (public=${existing.public})`);
    return;
  }

  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["text/html", "text/html; charset=utf-8", "application/json"],
  });
  if (createErr) throw new Error(`createBucket: ${createErr.message}`);
  console.log(`Created public bucket "${BUCKET}"`);
}

/**
 * Apply templates DDL via Supabase SQL API (pg-meta).
 * Falls back to a clear error if the endpoint isn't available.
 */
async function ensureTemplatesTable(url, serviceKey) {
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: tableErr } = await supabase.from("templates").select("id").limit(1);
  if (!tableErr) {
    console.log("templates table OK");
    return;
  }

  console.log("templates table missing — applying local migration SQL…");
  const migrationPath = path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260716_templates_library.sql"
  );
  const sql = fs.readFileSync(migrationPath, "utf8");

  // Try pg-meta query endpoint used by Supabase tooling
  const endpoints = [
    `${url}/pg/query`,
    `${url.replace(/\/$/, "")}/pg/query`,
  ];

  let applied = false;
  let lastError = tableErr.message;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      const body = await res.text();
      if (res.ok) {
        applied = true;
        console.log(`Applied migration via ${endpoint}`);
        break;
      }
      lastError = `${res.status} ${body.slice(0, 300)}`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  if (!applied) {
    // Optional: DATABASE_URL / SUPABASE_DB_URL via `pg` if installed
    const dbUrl =
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DB_URL ||
      process.env.POSTGRES_URL;
    if (dbUrl) {
      try {
        const pg = await import("pg");
        const client = new pg.default.Client({ connectionString: dbUrl });
        await client.connect();
        await client.query(sql);
        await client.end();
        applied = true;
        console.log("Applied migration via DATABASE_URL");
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  if (!applied) {
    console.error(
      `Could not create templates table.\n` +
        `Last error: ${lastError}\n\n` +
        `Apply supabase/migrations/20260716_templates_library.sql in the Supabase SQL Editor, then re-run this script.`
    );
    process.exit(1);
  }

  // Re-check
  const { error: recheck } = await supabase.from("templates").select("id").limit(1);
  if (recheck) {
    console.error(`templates still unavailable after migration: ${recheck.message}`);
    process.exit(1);
  }
  console.log("templates table OK");
}

async function main() {
  loadEnvFile();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await ensureTemplatesTable(url, key);
  await ensureBucket(supabase);

  const jsonFiles = listJsonFiles(TEMPLATES_DIR).sort();
  const uploaded = [];
  const skipped = [];
  const failed = [];

  for (const jsonPath of jsonFiles) {
    const meta = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const relKey = `${meta.archetype}/${path.basename(meta.storage_path, ".html")}`;

    if (EXCLUDE.has(relKey) || EXCLUDE.has(meta.storage_path.replace(/\.html$/, ""))) {
      skipped.push({ id: meta.template_id, reason: "excluded" });
      continue;
    }

    const htmlPath = path.join(
      TEMPLATES_DIR,
      meta.archetype,
      path.basename(meta.storage_path)
    );
    if (!fs.existsSync(htmlPath)) {
      failed.push({ id: meta.template_id, reason: `missing html: ${htmlPath}` });
      continue;
    }

    const html = fs.readFileSync(htmlPath);
    const storagePath = meta.storage_path.replace(/\\/g, "/");

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, html, {
        contentType: "text/html",
        upsert: true,
        cacheControl: "3600",
      });

    if (upErr) {
      failed.push({ id: meta.template_id, reason: `storage: ${upErr.message}` });
      continue;
    }

    const row = toDbRow(meta);
    const { error: dbErr } = await supabase.from("templates").upsert(row, {
      onConflict: "id",
    });

    if (dbErr) {
      failed.push({ id: meta.template_id, reason: `db: ${dbErr.message}` });
      continue;
    }

    uploaded.push(meta.template_id);
    console.log(`OK  ${meta.template_id}`);
  }

  console.log("\n--- UPLOAD SUMMARY ---");
  console.log(`Uploaded+upserted: ${uploaded.length}`);
  console.log(`Skipped:           ${skipped.length}`);
  for (const s of skipped) console.log(`  skip ${s.id} (${s.reason})`);
  console.log(`Failed:            ${failed.length}`);
  for (const f of failed) console.log(`  FAIL ${f.id}: ${f.reason}`);

  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
